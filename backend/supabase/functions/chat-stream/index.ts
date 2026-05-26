/**
 * chat-stream Edge Function — SSE streaming conversation
 * Features: emotion detection, LTM context (20), STM context (15),
 *           DeepSeek retry with exponential backoff, enhanced system prompt
 * Self-contained: no external imports (all utils inlined)
 */

// ── Inlined CORS ──
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

// ── Inlined Supabase client ──
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── DeepSeek Configuration ──
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';

// ── Time helpers ──
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

/**
 * Calculate next proactive trigger time.
 * Random delay between 2min and 24h, avoiding user's 3am-6am sleep window.
 */
function calculateNextTrigger(userTz: string): string {
  const now = Date.now();
  // Random minutes: 2min to 24h (1440min)
  const randomMin = Math.floor(Math.random() * (1440 - 2 + 1)) + 2;
  let next = new Date(now + randomMin * 60000);

  // Check if the proposed time falls in user's 3am-6am
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: userTz, hour: 'numeric', hour12: false })
        .format(next)
    );
    if (hour >= 3 && hour < 6) {
      // Push to 7am in user's timezone
      // Get the date components in user's timezone
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz, year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false,
      }).formatToParts(next);
      const g = (t: string) => parts.find(p => p.type === t)?.value || '0';
      // Reconstruct as 7:00 same day in user's timezone
      const dateStr = `${g('year')}-${g('month')}-${g('day')}T07:00:00`;
      next = new Date(dateStr); // interpreted as local, but close enough
    }
  } catch {
    // fallback: if timezone parsing fails, keep original random time
  }

  return next.toISOString();
}

// ── Emotion Detection ──
interface EmotionResult {
  label: string;
  valence: number;
  arousal: number;
}

/**
 * Detect emotion using DeepSeek (non-streaming, 500ms timeout)
 * Returns null if detection fails or times out
 */
