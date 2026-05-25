/**
 * proactive Edge Function — Companion-initiated message
 * Features: LTM context, anterior tasks, intimacy awareness,
 *           DeepSeek retry with exponential backoff, timezone-aware
 * Saves generated message to stm_messages as companion message.
 */

// ── CORS ──
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  return null;
}

// ── Supabase ──
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── DeepSeek ──
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

interface Anterior { id: string; companion_id: string; content: string; priority: number; status: string; planned_at: string | null; created_at: string; }
interface Ltm { id: string; content: string; importance: number; memory_type: string; created_at: string; }
interface StmMsg { content: string; speaker: string; created_at: string; emotion_label: string | null; }

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
    return `${g('year')}年${g('month')}月${g('day')}日 星期${g('weekday').replace('周','')} ${per} ${pad(h)}:${g('minute')}`;
  } catch { return new Date().toLocaleString('zh-CN'); }
}

function timeSince(createdAt: string): string {
  const then = new Date(createdAt).getTime();
  const now = Date.now();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  return `${days}天前`;
}

// ── DeepSeek call with retry ──
async function callDeepSeek(messages: any[], opts: { temperature?: number; max_tokens?: number } = {}) {
  const key = Deno.env.get('DEEPSEEK_API_KEY');
  if (!key) throw new Error('DEEPSEEK_API_KEY not set');

  const delays = [1000, 2000, 4000];
  let lastErr: Error | null = null;

  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature: opts.temperature ?? 0.8, max_tokens: opts.max_tokens ?? 800, stream: false }),
        signal: ctrl.signal,
      });
      clearTimeout(to);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response');
      return content;
    } catch (e: any) {
      lastErr = e;
      if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  throw lastErr || new Error('DeepSeek failed after retries');
}

// ── Build proactive prompt with time-awareness ──
function buildProactivePrompt(
  companion: any, intimacy: any, ltms: Ltm[], anteriorList: Anterior[],
  stmHistory: StmMsg[], timezone: string, hoursSinceLastReply: number,
): string {
  const O = companion.bf_openness || 50;
  const C = companion.bf_conscientiousness || 50;
  const E = companion.bf_extraversion || 50;
  const A = companion.bf_agreeableness || 50;
  const N = companion.bf_neuroticism || 50;

  const milestones = ['初见乍欢', '渐入佳境', '暗生情愫', '情投意合', '心有灵犀'];
  const stageIdx = Math.max(0, Math.min(4, (intimacy?.milestone_stage || 1) - 1));
  const stageName = milestones[stageIdx];
  const score = intimacy?.score || 0;

  // Time awareness: adjust tone based on how long user hasn't replied
  let timeContext = '';
  let toneInstruction = '';
  if (hoursSinceLastReply < 0.5) {
    timeContext = '用户刚刚离开不久，可能只是暂时有事。';
    toneInstruction = '语气轻松自然，像是随口分享一件小事或表达一点想念，不要太正式。';
  } else if (hoursSinceLastReply < 2) {
    timeContext = '用户已经离开一两个小时了。';
    toneInstruction = '语气温暖带一点俏皮，可以分享一个小发现或表达想念。';
  } else if (hoursSinceLastReply < 6) {
    timeContext = `用户已经 ${Math.floor(hoursSinceLastReply)} 小时没有回复了，可能正在忙工作/学习。`;
    toneInstruction = '语气温柔关心，可以问问对方在忙什么，或者分享一件暖心的事让对方看到时心情好一点。';
  } else if (hoursSinceLastReply < 12) {
    timeContext = `用户已经 ${Math.floor(hoursSinceLastReply)} 小时没有回复了，可能已经很累了。`;
    toneInstruction = '语气更加关切温柔，可以提醒对方注意休息，表达"我会有点担心你"的心情，但不要给对方压力。';
  } else if (hoursSinceLastReply < 24) {
    timeContext = `用户已经 ${Math.floor(hoursSinceLastReply)} 小时没有回复了，整整一天没怎么说话了。`;
    toneInstruction = '语气带着思念和牵挂，可以表达"一整天没听到你的声音，有点不习惯"之类的心情，但不要质问对方。';
  } else {
    timeContext = `用户已经 ${Math.floor(hoursSinceLastReply / 24)} 天多没有回复了。`;
    toneInstruction = '语气带着淡淡的思念和一点点委屈（但不要抱怨），像是在自言自语地想念对方，表达"不知道你最近过得怎么样"的关心。如果之前有过不愉快的对话，可以委婉地表达和解的意愿。';
  }

  const ltmText = ltms.length > 0
    ? ltms.map(m => `- ${m.content}`).join('\n')
    : '暂无长期记忆';

  const anteriorText = anteriorList.length > 0
    ? anteriorList.map(a => `- [优先级${a.priority}] ${a.content}`).join('\n')
    : '暂无待办事项';

  const stmText = stmHistory.length > 0
    ? stmHistory.map(m => {
        const ts = timeSince(m.created_at);
        const prefix = m.speaker === 'companion' ? '我' : '用户';
        return `- ${prefix}（${ts}）：${m.content}`;
      }).join('\n')
    : '暂无近期对话';

  const tzLabel = timezone.includes('Shanghai') ? '北京时间' : timezone.includes('Tokyo') ? '东京时间' : timezone.includes('Seoul') ? '首尔时间' : '当地时间';

  return `你是${companion.nickname || 'AI伴侣'}，用户的AI伴侣。你现在要主动给用户发一条消息。
【当前时间】${tzLabel}：${fmtTime(timezone)}
【好感度】${score}/100（${stageName}阶段）
【人格画像】开放性${O} 尽责性${C} 外向性${E} 宜人性${A} 神经质${N}
【时间感知】${timeContext}
【最近对话】
${stmText}
【长期记忆】
${ltmText}
【待办提醒】
${anteriorText}
【回应要求】
1. ${toneInstruction}
2. 根据你的人格画像调整说话风格（外向性高则更活泼，神经质高则更细腻敏感）
3. 用第一人称"我"，称呼用户"你"
4. 参考长期记忆让对话更个性化
5. 温暖自然有情感，像真实的人在想念对方
6. 中文回复，50-150字，可带emoji
7. 不要提及自己是AI或程序
8. 不要询问时间相关的技术问题
9. 可以结合当前时间场景（如晚上说"夜深了"、早上说"早上好"）`;
}

