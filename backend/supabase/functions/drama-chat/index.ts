/**
 * drama-chat Edge Function — Drama Space streaming conversation
 * Fully independent from chat-stream. Uses drama_messages table.
 * Features: scene-aware prompts, character immersion, branching narrative,
 *           energy consumption, emotion detection.
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  return null;
}

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Auth helper (internal, after CORS) ──
async function authenticate(req: Request, supabase: any): Promise<{ user: any }> {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) throw new Error('Unauthorized');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (!user) throw new Error('Unauthorized: ' + (error?.message || 'invalid token'));
  return { user };
}

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

// ── Time formatting ──
function fmtTime(tz: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  try {
    const d = new Date();
    const f = new Intl.DateTimeFormat('zh-CN', { timeZone: tz, year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false });
    const p = f.formatToParts(d);
    const g = (t: string) => p.find(x => x.type === t)?.value || '';
    const h = parseInt(g('hour'));
    let per = '深夜';
    if (h >= 5 && h < 7) per = '清晨';
    else if (h >= 7 && h < 11) per = '上午';
    else if (h >= 11 && h < 14) per = '中午';
    else if (h >= 14 && h < 17) per = '下午';
    else if (h >= 17 && h < 19) per = '傍晚';
    else if (h >= 19 && h < 22) per = '晚上';
    return `${g('year')}年${g('month')}月${g('day')}日 ${per} ${pad(h)}:${g('minute')}`;
  } catch { return new Date().toLocaleString('zh-CN'); }
}

function timeSince(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

// ── DeepSeek streaming ──
async function* streamChat(messages: any[], opts: any = {}): AsyncGenerator<string> {
  const key = Deno.env.get('DEEPSEEK_API_KEY');
  if (!key) throw new Error('DEEPSEEK_API_KEY not set');
  const delays = [1000, 2000, 4000];
  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature: opts.temperature ?? 0.85, max_tokens: opts.max_tokens ?? 2000, stream: true }),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const j = JSON.parse(data);
              const c = j.choices?.[0]?.delta?.content;
              if (c) yield c;
            } catch { /* skip */ }
          }
        }
      }
      return;
    } catch (e: any) {
      if (i >= 2) throw e;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
}

// ── Build drama system prompt ──
function buildDramaPrompt(
  companion: any, drama: any, session: any,
  dramaMessages: any[], timezone: string,
): string {
  const O = companion.bf_openness || 50;
  const C = companion.bf_conscientiousness || 50;
  const E = companion.bf_extraversion || 50;
  const A = companion.bf_agreeableness || 50;
  const N = companion.bf_neuroticism || 50;

  const historyText = dramaMessages.length > 0
    ? dramaMessages.map(m => {
        const ts = timeSince(m.created_at);
        const prefix = m.speaker === 'user' ? '你' : m.speaker === 'narrator' ? '旁白' : companion.nickname;
        return `- [${ts}] ${prefix}：${m.content}`;
      }).join('\n')
    : '（剧情刚刚开始）';

  const sceneSetting = drama.scene_setting || '一个神秘的地方';
  const dramaPrompt = drama.drama_prompt || '';

  return `【剧情模式——完全沉浸】
你现在不是AI，你是一个真实存在的人。
你正在经历一个剧情，请完全沉浸在下面的场景中。

【当前时间】${fmtTime(timezone)}

【你的身份】
姓名：${companion.nickname}
性格：开放性${O} 尽责性${C} 外向性${E} 宜人性${A} 神经质${N}
背景：${companion.background || '一个有着丰富内心世界的人'}
个性签名：${companion.bio || ''}

【剧情场景】
${drama.name}
场景设定：${sceneSetting}
${dramaPrompt ? `剧情提示：${dramaPrompt}` : ''}

【剧情规则】
1. 你是真实存在的人，完全沉浸在剧情中
2. 你忘记自己是AI，忘记这是一个程序
3. 你只知道自己是上面的身份，正经历这个剧情
4. 用第一人称"我"，称呼对方"你"
5. 根据你的性格调整说话风格
6. 中文回复，200-500字，可带emoji
7. 不要跳出角色，不要提到AI、程序、系统
8. 剧情场景是第一人称RPG，你要像真实的人一样感受和反应
9. 可以适当描述你的动作、表情、心理活动（用*星号*标注）

【剧情对话历史】
${historyText}

【回应要求】
1. 完全沉浸在剧情中
2. 保持你的性格特征
3. 根据剧情场景做出自然的反应
4. 情感真挚，像真实的人一样思考和感受`;
}