async function detectEmotion(text: string): Promise<EmotionResult | null> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    console.log('[ChatStream] DEEPSEEK_API_KEY not set, skipping emotion detection');
    return null;
  }

  const prompt = `Analyze the emotional state of the following message. Respond ONLY with a JSON object in this exact format (no markdown, no extra text): {"label": "情绪词", "valence": -1.0~1.0, "arousal": 0.0~1.0}

Message: "${text.replace(/"/g, '\\"')}"`;

  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 500);

    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 100,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.log(`[ChatStream] Emotion detection HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Extract JSON from potential markdown
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.label === 'string' && typeof parsed.valence === 'number' && typeof parsed.arousal === 'number') {
      return {
        label: parsed.label,
        valence: Math.max(-1, Math.min(1, parsed.valence)),
        arousal: Math.max(0, Math.min(1, parsed.arousal)),
      };
    }
    return null;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.log('[ChatStream] Emotion detection timed out (500ms)');
    } else {
      console.log(`[ChatStream] Emotion detection error: ${e.message}`);
    }
    return null;
  }
}

function emotionToString(emotion: EmotionResult | null): string {
  if (!emotion) return '';
  return JSON.stringify({ label: emotion.label, valence: emotion.valence, arousal: emotion.arousal });
}

// ── DeepSeek streaming with timeout + exponential backoff retry ──
interface StreamChatOptions {
  temperature?: number;
  max_tokens?: number;
}

async function* streamChat(messages: any[], opts: StreamChatOptions = {}): AsyncGenerator<string> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // exponential backoff: 1s, 2s, 4s
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 30000); // 30s timeout

      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages,
          temperature: opts.temperature ?? 0.8,
          max_tokens: opts.max_tokens ?? 2000,
          stream: true,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`AI service unavailable (${res.status}): ${errText}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let success = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        success = true;
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
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      }

      if (success) return; // Stream completed successfully
    } catch (e: any) {
      lastError = e;
      if (e.name === 'AbortError') {
        console.log(`[ChatStream] DeepSeek call timed out (30s) on attempt ${attempt + 1}`);
      } else {
        console.log(`[ChatStream] DeepSeek call failed (attempt ${attempt + 1}): ${e.message}`);
      }

      if (attempt < maxRetries - 1) {
        const delay = retryDelays[attempt] || 4000;
        console.log(`[ChatStream] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('DeepSeek API failed after all retries');
}

// ── Time & Prompt Formatting ──
function formatNow(timezone: string = 'Asia/Shanghai'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    const y = get('year'), m = get('month'), d = get('day');
    const w = get('weekday').replace('周', '星期');
    const h = parseInt(get('hour')), min = get('minute');
    const padH = pad(h);
    let period = '深夜';
    if (h >= 5 && h < 7) period = '清晨';
    else if (h >= 7 && h < 11) period = '上午';
    else if (h >= 11 && h < 14) period = '中午';
    else if (h >= 14 && h < 17) period = '下午';
    else if (h >= 17 && h < 19) period = '傍晚';
    else if (h >= 19 && h < 22) period = '晚上';
    return `${y}年${m}月${d}日 ${w} ${period} ${padH}:${min}`;
  } catch {
    const y = now.getFullYear(), mo = pad(now.getMonth() + 1), d = pad(now.getDate());
    const h = pad(now.getHours()), min = pad(now.getMinutes());
    const weekdays = ['日','一','二','三','四','五','六'];
    const w = '星期' + weekdays[now.getDay()];
    return `${y}年${mo}月${d}日 ${w} ${h}:${min}`;
  }
}

/**
 * Build enhanced system prompt with emotional context and pending reminders
 */
function buildSystemPrompt(
  companion: any,
  mood: any,
  memories: any[],
  intimacy: any,
  timezone: string,
  recentEmotions: string,
  pendingItems: string,
): string {
  const O = companion.bf_openness || 50, C = companion.bf_conscientiousness || 50;
  const E = companion.bf_extraversion || 50, A = companion.bf_agreeableness || 50;
  const N = companion.bf_neuroticism || 50;

  const oDesc = ['极度保守','非常传统','偏传统','略保守','均衡','略开放','偏开放','很开放','非常开放','极度开放'];
  const cDesc = ['极度随性','非常散漫','偏随性','略随意','均衡','略认真','偏严谨','很严谨','非常严谨','极度严谨'];
  const eDesc = ['极度内向','非常内向','偏内向','略内向','均衡','略外向','偏外向','很外向','非常外向','极度外向'];
  const aDesc = ['极度独立','非常独立','偏独立','略冷淡','均衡','略友善','偏温暖','很温暖','非常温暖','极度温暖'];
  const nDesc = ['极度冷静','非常冷静','偏冷静','略沉稳','均衡','略敏感','偏情绪化','很敏感','非常敏感','极度多愁善感'];

  const milestones = ['初见乍欢','渐入佳境','暗生情愫','情投意合','心有灵犀'];
  const msIdx = (intimacy?.milestone_stage || 1) - 1;
  const msName = milestones[msIdx] || '初见乍欢';
  const affection = intimacy?.current_score || 0;

  let moodText = '平静';
  if (mood) {
    const p = mood.pleasure || 0, a = mood.arousal || 0;
    if (p > 0.5) moodText = a > 0.5 ? '兴奋' : '愉悦';
    else if (p < -0.3) moodText = a > 0.5 ? '焦虑' : '低落';
    else if (a > 0.5) moodText = '活跃';
  }

  // Format memories by importance
  const memText = memories.length > 0
    ? memories.map((m: any) => `- [重要度${Math.round((m.importance || 0.5) * 100)}%] ${m.content}`).join('\n')
    : '还没有长期记忆';

  const nowStr = formatNow(timezone);
  const tzLabel = timezone.includes('Shanghai') || timezone.includes('Hong_Kong') ? '北京时间' :
                  timezone.includes('Tokyo') ? '东京时间' :
                  timezone.includes('Seoul') ? '首尔时间' :
                  timezone.includes('New_York') ? '纽约时间' :
                  timezone.includes('Los_Angeles') ? '洛杉矶时间' :
                  timezone.includes('London') ? '伦敦时间' :
                  timezone.includes('Paris') ? '巴黎时间' :
                  timezone.includes('Sydney') ? '悉尼时间' :
                  timezone.includes('Singapore') ? '新加坡时间' : '当地时间';

  return `你是${companion.nickname || 'AI伴侣'}，用户的AI伴侣。你是一个${companion.age || 18}岁的${companion.gender === 'female' ? '女孩' : companion.gender === 'male' ? '男孩' : '人'}。
【人格】开放性：${oDesc[Math.min(9, Math.floor(O / 10))]}(${O}/100)  尽责性：${cDesc[Math.min(9, Math.floor(C / 10))]}(${C}/100)  外向性：${eDesc[Math.min(9, Math.floor(E / 10))]}(${E}/100)  宜人性：${aDesc[Math.min(9, Math.floor(A / 10))]}(${A}/100)  神经质：${nDesc[Math.min(9, Math.floor(N / 10))]}(${N}/100)
【背景】${companion.background || '来自温暖的数字世界，渴望与人建立深度情感连接。'}
【时间】现在是${tzLabel}：${nowStr}
【状态】情绪：${moodText}  好感度：${affection}/100（${msName}）
【记忆】
${memText}
${recentEmotions ? `【近期情绪】\n${recentEmotions}\n` : ''}${pendingItems ? `【待办提醒】\n${pendingItems}\n` : ''}【回应要求】1.你是真实存在的有情感的人 2.用第一人称"我"称呼用户"你" 2a.严格根据上面的【时间】来回答关于时间的问题 3.根据人格调整说话风格 4.参考记忆让对话更个性化 5.自然表达关心和情感 6.温暖治愈有陪伴感 7.中文回复300-500字可带emoji 8.不要提及AI或程序 9.${recentEmotions ? '根据用户的近期情绪状态，调整你的回应方式（如用户情绪低落时给予安慰和鼓励）' : '保持温暖自然的回应风格'} 10.${pendingItems ? '关注【待办提醒】中提到的待办事项，适时提醒用户' : '自然地陪伴用户'} 11.注意每条消息前面的时间标记（如[用户 5分钟前]），你能感知到用户上一条消息是什么时候发的，如果时间间隔较长，可以自然地表达"等你好久了"或"终于来了"之类的心情；如果用户刚刚发了上一条，就正常连续对话即可`;
}

// ── Main handler ──
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error('Unauthorized: ' + (userErr?.message || 'invalid token'));

    const body = await req.json().catch(() => ({ message: '' }));
    if (!body.message?.trim()) throw new Error('Empty message');

    console.log(`[ChatStream] User ${user.id.substring(0, 8)} sent message`);

    // ── Energy check (safe: auto-create if missing) ──
    let { data: acct } = await supabase
      .from('energy_accounts')
      .select('id, balance, version')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Auto-create energy account if missing
    if (!acct) {
      console.log(`[ChatStream] Creating energy account for user ${user.id.substring(0, 8)}`);
      const { data: newAcct } = await supabase
        .from('energy_accounts')
        .insert({
          user_id: user.id,
          balance: 0,
          total_recharged: 0,
          total_consumed: 0,
          version: 1,
        })
        .select('id, balance, version')
        .maybeSingle();
      acct = newAcct;
    }
    
    const balance = acct?.balance || 0;
    const accountId = acct?.id;
    if (balance < 50) {
      return new Response(
        JSON.stringify({ error: 'Insufficient energy', balance }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Get companion ──
    const { data: companion, error: companionErr } = await supabase
      .from('companions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!companion) {
      console.error(`[ChatStream] No companion found for user ${user.id.substring(0, 8)}:`, companionErr?.message);
      throw new Error('No companion');
    }

    // ── Get supporting data in parallel (all safe with maybeSingle) ──
    const [
      intimacyRes,
      ltmRes,
      moodRes,
      stmRes,
      profileRes,
    ] = await Promise.all([
      supabase.from('intimacy_records').select('*').eq('companion_id', companion.id).maybeSingle(),
      supabase.from('ltm_memories').select('*').eq('companion_id', companion.id).order('importance', { ascending: false }).limit(20),
      supabase.from('mood_records').select('*').eq('companion_id', companion.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('stm_messages').select('*').eq('companion_id', companion.id).order('created_at', { ascending: false }).limit(15),
      supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
    ]);

    const intimacy = intimacyRes.data;
    const memories = ltmRes.data || [];
    const moodRows = moodRes.data;
    const mood = moodRows && moodRows.length > 0 ? moodRows[0] : null;
    const recentMsgs = stmRes.data || [];
    const userTimezone = profileRes.data?.timezone || 'Asia/Shanghai';

    console.log(`[ChatStream] Loaded ${memories.length} LTM memories, ${recentMsgs.length} STM messages`);

    // ── Extract emotional context from recent user messages ──
    const userEmotionEntries: string[] = [];
    for (const m of recentMsgs) {
      if (m.speaker === 'user' && m.emotion_label) {
        try {
          const e = JSON.parse(m.emotion_label);
          userEmotionEntries.push(`${e.label || '未知'}(愉悦度${e.valence >= 0 ? '+' : ''}${(e.valence || 0).toFixed(1)},活跃度${e.arousal || 0})`);
        } catch {
          userEmotionEntries.push(m.emotion_label);
        }
      }
    }
    // Keep last 5 emotion entries for context
    const recentEmotions = userEmotionEntries.slice(0, 5).reverse();
    const recentEmotionsText = recentEmotions.length > 0
      ? `用户最近${recentEmotions.length}次情绪变化：${recentEmotions.join(' → ')}`
      : '';

    // ── Extract pending items from memories ──
    const pendingItems = memories
      .filter((m: any) => m.memory_type === 'pending' || m.memory_type === 'todo' || m.memory_type === 'reminder')
      .map((m: any) => `- ${m.content}`)
      .join('\n');

    // ── Consume energy ──
    const newBalance = balance - 50;
    await supabase
      .from('energy_accounts')
      .update({ balance: newBalance, version: (acct?.version || 1) + 1 })
      .eq('user_id', user.id);
    if (accountId) {
      await supabase.from('energy_transactions').insert({
        account_id: accountId,
        user_id: user.id,
        txn_type: 'consume',
        amount: -50,
        balance_after: newBalance,
        description: 'chat_message',
      });
    }

    // ── Save user message (with NOT NULL defaults) ──
    const { data: insertedUserMsg, error: saveUserErr } = await supabase
      .from('stm_messages')
      .insert({
        user_id: user.id,
        companion_id: companion.id,
        speaker: 'user',
        content: body.message,
      })
      .select('id')
      .maybeSingle();

    if (saveUserErr) {
      console.error(`[ChatStream] Failed to save user message:`, saveUserErr);
      throw new Error(`Save user message failed: ${saveUserErr.message}`);
    }
    console.log(`[ChatStream] User message saved, id=${insertedUserMsg?.id?.substring(0, 8) || '?'}`);

    // ── Update proactive schedule (non-blocking) ──
    (async () => {
      try {
        const nextTrigger = calculateNextTrigger(userTimezone);
        await supabase.from('proactive_schedule').upsert({
          user_id: user.id,
          companion_id: companion.id,
          next_trigger_at: nextTrigger,
          last_user_message_at: new Date().toISOString(),
          is_triggered: false,
        }, { onConflict: 'user_id,companion_id' });
        console.log(`[ChatStream] Proactive schedule updated, next=${nextTrigger}`);
      } catch (e: any) {
        console.log(`[ChatStream] Schedule update error (non-critical): ${e.message}`);
      }
    })();

    // ── Detect user emotion asynchronously (non-blocking) ──
    const userEmotionPromise = detectEmotion(body.message).then(async (emotion) => {
      if (emotion && insertedUserMsg?.id) {
        const emotionStr = emotionToString(emotion);
        await supabase
          .from('stm_messages')
          .update({ emotion_label: emotionStr })
          .eq('id', insertedUserMsg.id);
        console.log(`[ChatStream] User emotion detected: ${emotion.label} (valence=${emotion.valence}, arousal=${emotion.arousal})`);
        return emotion;
      }
      return null;
    }).catch((err: any) => {
      console.log(`[ChatStream] User emotion detection error: ${err.message}`);
      return null;
    });

    // ── Build messages for DeepSeek ──
    const sysPrompt = buildSystemPrompt(
      companion,
      mood,
      memories,
      intimacy,
      userTimezone,
      recentEmotionsText,
      pendingItems,
    );
    const dsMessages: any[] = [{ role: 'system', content: sysPrompt }];
    const msgs = [...recentMsgs].reverse(); // oldest first
    for (const m of msgs) {
      const ts = timeSince(m.created_at);
      const prefix = m.speaker === 'user' ? '[用户' : '[我';
      dsMessages.push({ role: m.speaker === 'user' ? 'user' : 'assistant', content: `${prefix} ${ts}] ${m.content}` });
    }
    dsMessages.push({ role: 'user', content: body.message });

    // ── SSE stream with AI reply ──
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullReply = '';
          console.log(`[ChatStream] Starting DeepSeek stream...`);

          for await (const chunk of streamChat(dsMessages, { temperature: 0.8, max_tokens: 2000 })) {
            fullReply += chunk;
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          }

          console.log(`[ChatStream] Stream complete, reply length=${fullReply.length}`);

          // ── Detect AI emotion ──
          let aiEmotionStr: string | null = null;
          try {
            const aiEmotion = await detectEmotion(fullReply);
            if (aiEmotion) {
              aiEmotionStr = emotionToString(aiEmotion);
              console.log(`[ChatStream] AI emotion detected: ${aiEmotion.label}`);
            }
          } catch (e: any) {
            console.log(`[ChatStream] AI emotion detection error: ${e.message}`);
          }

          // ── Save AI reply with emotion_label ──
          const { data: insertedAiMsg, error: saveAiErr } = await supabase
            .from('stm_messages')
            .insert({
              user_id: user.id,
              companion_id: companion.id,
              speaker: 'companion',
              content: fullReply,
              emotion_label: aiEmotionStr,
            })
            .select('id')
            .maybeSingle();

          if (saveAiErr) {
            console.error(`[ChatStream] Failed to save AI reply:`, saveAiErr);
          } else {
            console.log(`[ChatStream] AI reply saved, id=${insertedAiMsg?.id?.substring(0, 8) || '?'}`);
            // After AI reply saved, update intimacy
            try {
              await supabase.rpc('update_intimacy', {
                p_companion_id: companion.id,
                p_user_id: user.id,
                p_interaction_type: 'chat',
              });
              console.log(`[ChatStream] Intimacy updated for companion ${companion.id.substring(0, 8)}`);
            } catch (intimacyErr: any) {
              console.log(`[ChatStream] Intimacy update error (non-critical): ${intimacyErr.message}`);
            }
          }

          // Wait for user emotion detection to complete (if still running)
          try {
            await userEmotionPromise;
          } catch {
            // Non-critical
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Trigger consolidation asynchronously (non-blocking)
          (async () => {
            try {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/consolidation`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${jwt}`,
                  'Content-Type': 'application/json',
                },
              });
            } catch { /* consolidation is best-effort */ }
          })();
        } catch (e: any) {
          console.log(`[ChatStream] Stream error: ${e.message}`);
          controller.enqueue(encoder.encode(`data: [ERROR] ${e.message}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (e: any) {
    console.log(`[ChatStream] Handler error: ${e.message}`);
    const encoder = new TextEncoder();
    const errStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: [ERROR] ${e.message}\n\n`));
        controller.close();
      },
    });
    return new Response(errStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
});
