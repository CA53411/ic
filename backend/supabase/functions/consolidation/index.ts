// ============================================================
// Platonic AI — Ultimate Memory Consolidation System
// ============================================================
// Design: Full AI-powered extraction with semantic deduplication
// Trigger: pg_cron every 15min (after conversation ends)
// Flow:
//   1. Find ended conversations (last_msg > 1h ago)
//   2. Build rich context (user + AI messages, existing LTM)
//   3. DeepSeek AI extracts structured memories
//   4. Semantic deduplication against existing LTM
//   5. Merge / insert / upgrade memories
//   6. Generate first-person diary entry
//   7. Create proactive anterior memories
// ============================================================

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  return null;
}

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// ── DeepSeek with retry & backoff ──
async function deepSeekChat<T>(messages: any[], opts: { maxTokens?: number; temp?: number } = {}): Promise<T> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const body = JSON.stringify({
    model: 'deepseek-v4-flash',
    messages,
    temperature: opts.temp ?? 0.3,
    max_tokens: opts.maxTokens ?? 4000,
    response_format: { type: 'json_object' },
  });

  // Retry with exponential backoff: 1s, 2s, 4s
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`[Consolidation] DeepSeek retry ${attempt}/2 after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for complex reasoning

    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body,
      });
      clearTimeout(timeoutId);

      if (res.status === 429 || res.status === 503) {
        const err = await res.text();
        console.log(`[Consolidation] DeepSeek busy (${res.status}), will retry`);
        lastError = new Error(`Busy: ${err.substring(0, 200)}`);
        continue;
      }
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`DeepSeek ${res.status}: ${err.substring(0, 300)}`);
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response');
      return JSON.parse(content) as T;
    } catch (e) {
      clearTimeout(timeoutId);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('aborted')) {
        console.log(`[Consolidation] DeepSeek timeout (30s)`);
        lastError = new Error('Timeout');
      } else {
        throw e; // Non-retryable error
      }
    }
  }
  throw lastError || new Error('All retries exhausted');
}

// ── Types ──
interface STMMsg { id: string; companion_id: string; content: string; speaker: 'user' | 'companion'; created_at: string; }

interface ExtractedMemory {
  content: string;
  type: 'fact' | 'preference' | 'event' | 'emotion' | 'relationship' | 'goal';
  importance: number; // 0.0-1.0
  is_permanent: boolean;
  confidence: number; // 0.0-1.0 AI confidence
  source_stm_ids: string[];
  context_quote: string; // supporting evidence from conversation
  time_anchor?: string; // e.g. "2026-05-23 morning"
}

interface AnteriorTask {
  content: string;
  trigger_type: 'time_based' | 'event_based' | 'milestone_based';
  planned_at: string;
  priority: number;
  reason: string; // why this anterior was created
}

interface DiaryEntry {
  title: string;
  content: string; // first-person narrative
  emotion_tag: string;
  key_moments: string[];
  reflection: string;
  tomorrow_hopes: string;
}

interface ConsolidationResult {
  memories: ExtractedMemory[];
  anterior_tasks: AnteriorTask[];
  diary: DiaryEntry;
  user_mood_summary: string;
  relationship_progress: string; // how relationship deepened
}

interface ExistingLTM { id: string; content: string; memory_type: string; importance: number; created_at: string; }

// ── The Ultimate Consolidation Prompt ──
function buildMasterPrompt(
  companionName: string,
  messages: STMMsg[],
  existingLTM: ExistingLTM[],
  previousDiaries: { content: string; diary_date: string }[],
  timezone: string
): string {
  const msgsFormatted = messages.map(m => {
    const speaker = m.speaker === 'user' ? '【用户】' : `【${companionName}】`;
    const time = new Date(m.created_at).toLocaleString('zh-CN', { timeZone: timezone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${speaker} (${time}): ${m.content}`;
  }).join('\n');

  const existingFormatted = existingLTM.length > 0
    ? existingLTM.map((m, i) => `${i + 1}. [${m.memory_type}] ${m.content}`).join('\n')
    : '（尚无已有长期记忆）';

  const prevDiariesFormatted = previousDiaries.length > 0
    ? previousDiaries.slice(0, 3).map(d => `- ${d.diary_date}: ${d.content.substring(0, 100)}`).join('\n')
    : '（尚无往日日记）';

  return `你是Platonic AI的记忆架构师。请分析以下完整对话，提取高质量结构化记忆。

=== 对话记录（共${messages.length}条）===
${msgsFormatted}

=== 已有长期记忆（避免重复提取）===
${existingFormatted}

=== 往日日记摘要 ===
${prevDiariesFormatted}

=== 提取规则 ===
【记忆类型】
- fact: 客观事实（姓名、生日、家乡、职业、家庭等）
- preference: 喜好偏好（喜欢的食物/颜色/音乐/活动等）
- event: 具体事件（今天做了什么、去了哪里、发生了什么）
- emotion: 情感体验（开心、难过、焦虑、感动的具体原因）
- relationship: 关系动态（称呼变化、亲密度里程碑、信任建立）
- goal: 目标愿望（想做的事、计划、梦想）

【重要性评分】
- 1.0 = 核心身份（真实姓名、生日、家庭关系）—— 永久保存
- 0.8-0.9 = 重要偏好/关键事件 —— 长期保存
- 0.5-0.7 = 一般信息 —— 中期保存
- 0.3-0.4 = 次要细节 —— 短期保存
- 0.1-0.2 = 闲聊内容 —— 不保存

【去重规则】
如果待提取记忆与"已有长期记忆"语义相同，则跳过（不要重复提取）。
如果新信息是对已有记忆的补充/更新，则提取为升级版。

【置信度】
0.9+ = 用户明确陈述
0.7-0.8 = 强烈暗示
0.5-0.6 = 合理推断
< 0.5 = 不确定，不提取

请输出JSON：
{
  "memories": [
    {
      "content": "记忆内容（简洁清晰，第三人称描述）",
      "type": "fact|preference|event|emotion|relationship|goal",
      "importance": 0.0-1.0,
      "is_permanent": true/false,
      "confidence": 0.0-1.0,
      "source_stm_ids": ["msg_uuid"],
      "context_quote": "支撑这句话的对话原文片段",
      "time_anchor": "时间锚点描述"
    }
  ],
  "anterior_tasks": [
    {
      "content": "待办事项描述",
      "trigger_type": "time_based|event_based|milestone_based",
      "planned_at": "2026-05-25T10:00:00Z",
      "priority": 0.0-1.0,
      "reason": "为什么创建这个待办"
    }
  ],
  "diary": {
    "title": "日记标题",
    "content": "用${companionName}的第一人称写今日日记（200-400字），温暖、细腻、有情感深度。记录今日对话 highlights、对用户的观察和感受、关系进展。",
    "emotion_tag": "主导情绪",
    "key_moments": ["今日最温暖的时刻1", "有趣的时刻2"],
    "reflection": "对今日对话的深层感悟",
    "tomorrow_hopes": "对明天的期待"
  },
  "user_mood_summary": "用户今日情绪变化总结（20字以内）",
  "relationship_progress": "关系进展描述（20字以内）"
}`;
}