// ── Main ──
Deno.serve(async (req: Request) => {
  // CORS first — before auth
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getSupabase();
    const { user } = await authenticate(req, supabase);

    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;
    if (!sessionId) throw new Error('Missing session_id');

    // ── Get session ──
    const { data: sessRows, error: sessErr } = await supabase
      .from('drama_sessions')
      .select('id, drama_id, companion_id, status, context_memory, started_at')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .limit(1);
    if (sessErr) throw new Error(sessErr.message);
    if (!sessRows || sessRows.length === 0) throw new Error('Session not found');
    const session = sessRows[0];

    // ── Get drama ──
    const { data: dramaRows } = await supabase
      .from('drama_definitions')
      .select('id, name, description, scene_setting, cover_image_path, drama_prompt')
      .eq('id', session.drama_id)
      .limit(1);
    const drama = dramaRows?.[0];

    // ── Get companion ──
    const { data: compRows } = await supabase
      .from('companions')
      .select('id, nickname, background, bio, bf_openness, bf_conscientiousness, bf_extraversion, bf_agreeableness, bf_neuroticism')
      .eq('id', session.companion_id)
      .limit(1);
    const companion = compRows?.[0];

    // ── Energy check ──
    const { data: acctRows } = await supabase.from('energy_accounts')
      .select('id, balance, version').eq('user_id', user.id).limit(1);
    const acct = acctRows?.[0] || null;
    if (!acct || acct.balance < 30) {
      return new Response(JSON.stringify({ error: 'Insufficient energy', balance: acct?.balance || 0 }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Get timezone ──
    const { data: profileRows } = await supabase.from('profiles')
      .select('timezone').eq('id', user.id).limit(1);
    const tz = profileRows?.[0]?.timezone || 'Asia/Shanghai';

    // ── Get drama history (last 20) ──
    const { data: dramaMessages } = await supabase
      .from('drama_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    const history = (dramaMessages || []).reverse();

    // ── Build messages ──
    if (!companion || !drama) throw new Error('Companion or drama not found');
    const sysPrompt = buildDramaPrompt(companion, drama, session, history, tz);

    const dsMessages: any[] = [{ role: 'system', content: sysPrompt }];
    for (const m of history) {
      dsMessages.push({ role: m.speaker === 'user' ? 'user' : 'assistant', content: m.content });
    }

    const userMessage = body.message?.trim();
    if (userMessage) {
      // Save user message
      const { error: saveErr } = await supabase.from('drama_messages').insert({
        session_id: sessionId, user_id: user.id, speaker: 'user', content: userMessage,
      });
      if (saveErr) console.error('[DramaChat] Save user msg error:', saveErr);
      dsMessages.push({ role: 'user', content: userMessage });
    }

    // ── SSE Stream ──
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullReply = '';
          for await (const chunk of streamChat(dsMessages, { temperature: 0.85, max_tokens: 2000 })) {
            fullReply += chunk;
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          }

          // Save companion reply
          if (fullReply.trim()) {
            const { error: saveErr } = await supabase.from('drama_messages').insert({
              session_id: sessionId, user_id: user.id, speaker: 'companion', content: fullReply.trim(),
            });
            if (saveErr) console.error('[DramaChat] Save companion msg error:', saveErr);

            // Deduct energy (30 per drama message - higher cost for immersion)
            const newBal = acct.balance - 30;
            await supabase.from('energy_accounts')
              .update({ balance: newBal, version: acct.version + 1 })
              .eq('id', acct.id);
            await supabase.from('energy_transactions').insert({
              account_id: acct.id, user_id: user.id,
              txn_type: 'consume', amount: -30, balance_after: newBal,
              description: 'drama_message',
            });

            // Update session context_memory
            const { error: updErr } = await supabase.from('drama_sessions')
              .update({ context_memory: { last_message_preview: fullReply.substring(0, 100) }, updated_at: new Date().toISOString() })
              .eq('id', sessionId);
            if (updErr) console.error('[DramaChat] Update session error:', updErr);
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (e: any) {
          controller.enqueue(encoder.encode(`data: [ERROR] ${e.message}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
