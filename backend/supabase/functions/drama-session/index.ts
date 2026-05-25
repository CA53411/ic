/**
 * drama-session Edge Function — Drama session management
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  return null;
}

async function authenticate(req: Request, supabase: any): Promise<{ user: any }> {
  // Try service_role_key first (for internal/pg_cron calls)
  const srKey = req.headers.get('x-service-role-key');
  if (srKey) {
    const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (srKey === expected) {
      // For service role, we need a user_id in the body
      // This is a special case for testing/internal use
      throw new Error('Service role not supported for user actions');
    }
    throw new Error('Unauthorized: invalid service key');
  }

  // Normal JWT auth
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) throw new Error('Unauthorized: no token');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (!user) throw new Error('Unauthorized: ' + (error?.message || 'invalid token'));
  return { user };
}

// ── Get drama list ──
async function getDramaList(supabase: any, userId: string) {
  console.log(`[DS] getDramaList for ${userId.substring(0,8)}`);
  const { data: dramas, error: dErr } = await supabase
    .from('drama_definitions')
    .select('id, name, description, scene_setting, cover_image_path, unlock_condition, is_active, sort_order, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (dErr) throw new Error('drama_definitions: ' + dErr.message);
  console.log(`[DS] Found ${dramas?.length || 0} dramas`);

  const { data: progress } = await supabase.from('drama_progress').select('*').eq('user_id', userId);
  const { data: sessions } = await supabase.from('drama_sessions').select('id, drama_id, status, started_at').eq('user_id', userId).in('status', ['active', 'paused']);

  return (dramas || []).map((d: any) => {
    const p = (progress || []).find((pr: any) => pr.drama_id === d.id);
    const s = (sessions || []).find((se: any) => se.drama_id === d.id);
    return { ...d, is_unlocked: !!p?.is_unlocked, unlocked_at: p?.unlocked_at, completed_at: p?.completed_at, active_session: s || null };
  });
}

// ── Create or get session ──
async function createOrGetSession(supabase: any, userId: string, dramaId: string) {
  console.log(`[DS] createOrGetSession user=${userId.substring(0,8)} drama=${dramaId.substring(0,8)}`);

  // Check for active session
  const { data: existing } = await supabase
    .from('drama_sessions')
    .select('id, status, context_memory, started_at')
    .eq('user_id', userId)
    .eq('drama_id', dramaId)
    .in('status', ['active', 'paused'])
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log(`[DS] Found existing session ${existing[0].id.substring(0,8)}`);
    return { session: existing[0], is_new: false };
  }

  // Get companion
  console.log(`[DS] Finding companion for ${userId.substring(0,8)}`);
  const { data: companions } = await supabase
    .from('companions')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  
  if (!companions || companions.length === 0) throw new Error('No companion found');
  const companionId = companions[0].id;
  console.log(`[DS] Companion=${companionId.substring(0,8)}`);

  // Create session
  console.log(`[DS] Creating session`);
  const { data: inserted, error: insErr } = await supabase
    .from('drama_sessions')
    .insert({ user_id: userId, companion_id: companionId, drama_id: dramaId, status: 'active', context_memory: {} })
    .select('id, status, context_memory, started_at');
  
  if (insErr) throw new Error('Insert session: ' + insErr.message);
  if (!inserted || inserted.length === 0) throw new Error('Insert session returned no rows');
  const session = inserted[0];
  console.log(`[DS] Session created ${session.id.substring(0,8)}`);

  // Get drama for intro
  const { data: dramas } = await supabase.from('drama_definitions').select('name, description, scene_setting, drama_prompt').eq('id', dramaId).limit(1);
  const drama = dramas?.[0];

  if (drama) {
    const intro = `**${drama.name}**\n\n${drama.scene_setting || ''}\n\n${drama.description || ''}\n\n*你深吸一口气，踏入了这个全新的世界...*`;
    await supabase.from('drama_messages').insert({ session_id: session.id, user_id: userId, speaker: 'narrator', content: intro });
    console.log(`[DS] Narrator intro inserted`);
  }

  // Track progress
  await supabase.from('drama_progress').upsert(
    { user_id: userId, drama_id: dramaId, is_unlocked: true, unlocked_at: new Date().toISOString() },
    { onConflict: 'user_id,drama_id' }
  );

  return { session, is_new: true };
}

// ── Get session with messages ──
async function getSessionMessages(supabase: any, sessionId: string, userId: string) {
  console.log(`[DS] getSessionMessages session=${sessionId.substring(0,8)} user=${userId.substring(0,8)}`);

  const { data: sessRows } = await supabase
    .from('drama_sessions')
    .select('id, user_id, drama_id, status, context_memory, started_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .limit(1);
  
  if (!sessRows || sessRows.length === 0) throw new Error('Session not found');
  const sess = sessRows[0];

  const { data: dramas } = await supabase.from('drama_definitions').select('id, name, description, scene_setting, cover_image_path, drama_prompt').eq('id', sess.drama_id).limit(1);
  const drama = dramas?.[0] || null;

  const { data: compRows } = await supabase.from('companions').select('id, nickname, avatar_url, gender').eq('user_id', userId).limit(1);
  const companion = compRows?.[0] || null;

  const { data: messages, error: mErr } = await supabase.from('drama_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  if (mErr) throw new Error('drama_messages: ' + mErr.message);

  return { session: sess, drama, companion, messages: messages || [] };
}

// ── Complete session ──
async function completeSession(supabase: any, sessionId: string, userId: string) {
  const { data: rows } = await supabase.from('drama_sessions').select('id, drama_id').eq('id', sessionId).eq('user_id', userId).limit(1);
  if (!rows || rows.length === 0) throw new Error('Session not found');
  
  await supabase.from('drama_sessions').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', sessionId);
  await supabase.from('drama_progress').upsert(
    { user_id: userId, drama_id: rows[0].drama_id, completed_at: new Date().toISOString() },
    { onConflict: 'user_id,drama_id' }
  );
  return { success: true };
}

// ── Main ──
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    }

    const supabase = getSupabase();
    const { user } = await authenticate(req, supabase);
    const action = body.action || '';

    console.log(`[DS] action=${action} user=${user.id.substring(0,8)}`);

    switch (action) {
      case 'list': {
        const dramas = await getDramaList(supabase, user.id);
        return jsonResponse({ dramas });
      }
      case 'start': {
        const dramaId = body.drama_id;
        if (!dramaId) throw new Error('Missing drama_id');
        const result = await createOrGetSession(supabase, user.id, dramaId);
        return jsonResponse(result);
      }
      case 'get': {
        const sessionId = body.session_id;
        if (!sessionId) throw new Error('Missing session_id');
        const result = await getSessionMessages(supabase, sessionId, user.id);
        return jsonResponse(result);
      }
      case 'complete': {
        const sessionId = body.session_id;
        if (!sessionId) throw new Error('Missing session_id');
        const result = await completeSession(supabase, sessionId, user.id);
        return jsonResponse(result);
      }
      case 'restart': {
        const dramaId = body.drama_id;
        if (!dramaId) throw new Error('Missing drama_id');

        // 1. Find all sessions for this user+drama
        const { data: oldSessions } = await supabase
          .from('drama_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('drama_id', dramaId);

        // 2. Delete all messages for those sessions
        for (const s of (oldSessions || [])) {
          await supabase.from('drama_messages').delete().eq('session_id', s.id);
        }

        // 3. Delete old sessions
        await supabase.from('drama_sessions').delete().eq('user_id', user.id).eq('drama_id', dramaId);

        // 4. Create new session (reuse createOrGetSession logic)
        const result = await createOrGetSession(supabase, user.id, dramaId);
        return jsonResponse(result);
      }
      default: {
        const dramas = await getDramaList(supabase, user.id);
        return jsonResponse({ dramas });
      }
    }
  } catch (e: any) {
    console.error(`[DS] ERROR: ${e.message}`);
    return jsonResponse({ error: e.message, detail: e.stack?.split('\n')[0] || '' }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
