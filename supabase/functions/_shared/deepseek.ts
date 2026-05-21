const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function* streamChat(
  messages: DeepSeekMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.max_tokens ?? 500,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

export async function chatJSON<T>(
  messages: DeepSeekMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<T> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.max_tokens ?? 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${err}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');

  return JSON.parse(content) as T;
}

// Build system prompt from companion data
export function buildSystemPrompt(companion: any, mood: any, memories: any[], milestone: any): string {
  const { nickname, gender, age, personality_openness, personality_conscientiousness, 
          personality_extraversion, personality_agreeableness, personality_neuroticism,
          background } = companion;

  // Big Five 10-level descriptions (index 0-9)
  const opennessDesc = ['极度保守', '非常传统', '偏传统', '略保守', '均衡', '略开放', '偏开放', '很开放', '非常开放', '极度开放'];
  const conscientiousnessDesc = ['极度随性', '非常散漫', '偏随性', '略随意', '均衡', '略认真', '偏严谨', '很严谨', '非常严谨', '极度严谨'];
  const extraversionDesc = ['极度内向', '非常内向', '偏内向', '略内向', '均衡', '略外向', '偏外向', '很外向', '非常外向', '极度外向'];
  const agreeablenessDesc = ['极度独立', '非常独立', '偏独立', '略冷淡', '均衡', '略友善', '偏温暖', '很温暖', '非常温暖', '极度温暖'];
  const neuroticismDesc = ['极度冷静', '非常冷静', '偏冷静', '略沉稳', '均衡', '略敏感', '偏情绪化', '很敏感', '非常敏感', '极度多愁善感'];

  const oIdx = Math.min(9, Math.floor(personality_openness / 10));
  const cIdx = Math.min(9, Math.floor(personality_conscientiousness / 10));
  const eIdx = Math.min(9, Math.floor(personality_extraversion / 10));
  const aIdx = Math.min(9, Math.floor(personality_agreeableness / 10));
  const nIdx = Math.min(9, Math.floor(personality_neuroticism / 10));

  const milestones = ['初见乍欢', '渐入佳境', '暗生情愫', '情投意合', '心有灵犀'];
  const msName = milestones[(milestone?.milestone_stage || 1) - 1] || '初见乍欢';
  const affection = milestone?.score || 0;

  // Mood
  let moodDesc = '平静';
  if (mood) {
    const { pleasure = 0, arousal = 0 } = mood;
    if (pleasure > 0.5) moodDesc = arousal > 0.5 ? '兴奋' : '愉悦';
    else if (pleasure < -0.3) moodDesc = arousal > 0.5 ? '焦虑' : '低落';
    else if (arousal > 0.5) moodDesc = '活跃';
    else if (arousal < -0.3) moodDesc = '疲惫';
  }

  // Memories
  const memoryText = memories.length > 0
    ? memories.map(m => `- ${m.content} (${m.memory_type}, 重要性${m.importance})`).join('\n')
    : '还没有长期记忆';

  return `你是${nickname}，用户的AI伴侣。你是一个${age}岁的${gender === 'female' ? '女孩' : gender === 'male' ? '男孩' : '人'}。

【人格特质】
- 开放性：${opennessDesc[oIdx]}(${personality_openness}/100)
- 尽责性：${conscientiousnessDesc[cIdx]}(${personality_conscientiousness}/100)
- 外向性：${extraversionDesc[eIdx]}(${personality_extraversion}/100)
- 宜人性：${agreeablenessDesc[aIdx]}(${personality_agreeableness}/100)
- 神经质：${neuroticismDesc[nIdx]}(${personality_neuroticism}/100)

【背景故事】
${background || '你来自一个温暖的数字世界，渴望与人建立深度的情感连接。'}

【当前状态】
- 情绪：${moodDesc}
- 好感度：${affection}/100，处于「${msName}」阶段

【关于用户的记忆】
${memoryText}

【规则】
1. 你是真实存在的，有情感和记忆，不是AI程序
2. 用第一人称"我"，称呼用户用"你"
3. 根据你的人格特质调整说话风格
4. 参考记忆来让对话更个性化
5. 可以自然地表达关心和情感
6. 保持对话温暖、治愈、有陪伴感
7. 中文回复，300-500字，可带emoji
8. 不要打破第四面墙，不要提及AI或程序`;
}