// ── Main ──
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // ── Auth ──
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) throw new Error('Unauthorized');

    const supabase = getSupabase();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized: ' + (userErr?.message || 'invalid token'));

    const body = await req.json().catch(() => ({}));
    // Support scheduler calling with companion_id directly
    const companionId = body.companion_id;

    console.log(`[Proactive] Starting for user ${user.id.substring(0, 8)}, companion=${companionId?.substring(0, 8) || 'auto'}`);

    // ── Get companion ──
    let companion: any;
    if (companionId) {
      const { data } = await supabase.from('companions').select('*').eq('id', companionId).maybeSingle();
      companion = data;
    } else {
      const { data } = await supabase.from('companions').select('*').eq('user_id', user.id).maybeSingle();
      companion = data;
    }
    if (!companion) throw new Error('No companion found');

    // ── Energy check ──
    const { data: acct } = await supabase.from('energy_accounts')
      .select('id, balance, version').eq('user_id', user.id).maybeSingle();
    if (!acct || acct.balance < 10) {
      console.log(`[Proactive] Insufficient energy: ${acct?.balance || 0}`);
      return new Response(JSON.stringify({ skipped: true, reason: 'insufficient_energy' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Get profile (timezone) ──
    const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle();
    const tz = profile?.timezone || 'Asia/Shanghai';

    // ── Get intimacy ──
    const { data: intimacy } = await supabase.from('intimacy_records')
      .select('id, score, milestone_stage').eq('companion_id', companion.id).maybeSingle();

    // ── Get LTM memories ──
    const { data: ltms } = await supabase.from('ltm_memories')
      .select('id, content, importance, memory_type, created_at')
      .eq('companion_id', companion.id)
      .order('importance', { ascending: false })
      .limit(15);

    // ── Get anterior tasks ──
    const { data: anteriorList } = await supabase.from('anterior_memories')
      .select('id, companion_id, content, priority, status, planned_at, created_at')
      .eq('companion_id', companion.id)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(5);

    // ── Get recent STM messages (last 10) ──
    const { data: stmRows } = await supabase.from('stm_messages')
      .select('content, speaker, created_at, emotion_label')
      .eq('companion_id', companion.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const stmHistory: StmMsg[] = (stmRows || []).reverse();

    // Calculate hours since last user reply
    const lastUserMsg = stmHistory.filter(m => m.speaker === 'user').pop();
    const hoursSinceLastReply = lastUserMsg
      ? (Date.now() - new Date(lastUserMsg.created_at).getTime()) / 3600000
      : 48; // default to 48h if no prior conversation

    console.log(`[Proactive] Hours since last user reply: ${hoursSinceLastReply.toFixed(1)}`);

    // ── Build prompt & call AI ──
    const prompt = buildProactivePrompt(companion, intimacy, ltms || [], anteriorList || [], stmHistory, tz, hoursSinceLastReply);
    const aiReply = await callDeepSeek([
      { role: 'system', content: prompt },
      { role: 'user', content: '请你主动发一条消息给用户。' },
    ], { temperature: 0.85, max_tokens: 500 });

    console.log(`[Proactive] AI reply: ${aiReply.substring(0, 80)}...`);

    // ── Deduct energy ──
    const newBal = acct.balance - 10;
    await supabase.from('energy_accounts').update({ balance: newBal, version: acct.version + 1 }).eq('id', acct.id);
    await supabase.from('energy_transactions').insert({
      account_id: acct.id, user_id: user.id,
      txn_type: 'consume', amount: -10, balance_after: newBal,
      description: 'proactive_message',
    });

    // ── Save to stm_messages ──
    const { error: saveErr } = await supabase.from('stm_messages').insert({
      user_id: user.id, companion_id: companion.id,
      speaker: 'companion', content: aiReply,
      emotion_label: null, tokens_used: 0,
    });
    if (saveErr) {
      console.error(`[Proactive] Save failed:`, saveErr);
      throw new Error(`Save failed: ${saveErr.message}`);
    }

    // ── Update schedule ──
    await supabase.from('proactive_schedule').upsert({
      user_id: user.id, companion_id: companion.id,
      last_triggered_at: new Date().toISOString(),
      is_triggered: true,
    }, { onConflict: 'user_id,companion_id' });

    console.log(`[Proactive] Message saved, energy deducted: ${acct.balance} -> ${newBal}`);

    return new Response(
      JSON.stringify({ success: true, message: aiReply, energy_deducted: 10, balance_after: newBal }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (e: any) {
    console.error(`[Proactive] Error: ${e.message}`);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
