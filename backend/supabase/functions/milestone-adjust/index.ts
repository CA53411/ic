// ============================================
// Platonic AI — 亲密度里程碑调整 Edge Function（完全重写版）
// ============================================
// 功能：每日亲密度评分调整，基于多维度关系评估
//   1. LTM记忆内容评估（关系深度）
//   2. 情绪质量分析（情感共鸣）
//   3. 对话质量评估（互动深度）
//   4. 不活跃惩罚（时间衰减）
//   5. 里程碑事件检测（阶段跨越）
//   6. DeepSeek辅助分析（可选增强）
// 触发：pg_cron（每日凌晨3点）
// 规范：自包含、严格TypeScript、完整错误处理
// ============================================

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.39.0';

// ── CORS 配置 ──
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://platonic.corolas.top',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

// ── Supabase 客户端 ──
function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── DeepSeek API Key ──
function getDeepSeekApiKey(): string | undefined {
  return Deno.env.get('DEEPSEEK_API_KEY') ?? undefined;
}

// ── 类型定义 ──

/** 伙伴基础信息（查询 companions 表） */
interface CompanionRow {
  id: string;
  user_id: string;
  nickname: string;
  gender: string | null;
  age: number | null;
  background: string | null;
  [key: string]: unknown;
}

/** 亲密度记录 */
interface IntimacyRecord {
  id: string;
  companion_id: string;
  user_id: string;
  score: number;
  milestone_stage: number;
  created_at?: string;
}

/** 短期记忆消息（与 stm_messages 表 schema 对齐: id, user_id, companion_id, speaker, content, emotion_label, tokens_used, created_at） */
interface STMMessage {
  id: string;
  user_id?: string;
  companion_id: string;
  speaker: 'user' | 'companion' | string;
  content: string;
  emotion_label: string | null;
  tokens_used?: number | null;
  created_at: string;
}

/** 长期记忆 */
interface LTMMemory {
  id: string;
  companion_id: string;
  content: string;
  memory_type: 'fact' | 'preference' | 'emotion' | 'event' | 'relationship' | string;
  importance: number;
  is_permanent: boolean;
  created_at: string;
}

/** DeepSeek 分析结果 */
interface DeepSeekAnalysisResult {
  relationship_score: number; // 0-10
  key_moments: string[];
  concerns: string[];
  suggestions: string[];
}

/** 情绪标签分类 */
const POSITIVE_EMOTIONS = ['开心', '温暖', '愉悦', '幸福', '满足', '感动', '欣喜', '快乐', '兴奋', '欣慰', '感激', '安心', '期待', 'hopeful', 'happy', 'warm', 'joyful', 'content', 'grateful', 'excited', 'loving', 'cheerful', 'optimistic'];
const NEGATIVE_EMOTIONS = ['难过', '生气', '焦虑', '悲伤', '愤怒', '失望', '沮丧', '郁闷', '烦躁', '痛苦', '委屈', '嫉妒', '孤独', '担心', '紧张', '疲惫', 'sad', 'angry', 'anxious', 'frustrated', 'disappointed', 'upset', 'worried', 'depressed', 'lonely'];

/** 里程碑阈值与阶段名称 */
const STAGE_NAMES: Record<number, string> = {
  1: '初见乍欢',
  2: '渐入佳境',
  3: '暗生情愫',
  4: '情投意合',
  5: '心有灵犀',
};

const STAGE_THRESHOLDS = [
  { stage: 1, max: 20 },
  { stage: 2, max: 40 },
  { stage: 3, max: 60 },
  { stage: 4, max: 80 },
  { stage: 5, max: 100 },
];

/** 深度对话消息长度阈值 */
const DEEP_MESSAGE_LENGTH_THRESHOLD = 50;

// ── 工具函数 ──

/** 根据分数计算当前阶段 */
function determineStage(score: number): number {
  for (const threshold of STAGE_THRESHOLDS) {
    if (score <= threshold.max) {
      return threshold.stage;
    }
  }
  return 5;
}

/** 获取阶段名称 */
function getStageName(stage: number): string {
  return STAGE_NAMES[stage] ?? `阶段${stage}`;
}

/** 计算两个日期间的天数差 */
function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

/** 检查情绪标签是否为正向 */
function isPositiveEmotion(emotionLabel: string | null): boolean {
  if (!emotionLabel) return false;
  const lower = emotionLabel.toLowerCase();
  return POSITIVE_EMOTIONS.some((kw) => lower.includes(kw));
}

