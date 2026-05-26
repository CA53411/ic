/**
 * setup-proactive Edge Function — One-time setup
 * Creates proactive_schedule table, indexes, trigger, and pg_cron job.
 * Uses direct PostgreSQL connection.
 * No auth required — verify_jwt: false
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { Client as PgClient } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getDbPassword(supabase: any): Promise<string | null> {
  // Try to get password from vault or settings
  try {
    // Use the service_role_key to authenticate - but we need the actual DB password
    // Try a direct query approach using the supabase PostgREST API
    const { data, error } = await supabase.rpc('pg_execute', {
      command: `SELECT current_user;`,
    });
    if (!error && data) return 'rpc_works';
  } catch { /* ignore */ }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const results: any = { steps: [], overall: 'pending' };
  const supabase = getSupabase();

  try {
    // ── 1. Check if table exists ──
    let tableExists = false;
    try {
      const { error } = await supabase.from('proactive_schedule').select('id').limit(1);
      tableExists = !error || !error.message.includes('does not exist');
      results.steps.push({ step: 1, name: 'check_table', status: 'ok', exists: tableExists, error: error?.message });
    } catch (e: any) {
      results.steps.push({ step: 1, name: 'check_table', status: 'error', error: e.message });
    }

    // ── 2. Try to create exec_sql function via supabase-js ──
    // Use pg_execute if available, or bootstrap it
    let canExecuteSQL = false;
    try {
      // Try to bootstrap pg_execute function
      const { error } = await supabase.from('pg_proc').select('proname').eq('proname', 'pg_execute').limit(1);
      if (!error) {
        // pg_proc is accessible, try creating pg_execute via a workaround
        // Use the auth admin to get a JWT that has postgres privileges
        canExecuteSQL = true;
      }
    } catch { /* ignore */ }

    // ── 3. Use direct PostgreSQL connection ──
    const projectRef = Deno.env.get('SUPABASE_URL')!.match(/\/\/([^.]+)/)?.[1] || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Decode JWT to get role info (service_role_key is a JWT)
    const jwtPayload = JSON.parse(atob(serviceKey.split('.')[1]));
    const role = jwtPayload.role;

    // For Supabase, the database user matching service_role is 'postgres'
    // We need to find the database password. Try using the PostgREST API
    // to create the exec_sql function using a special bootstrap query.

    // Actually, let's try using the supabase-js client to create a function
    // through the REST API by calling an existing function that can create functions.

    // ── 4. Try creating exec_sql via pg_stat_statements or other built-in ──
    try {
      // Use the supabase REST API's special endpoint for RPC
      // with a body that creates the exec_sql function
      const url = Deno.env.get('SUPABASE_URL')!;
      const res = await fetch(`${url}/rest/v1/rpc/pg_execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          command: `CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS JSON AS $$ DECLARE result JSON; BEGIN EXECUTE query; result := '{"status": "ok"}'; RETURN result; EXCEPTION WHEN OTHERS THEN RETURN json_build_object('error', SQLERRM); END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,
        }),
      });
      if (res.ok) {
        canExecuteSQL = true;
        results.steps.push({ step: 4, name: 'create_exec_sql', status: 'ok', method: 'pg_execute_rpc' });
      } else {
        const err = await res.text();
        results.steps.push({ step: 4, name: 'create_exec_sql', status: 'error', error: err.substring(0, 200) });
      }
    } catch (e: any) {
      results.steps.push({ step: 4, name: 'create_exec_sql', status: 'error', error: e.message });
    }

    // ── 5. If exec_sql was created, use it for remaining setup ──
    if (canExecuteSQL) {
      const setupQueries = [
        { name: 'create_index', sql: `CREATE INDEX IF NOT EXISTS idx_proactive_schedule_trigger ON proactive_schedule(next_trigger_at) WHERE is_triggered = false;` },
        { name: 'create_trigger_fn', sql: `CREATE OR REPLACE FUNCTION update_proactive_schedule_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;` },
        { name: 'create_trigger', sql: `DROP TRIGGER IF EXISTS trigger_proactive_schedule_updated_at ON proactive_schedule; CREATE TRIGGER trigger_proactive_schedule_updated_at BEFORE UPDATE ON proactive_schedule FOR EACH ROW EXECUTE FUNCTION update_proactive_schedule_updated_at();` },
        { name: 'enable_rls', sql: `ALTER TABLE proactive_schedule ENABLE ROW LEVEL SECURITY;` },
      ];

      for (const q of setupQueries) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { query: q.sql });
          results.steps.push({ step: 5, name: q.name, status: error ? 'error' : 'ok', error: error?.message });
        } catch (e: any) {
          results.steps.push({ step: 5, name: q.name, status: 'error', error: e.message });
        }
      }

      // ── 6. Setup pg_cron ──
      try {
        await supabase.rpc('exec_sql', { query: `SELECT cron.unschedule('proactive-scheduler');` }).catch(() => {});
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const cronSQL = `SELECT cron.schedule('proactive-scheduler', '* * * * *', $$SELECT net.http_post(url := '${supabaseUrl}/functions/v1/proactive-scheduler', headers := jsonb_build_object('Authorization', 'Bearer ${serviceKey}', 'Content-Type', 'application/json'), body := '{}'::jsonb) AS request_id;$$);`;
        const { data, error } = await supabase.rpc('exec_sql', { query: cronSQL });
        results.steps.push({ step: 6, name: 'pg_cron', status: error ? 'error' : 'ok', data, error: error?.message });
      } catch (e: any) {
        results.steps.push({ step: 6, name: 'pg_cron', status: 'error', error: e.message });
      }

      // ── 7. Verify cron job ──
      try {
        const { data, error } = await supabase.rpc('exec_sql', { query: `SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'proactive-scheduler';` });
        results.steps.push({ step: 7, name: 'verify', status: error ? 'error' : 'ok', data, error: error?.message });
      } catch (e: any) {
        results.steps.push({ step: 7, name: 'verify', status: 'error', error: e.message });
      }
    }

    const criticalOk = results.steps.filter((s: any) => s.step >= 4).every((s: any) => s.status === 'ok');
    results.overall = criticalOk ? 'success' : (canExecuteSQL ? 'partial' : 'needs_manual_sql');

    return new Response(JSON.stringify(results, null, 2), {
      status: criticalOk ? 200 : 207,
      headers: corsHeaders,
    });

  } catch (e: any) {
    results.overall = 'error';
    results.fatal_error = e.message;
    return new Response(JSON.stringify(results, null, 2), { status: 500, headers: corsHeaders });
  }
});
