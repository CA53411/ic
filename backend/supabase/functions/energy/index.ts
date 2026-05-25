/**
 * energy Edge Function — Query/consume energy balance
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized');

    if (req.method === 'GET') {
      const { data: acct } = await supabase.from('energy_accounts').select('*').eq('user_id', user.id).maybeSingle();
      return new Response(JSON.stringify({
        balance: acct?.balance || 0,
        total_recharged: acct?.total_recharged || 0,
        total_consumed: acct?.total_consumed || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const cost = body.amount || 0;
      if (cost <= 0) throw new Error('Invalid amount');

      // Optimistic locking: read balance + version
      const { data: acct } = await supabase.from('energy_accounts').select('id, balance, version').eq('user_id', user.id).maybeSingle();
      if (!acct || acct.balance < cost) {
        return new Response(JSON.stringify({ success: false, reason: 'insufficient', balance: acct?.balance || 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const newBalance = acct.balance - cost;
      const { count } = await supabase
        .from('energy_accounts')
        .update({ balance: newBalance, version: (acct.version || 0) + 1 })
        .eq('id', acct.id)
        .eq('version', acct.version)
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        return new Response(JSON.stringify({ success: false, reason: 'concurrent_conflict', message: 'Retry needed due to concurrent update' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await supabase.from('energy_transactions').insert({ account_id: acct.id, user_id: user.id, txn_type: 'consume', amount: -cost, balance_after: newBalance, description: body.description || 'consume' });

      return new Response(JSON.stringify({ success: true, remaining_balance: newBalance }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