// ── Check if new memory is similar to existing LTM ──
function isDuplicate(newMem: ExtractedMemory, existingLTM: ExistingLTM[]): boolean {
  const newContent = newMem.content.toLowerCase().trim();
  for (const existing of existingLTM) {
    const existingContent = existing.content.toLowerCase().trim();
    // Exact or near-exact match
    if (newContent === existingContent) return true;
    // Substring match (one contained in the other)
    if (newContent.length > 10 && existingContent.length > 10) {
      if (newContent.includes(existingContent) || existingContent.includes(newContent)) return true;
    }
    // Same type + high word overlap
    if (existing.memory_type === newMem.type) {
      const newWords = new Set(newContent.split(/[\s,，。！？；]+/).filter(w => w.length > 1));
      const existWords = new Set(existingContent.split(/[\s,，。！？；]+/).filter(w => w.length > 1));
      if (newWords.size > 0) {
        let overlap = 0;
        for (const w of newWords) if (existWords.has(w)) overlap++;
        if (overlap / newWords.size > 0.7) return true; // 70% word overlap
      }
    }
  }
  return false;
}

// ── Upsert memory (merge if similar exists) ──
async function upsertMemory(
  supabase: any,
  companionId: string,
  userId: string,
  newMem: ExtractedMemory
): Promise<{ action: 'inserted' | 'merged' | 'skipped'; id?: string }> {
  // Check for similar existing memory
  const { data: existing } = await supabase
    .from('ltm_memories')
    .select('id, content, importance, source_stm_ids')
    .eq('companion_id', companionId)
    .ilike('content', `%${newMem.content.substring(0, 30)}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    // Merge: combine source_stm_ids, keep higher importance
    const old = existing[0];
    const mergedSources = [...new Set([...(old.source_stm_ids || []), ...newMem.source_stm_ids])];
    const newImportance = Math.max(old.importance || 0, newMem.importance);
    await supabase.from('ltm_memories').update({
      content: newMem.content.length > old.content.length ? newMem.content : old.content, // Keep longer/more detailed
      importance: newImportance,
      source_stm_ids: mergedSources,
      updated_at: new Date().toISOString(),
    }).eq('id', old.id);
    return { action: 'merged', id: old.id };
  }

  // Insert new
  const validUuids = newMem.source_stm_ids.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  const { data, error } = await supabase.from('ltm_memories').insert({
    companion_id: companionId,
    content: newMem.content,
    memory_type: newMem.type,
    importance: newMem.importance,
    source_stm_ids: validUuids.length > 0 ? validUuids : [companionId],
    created_at: new Date().toISOString(),
  }).select('id').maybeSingle();

  if (error) {
    console.error(`[Consolidation] LTM insert error:`, error);
    return { action: 'skipped' };
  }
  return { action: 'inserted', id: data?.id };
}

// ── Main ──
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const startTime = Date.now();
  try {
    const supabase = getSupabaseClient();

    // Fetch all active user companions
    const { data: companions, error: cErr } = await supabase
      .from('companions')
      .select('id, user_id, nickname')
      .neq('user_id', '00000000-0000-0000-0000-000000000000');

    if (cErr || !companions?.length) {
      return new Response(JSON.stringify({ processed: 0, message: 'No companions' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let processed = 0, skipped = 0, inserted = 0, merged = 0, anteriorTotal = 0;

    for (const comp of companions) {
      // 1. Get last message
      const { data: lastMsg } = await supabase.from('stm_messages')
        .select('id, created_at').eq('companion_id', comp.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!lastMsg) { skipped++; continue; }

      // 2. Conversation ended? (>1h since last message)
      const oneHourAgo = Date.now() - 3600000;
      if (new Date(lastMsg.created_at).getTime() > oneHourAgo) {
        skipped++;
        continue;
      }

      // 3. Get last consolidation time
      const { data: consRec } = await supabase.from('companion_consolidations')
        .select('last_consolidated_at').eq('companion_id', comp.id).maybeSingle();

      // 4. Fetch messages to process
      let q = supabase.from('stm_messages')
        .select('id, companion_id, content, speaker, created_at')
        .eq('companion_id', comp.id);
      if (consRec?.last_consolidated_at) {
        q = q.gt('created_at', consRec.last_consolidated_at);
      } else {
        q = q.gte('created_at', new Date(Date.now() - 86400000).toISOString());
      }
      const { data: messages } = await q.order('created_at', { ascending: true });

      if (!messages || messages.length < 3) {
        // Mark processed even if too few
        await supabase.from('companion_consolidations').upsert({
          companion_id: comp.id,
          last_consolidated_at: new Date().toISOString(),
        }, { onConflict: 'companion_id' });
        skipped++;
        continue;
      }

      // 5. Fetch context: existing LTM + previous diaries
      const [{ data: existingLTM }, { data: prevDiaries }] = await Promise.all([
        supabase.from('ltm_memories').select('id, content, memory_type, importance, created_at')
          .eq('companion_id', comp.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('companion_diaries').select('content, diary_date')
          .eq('companion_id', comp.id).order('diary_date', { ascending: false }).limit(3),
      ]);

      const userTz = 'Asia/Shanghai'; // TODO: read from profiles table

      // 6. DeepSeek AI extraction
      console.log(`[Consolidation] ${comp.nickname}: ${messages.length} msgs, ${existingLTM?.length ?? 0} existing LTM → AI extraction...`);
      let result: ConsolidationResult;
      try {
        const prompt = buildMasterPrompt(comp.nickname, messages as STMMsg[], existingLTM || [], prevDiaries || [], userTz);
        result = await deepSeekChat<ConsolidationResult>([
          { role: 'system', content: '你是Platonic AI记忆架构师。只输出合法JSON，不要markdown代码块。' },
          { role: 'user', content: prompt },
        ], { maxTokens: 4000, temp: 0.3 });
      } catch (aiErr) {
        console.error(`[Consolidation] ${comp.nickname}: AI failed after retries →`, (aiErr as Error).message);
        skipped++;
        continue;
      }

      if (!result?.memories) {
        console.log(`[Consolidation] ${comp.nickname}: AI returned no memories`);
        skipped++;
        continue;
      }

      console.log(`[Consolidation] ${comp.nickname}: AI extracted ${result.memories.length} memories`);

      // 7. Deduplicate & upsert memories
      let ltmsInserted = 0, ltmsMerged = 0;
      for (const mem of result.memories) {
        // Skip low-confidence memories
        if ((mem.confidence || 0) < 0.5) continue;
        // Skip duplicates
        if (isDuplicate(mem, existingLTM || [])) {
          console.log(`[Consolidation] Deduped: "${mem.content.substring(0, 40)}..."`);
          continue;
        }

        const r = await upsertMemory(supabase, comp.id, comp.user_id, mem);
        if (r.action === 'inserted') { ltmsInserted++; inserted++; }
        else if (r.action === 'merged') { ltmsMerged++; merged++; }
      }

      // 8. Insert anterior tasks
      if (result.anterior_tasks?.length) {
        const inserts = result.anterior_tasks.map(a => ({
          companion_id: comp.id,
          content: a.content,
          trigger_type: a.trigger_type,
          planned_at: a.planned_at || new Date(Date.now() + 86400000).toISOString(),
          priority: Math.min(5, Math.max(1, Math.round((a.priority || 0.5) * 5))),
          created_at: new Date().toISOString(),
        }));
        const { error: aErr } = await supabase.from('anterior_memories').insert(inserts);
        if (aErr) {
          console.error(`[Consolidation] Anterior insert error:`, aErr);
        } else {
          anteriorTotal += result.anterior_tasks.length;
          console.log(`[Consolidation] Inserted ${result.anterior_tasks.length} anterior tasks for ${comp.nickname}`);
        }
      }

      // 9. Insert rich diary
      if (result.diary && result.diary.content) {
        const diaryData = {
          companion_id: comp.id,
          title: result.diary.title || `${comp.nickname}的日记`,
          content: result.diary.content,
          summary: '',
          key_moments: result.diary.key_moments || [],
          reflection: result.diary.reflection || '',
          emotion_trend: result.diary.emotion_tag || '平和',
          tomorrow_hopes: result.diary.tomorrow_hopes || '',
          source_stm_ids: messages.map((m: STMMsg) => m.id),
          generated_at: new Date().toISOString(),
        };
        const { error: dErr } = await supabase.from('companion_diaries').insert(diaryData);
        if (dErr) console.error(`[Consolidation] Diary insert error:`, dErr);
        else console.log(`[Consolidation] Diary inserted for ${comp.nickname}`);
      }

      // 10. Update consolidation record
      const { data: prevRec } = await supabase.from('companion_consolidations')
        .select('total_ltm_created, total_anterior_created').eq('companion_id', comp.id).maybeSingle();

      await supabase.from('companion_consolidations').upsert({
        companion_id: comp.id,
        last_consolidated_at: new Date().toISOString(),
        total_ltm_created: (prevRec?.total_ltm_created || 0) + ltmsInserted,
        total_anterior_created: (prevRec?.total_anterior_created || 0) + (result.anterior_tasks?.length || 0),
      }, { onConflict: 'companion_id' });

      console.log(`[Consolidation] ${comp.nickname}: ✅ +${ltmsInserted} new, ~${ltmsMerged} merged`);
      processed++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return new Response(JSON.stringify({
      processed, skipped,
      memories_inserted: inserted,
      memories_merged: merged,
      anterior_created: anteriorTotal,
      companions: companions.length,
      elapsed_sec: elapsed,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[Consolidation] Fatal:', e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