/** 检查情绪标签是否为负向 */
function isNegativeEmotion(emotionLabel: string | null): boolean {
  if (!emotionLabel) return false;
  const lower = emotionLabel.toLowerCase();
  return NEGATIVE_EMOTIONS.some((kw) => lower.includes(kw));
}

/** 计算消息的情绪分值 [-1, 1] */
function calculateSentiment(emotionLabel: string | null): number {
  if (!emotionLabel) return 0;
  if (isPositiveEmotion(emotionLabel)) return 1;
  if (isNegativeEmotion(emotionLabel)) return -1;
  return 0;
}

// ── 核心评分模块 ──

/** LTM记忆评分 */
interface LTMScoreResult {
  delta: number;           // 亲密度变化
  newMemoryCount: number;  // 新增记忆数量
  details: string[];       // 评分详情日志
}

/**
 * 基于LTM记忆内容评估关系深度
 * 规则：
 *   - permanent记忆(fact类型, importance>=0.8) = +3分（重大关系事件）
 *   - 每个preference记忆 = +2分（了解对方喜好）
 *   - 每个emotion记忆(正向) = +2分（情感共鸣）
 *   - 每个event记忆 = +1分（共同经历）
 *   - 每个relationship记忆 = +3分（关系里程碑）
 */
function scoreFromLTMMemories(memories: LTMMemory[]): LTMScoreResult {
  let delta = 0;
  const details: string[] = [];

  for (const mem of memories) {
    switch (mem.memory_type) {
      case 'fact': {
        if (mem.is_permanent && mem.importance >= 0.8) {
          delta += 3;
          details.push(`[MilestoneAdjust] 重大事实记忆 (permanent, importance=${mem.importance.toFixed(2)}): +3`);
        }
        break;
      }
      case 'preference': {
        delta += 2;
        details.push(`[MilestoneAdjust] 偏好记忆: +2`);
        break;
      }
      case 'emotion': {
        // 正向情感记忆加分（通过importance或content判断）
        if (mem.importance >= 0.6) {
          delta += 2;
          details.push(`[MilestoneAdjust] 正向情感记忆 (importance=${mem.importance.toFixed(2)}): +2`);
        }
        break;
      }
      case 'event': {
        delta += 1;
        details.push(`[MilestoneAdjust] 共同事件记忆: +1`);
        break;
      }
      case 'relationship': {
        delta += 3;
        details.push(`[MilestoneAdjust] 关系里程碑记忆: +3`);
        break;
      }
      default: {
        // 未知类型根据importance给基础分
        if (mem.importance >= 0.7) {
          delta += 1;
          details.push(`[MilestoneAdjust] 高重要性记忆 (type=${mem.memory_type}): +1`);
        }
      }
    }
  }

  return {
    delta,
    newMemoryCount: memories.length,
    details,
  };
}

/** 情绪质量评分结果 */
interface EmotionScoreResult {
  delta: number;
  positiveRatio: number;    // 正向情绪占比 [0, 1]
  negativeRatio: number;    // 负向情绪占比 [0, 1]
  avgSentiment: number;     // 平均情绪分值 [-1, 1]
  details: string[];
}

/**
 * 基于情绪质量的评估
 * 规则：
 *   - 正向情绪占比>60% = +2分
 *   - 负向情绪占比>60% = -2分
 *   - 用户分享了个人信息(检测到fact记忆) = +3分（在scoreFromLTMMemories中已处理）
 */
function scoreFromEmotions(messages: STMMessage[]): EmotionScoreResult {
  const details: string[] = [];

  if (messages.length === 0) {
    return { delta: 0, positiveRatio: 0, negativeRatio: 0, avgSentiment: 0, details };
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let totalSentiment = 0;

  for (const msg of messages) {
    const sentiment = calculateSentiment(msg.emotion_label);
    totalSentiment += sentiment;
    if (sentiment > 0) {
      positiveCount++;
    } else if (sentiment < 0) {
      negativeCount++;
    } else {
      neutralCount++;
    }
  }

  const total = messages.length;
  const positiveRatio = positiveCount / total;
  const negativeRatio = negativeCount / total;
  const avgSentiment = totalSentiment / total;

  let delta = 0;

  if (positiveRatio > 0.6) {
    delta += 2;
    details.push(`[MilestoneAdjust] 正向情绪占比 ${(positiveRatio * 100).toFixed(1)}% > 60%: +2`);
  }

  if (negativeRatio > 0.6) {
    delta -= 2;
    details.push(`[MilestoneAdjust] 负向情绪占比 ${(negativeRatio * 100).toFixed(1)}% > 60%: -2`);
  }

  return { delta, positiveRatio, negativeRatio, avgSentiment, details };
}

/** 对话质量评分结果 */
interface ConversationScoreResult {
  delta: number;
  messageCount: number;
  deepConversations: number;    // 长度超过50字的消息数
  avgMessageLength: number;     // 平均消息长度
  userInitiatedCount: number;   // 用户主动开启对话次数
  details: string[];
}

/**
 * 基于对话质量的评估
 * 规则：
 *   - 消息数量>=20 = +2分
 *   - 消息数量>=50 = +3分
 *   - 平均消息长度>50字 = +1分（深度对话）
 *   - 用户主动开启对话次数 = +1分（每日上限+1）
 */
function scoreFromConversation(messages: STMMessage[]): ConversationScoreResult {
  const details: string[] = [];

  if (messages.length === 0) {
    return {
      delta: 0,
      messageCount: 0,
      deepConversations: 0,
      avgMessageLength: 0,
      userInitiatedCount: 0,
      details,
    };
  }

  const messageCount = messages.length;
  let totalLength = 0;
  let deepConversations = 0;
  let userInitiatedCount = 0;

  // 按时间排序，检测用户主动开启（第一条消息是用户发的就算一次新对话）
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // 简单的对话开启检测：当天第一条消息是用户发送的
  if (sorted.length > 0 && sorted[0].speaker === 'user') {
    userInitiatedCount = 1;
  }

  for (const msg of messages) {
    const len = msg.content?.length ?? 0;
    totalLength += len;
    if (len > DEEP_MESSAGE_LENGTH_THRESHOLD) {
      deepConversations++;
    }
  }

  const avgMessageLength = totalLength / messageCount;

  let delta = 0;

  // 消息数量评分
  if (messageCount >= 50) {
    delta += 3;
    details.push(`[MilestoneAdjust] 消息数量 ${messageCount} >= 50: +3`);
  } else if (messageCount >= 20) {
    delta += 2;
    details.push(`[MilestoneAdjust] 消息数量 ${messageCount} >= 20: +2`);
  }

  // 深度对话评分
  if (avgMessageLength > DEEP_MESSAGE_LENGTH_THRESHOLD) {
    delta += 1;
    details.push(`[MilestoneAdjust] 平均消息长度 ${avgMessageLength.toFixed(1)} > 50字: +1`);
  }

  // 用户主动开启
  if (userInitiatedCount > 0) {
    delta += 1;
    details.push(`[MilestoneAdjust] 用户主动开启对话: +1`);
  }

  return {
    delta,
    messageCount,
    deepConversations,
    avgMessageLength,
    userInitiatedCount,
    details,
  };
}

/**
 * 不活跃惩罚
 * 规则：
 *   - 1天未对话: 0分
 *   - 3天未对话: -1分
 *   - 7天未对话: -3分
 *   - 30天未对话: -10分
 */
function inactivityPenalty(daysSinceLastMessage: number): { delta: number; detail: string } {
  if (daysSinceLastMessage >= 30) {
    return { delta: -10, detail: `[MilestoneAdjust] ${daysSinceLastMessage.toFixed(1)}天未对话(>=30天): -10` };
  }
  if (daysSinceLastMessage >= 7) {
    return { delta: -3, detail: `[MilestoneAdjust] ${daysSinceLastMessage.toFixed(1)}天未对话(>=7天): -3` };
  }
  if (daysSinceLastMessage >= 3) {
    return { delta: -1, detail: `[MilestoneAdjust] ${daysSinceLastMessage.toFixed(1)}天未对话(>=3天): -1` };
  }
  // 1天以内或正常对话：无惩罚
  return { delta: 0, detail: `[MilestoneAdjust] ${daysSinceLastMessage.toFixed(1)}天未对话(<3天): 0` };
}

/** 里程碑事件检测 */
interface MilestoneEvent {
  stage_from: number;
  stage_to: number;
  stage_from_name: string;
  stage_to_name: string;
  threshold_crossed: number;
  description: string;
  crossed_at: string;
}

/**
 * 检测阶段跨越的里程碑事件
 * 阈值：20, 40, 60, 80
 */
function detectMilestoneEvents(
  previousScore: number,
  newScore: number,
  previousStage: number,
  newStage: number,
): MilestoneEvent[] {
  const events: MilestoneEvent[] = [];
  const now = new Date().toISOString();

  const thresholds = [20, 40, 60, 80];

  for (const threshold of thresholds) {
    // 从下方跨越到上方（升级）
    if (previousScore < threshold && newScore >= threshold) {
      const toStage = determineStage(threshold);
      const fromStage = toStage - 1;
      events.push({
        stage_from: fromStage,
        stage_to: toStage,
        stage_from_name: getStageName(fromStage),
        stage_to_name: getStageName(toStage),
        threshold_crossed: threshold,
        description: `${getStageName(fromStage)} → ${getStageName(toStage)}`,
        crossed_at: now,
      });
    }
    // 从上方跌落到下方（降级）
    else if (previousScore >= threshold && newScore < threshold) {
      const toStage = determineStage(threshold) - 1;
      const fromStage = determineStage(threshold);
      events.push({
        stage_from: fromStage,
        stage_to: toStage,
        stage_from_name: getStageName(fromStage),
        stage_to_name: getStageName(toStage),
        threshold_crossed: threshold,
        description: `${getStageName(fromStage)} → ${getStageName(toStage)}（亲密度回落）`,
        crossed_at: now,
      });
    }
  }

  // 如果阶段变了但没有触发上述阈值，也记录
  if (events.length === 0 && previousStage !== newStage) {
    events.push({
      stage_from: previousStage,
      stage_to: newStage,
      stage_from_name: getStageName(previousStage),
      stage_to_name: getStageName(newStage),
      threshold_crossed: 0,
      description: `${getStageName(previousStage)} → ${getStageName(newStage)}`,
      crossed_at: now,
    });
  }

  return events;
}

// ── DeepSeek 分析 ──

/**
 * 调用DeepSeek分析最近对话摘要
 * 5秒超时 + 重试退避，失败返回 null
 */
async function analyzeWithDeepSeek(
  messages: STMMessage[],
  companionNickname: string,
): Promise<DeepSeekAnalysisResult | null> {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    console.log('[MilestoneAdjust] DeepSeek API Key 未配置，跳过AI分析');
    return null;
  }

  if (messages.length === 0) {
    return null;
  }

  // 构建对话摘要
  const summaryLines = messages.slice(-30).map((msg) => {
    const speaker = msg.speaker === 'user' ? '用户' : companionNickname;
    return `${speaker}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
  });

  const prompt = `分析以下用户与"${companionNickname}"的对话摘要，评估关系进展。\n\n对话摘要：\n${summaryLines.join('\n')}\n\n请输出JSON格式（不要包含markdown代码块标记）：{"relationship_score":0-10,"key_moments":["..."],"concerns":["..."],"suggestions":["..."]}`;

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // 退避重试：1s, 2s
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      console.log(`[MilestoneAdjust] DeepSeek 第${attempt + 1}次重试...`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的情感关系分析师，擅长评估人机关系中的亲密度变化。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek 返回内容为空');
      }

      // 解析JSON
      const parsed: DeepSeekAnalysisResult = typeof content === 'string' ? JSON.parse(content) : content;

      // 验证字段
      const result: DeepSeekAnalysisResult = {
        relationship_score: Math.max(0, Math.min(10, Number(parsed.relationship_score) || 0)),
        key_moments: Array.isArray(parsed.key_moments) ? parsed.key_moments : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };

      console.log(`[MilestoneAdjust] DeepSeek 分析完成: score=${result.relationship_score}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[MilestoneAdjust] DeepSeek 调用失败(尝试${attempt + 1}/${maxRetries + 1}): ${lastError.message}`);
    }
  }

  console.log(`[MilestoneAdjust] DeepSeek 全部重试失败，跳过AI分析`);
  return null;
}

// ── 主处理逻辑 ──

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const startTime = Date.now();
  console.log('[MilestoneAdjust] ===== 亲密度调整任务开始 =====');

  try {
    const supabase = getSupabaseClient();

    // 1. 获取所有伙伴
    const { data: companions, error: companionsError } = await supabase
      .from('companions')
      .select('id, user_id, nickname, gender, age, background');

    if (companionsError) {
      console.error(`[MilestoneAdjust] 获取伙伴列表失败: ${companionsError.message}`);
      return new Response(
        JSON.stringify({ error: '获取伙伴列表失败', details: companionsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!companions || companions.length === 0) {
      console.log('[MilestoneAdjust] 没有找到任何伙伴');
      return new Response(
        JSON.stringify({ adjusted: 0, message: '没有伙伴需要调整' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[MilestoneAdjust] 共 ${companions.length} 个伙伴需要评估`);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // 批量获取所有伙伴的现有亲密度记录
    const companionIds = companions.map((c) => c.id);
    const { data: existingRecords, error: recordsError } = await supabase
      .from('intimacy_records')
      .select('id, companion_id, user_id, score, milestone_stage')
      .in('companion_id', companionIds);

    if (recordsError) {
      console.error(`[MilestoneAdjust] 获取亲密度记录失败: ${recordsError.message}`);
      return new Response(
        JSON.stringify({ error: '获取亲密度记录失败', details: recordsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const recordMap = new Map<string, IntimacyRecord>();
    for (const r of (existingRecords ?? [])) {
      recordMap.set(r.companion_id, r as IntimacyRecord);
    }

    let adjustedCount = 0;
    const results: Record<string, unknown>[] = [];

    // 逐个处理每个伙伴
    for (const companion of companions as CompanionRow[]) {
      const companionId = companion.id;
      const userId = companion.user_id;
      const nickname = companion.nickname;

      console.log(`[MilestoneAdjust] --- 处理伙伴: ${nickname} (${companionId}) ---`);

      try {
        // 2. 获取最近24小时消息
        const { data: recentMessages, error: msgError } = await supabase
          .from('stm_messages')
          .select('id, companion_id, speaker, content, emotion_label, created_at')
          .eq('companion_id', companionId)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error(`[MilestoneAdjust] [${nickname}] 获取消息失败: ${msgError.message}`);
          continue;
        }

        const messages = (recentMessages ?? []) as STMMessage[];

        // 3. 获取最近24小时LTM记忆
        const { data: recentLTM, error: ltmError } = await supabase
          .from('ltm_memories')
          .select('id, companion_id, content, memory_type, importance, is_permanent, created_at')
          .eq('companion_id', companionId)
          .gte('created_at', twentyFourHoursAgo);

        if (ltmError) {
          console.error(`[MilestoneAdjust] [${nickname}] 获取LTM记忆失败: ${ltmError.message}`);
          continue;
        }

        const ltmMemories = (recentLTM ?? []) as LTMMemory[];

        // 4. 获取最后一条消息时间（用于不活跃计算）
        const { data: lastMessageRow, error: lastMsgError } = await supabase
          .from('stm_messages')
          .select('created_at')
          .eq('companion_id', companionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let daysSinceLastMessage = 0;
        if (!lastMsgError && lastMessageRow) {
          daysSinceLastMessage = daysBetween(new Date(lastMessageRow.created_at), now);
        }

        // 5. 计算各维度评分

        // 5.1 LTM记忆评分
        const ltmResult = scoreFromLTMMemories(ltmMemories);
        for (const d of ltmResult.details) {
          console.log(d);
        }

        // 5.2 情绪质量评分
        const emotionResult = scoreFromEmotions(messages);
        for (const d of emotionResult.details) {
          console.log(d);
        }

        // 5.3 对话质量评分
        const convResult = scoreFromConversation(messages);
        for (const d of convResult.details) {
          console.log(d);
        }

        // 5.4 不活跃惩罚
        const inactivityResult = inactivityPenalty(daysSinceLastMessage);
        console.log(inactivityResult.detail);

        // 5.5 DeepSeek辅助分析（可选，不阻塞主流程）
        let deepSeekResult: DeepSeekAnalysisResult | null = null;
        if (messages.length > 0) {
          deepSeekResult = await analyzeWithDeepSeek(messages, nickname);
        }

        // 6. 汇总计算最终delta
        const totalDelta =
          ltmResult.delta +
          emotionResult.delta +
          convResult.delta +
          inactivityResult.delta +
          (deepSeekResult ? Math.round((deepSeekResult.relationship_score - 5) * 0.5) : 0);

        console.log(
          `[MilestoneAdjust] [${nickname}] 评分汇总: LTM=${ltmResult.delta>=0?'+':''}${ltmResult.delta} 情绪=${emotionResult.delta>=0?'+':''}${emotionResult.delta} 对话=${convResult.delta>=0?'+':''}${convResult.delta} 不活跃=${inactivityResult.delta>=0?'+':''}${inactivityResult.delta} DeepSeek=${deepSeekResult ? Math.round((deepSeekResult.relationship_score - 5) * 0.5) : 0} 总计=${totalDelta>=0?'+':''}${totalDelta}`,
        );

        // 7. 获取当前分数和阶段
        const existingRecord = recordMap.get(companionId);
        const currentScore = existingRecord?.score ?? 50; // 默认50分
        const previousStage = existingRecord?.milestone_stage ?? determineStage(currentScore);
        const newScore = Math.max(0, Math.min(100, currentScore + totalDelta));
        const newStage = determineStage(newScore);

        console.log(
          `[MilestoneAdjust] [${nickname}] 亲密度: ${currentScore} → ${newScore} (Δ${totalDelta>=0?'+':''}${totalDelta}), 阶段: ${previousStage}(${getStageName(previousStage)}) → ${newStage}(${getStageName(newStage)})`,
        );

        // 8. 检测里程碑事件
        const milestoneEvents = detectMilestoneEvents(currentScore, newScore, previousStage, newStage);
        if (milestoneEvents.length > 0) {
          for (const event of milestoneEvents) {
            console.log(
              `[MilestoneAdjust] [${nickname}] 🎉 里程碑事件: ${event.description} (阈值: ${event.threshold_crossed})`,
            );
          }
        }

        // 9. 保存亲密度记录（upsert）
        // 注意：intimacy_records 表 schema 为 id, user_id, companion_id, score, milestone_stage, interaction_count, created_at
        // onConflict 使用 companion_id（每个 companion 唯一一条记录）
        const { error: upsertError } = await supabase
          .from('intimacy_records')
          .upsert({
            companion_id: companionId,
            user_id: userId,
            score: newScore,
            milestone_stage: newStage,
            interaction_count: convResult.messageCount,
          }, { onConflict: 'companion_id' });

        if (upsertError) {
          console.error(`[MilestoneAdjust] [${nickname}] 保存亲密度记录失败: ${upsertError.message}`);
          continue;
        }

        // 10. 如果有里程碑跨越，插入 companion_diaries 记录
        for (const event of milestoneEvents) {
          const diaryContent = `亲密度发生变化！当前阶段：${event.stage_to_name}（${newScore}分）。${event.description}`;
          const { error: diaryError } = await supabase
            .from('companion_diaries')
            .insert({
              companion_id: companionId,
              diary_date: now.toISOString().split('T')[0],
              content: diaryContent,
              emotion_tag: newScore > currentScore ? '开心' : '平淡',
            });

          if (diaryError) {
            console.error(`[MilestoneAdjust] [${nickname}] 保存里程碑日记失败: ${diaryError.message}`);
          } else {
            console.log(`[MilestoneAdjust] [${nickname}] 已记录里程碑日记: ${diaryContent}`);
          }
        }

        adjustedCount++;
        results.push({
          companion_id: companionId,
          nickname,
          old_score: currentScore,
          new_score: newScore,
          delta: totalDelta,
          stage_from: previousStage,
          stage_to: newStage,
          message_count: convResult.messageCount,
          ltm_memories: ltmResult.newMemoryCount,
          milestones: milestoneEvents.map((e) => e.description),
        });
      } catch (companionError) {
        console.error(
          `[MilestoneAdjust] [${nickname}] 处理伙伴时发生未预期错误:`,
          companionError instanceof Error ? companionError.message : String(companionError),
        );
        continue;
      }
    }

    const duration = Date.now() - startTime;
    const response = {
      adjusted: adjustedCount,
      total_companions: companions.length,
      duration_ms: duration,
      timestamp: now.toISOString(),
      details: results,
    };

    console.log(`[MilestoneAdjust] ===== 亲密度调整任务完成: ${adjustedCount}/${companions.length} 个伙伴已调整, 耗时 ${duration}ms =====`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MilestoneAdjust] 任务执行失败(耗时${duration}ms): ${errorMessage}`);
    return new Response(
      JSON.stringify({
        error: '亲密度调整任务执行失败',
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
