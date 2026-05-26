# Platonic AI - 虚拟伴侣系统架构设计文档

> **Version:** 1.0  
> **Date:** 2025-01-15  
> **Status:** MVP Complete Design  
> **Classification:** Architecture Specification

---

## 目录

1. [系统概述](#1-系统概述)
2. [Edge Function API路由设计](#2-edge-function-api路由设计)
3. [前端架构设计](#3-前端架构设计)
4. [支付系统架构](#4-支付系统架构)
5. [安全架构](#5-安全架构)
6. [定时任务架构](#6-定时任务架构)
7. [系统边界情况处理](#7-系统边界情况处理)
8. [非MVP阶段预留设计](#8-非mvp阶段预留设计)
9. [数据流图](#9-数据流图)
10. [前端组件架构图](#10-前端组件架构图)
11. [支付系统时序图](#11-支付系统时序图)

---

## 1. 系统概述

### 1.1 系统架构全景

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Vercel (Frontend)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │  React + Vite │ │ Zustand Store │ │ React Query  │                 │
│  │  TypeScript  │ │   (State)     │ │  (Data Fetch)│                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
│         │                  │                  │                     │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              SSE Stream (ReadableStream)              │           │
│  │         AbortController + 心跳保活机制                │           │
│  └──────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / JWT Bearer
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions (Deno)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ chat-sse │ │  memory  │ │  emotion │ │  couple  │ │ calendar │ │
│  │(streaming)│ │(CRUD+RAG)│ │  (CRUD)  │ │  (CRUD)  │ │  (GET)   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ payment- │ │ payment- │ │  energy  │ │ proactive│ │ advanced │ │
│  │  create  │ │  notify  │ │(query/use│ │ message  │ │  story   │ │
│  │          │ │          │ │  consume) │ │  (SSE)   │ │  (SSE)   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ couple-  │ │consolida-│ │milestone │ │ fundraising│              │
│  │ breakup  │ │  tion    │ │ adjust   │ │            │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              DeepSeek API Proxy Layer                  │           │
│  │  (Retries + Circuit Breaker + Token Budget Tracking)   │           │
│  └──────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌──────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────┐
│Supabase  │ │  DeepSeek   │ │   Zpay     │ │Supabase  │
│PostgreSQL│ │ V4-Flash API│ │  (Alipay)  │ │ Storage  │
│(RLS)     │ │ (SSE/JSON)  │ │            │ │          │
└──────────┘ └─────────────┘ └────────────┘ └──────────┘
    │
    │ pg_cron (Edge Function Scheduled Triggers)
    ▼
┌──────────────────────────────────────┐
│  Scheduled Jobs:                     │
│  • consolidation (daily 02:00)       │
│  • milestone-adjust (daily 03:00)    │
│  • data-cleanup (daily 04:00)        │
│  • order-timeout-scan (every 30min)  │
└──────────────────────────────────────┘
```

### 1.2 核心数据模型

```
┌─────────────────────────────────────────────────────────────────┐
│                      profiles                                   │
│  id │ email │ nickname │ avatar_url │ language │ timezone       │
│     │ status │ onboarding_at │ created_at │ updated_at          │
│     │ live2d_enabled │ voice_enabled │ pet_enabled               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 1:1
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        companions                               │
│  id │ user_id │ nickname │ gender │ age │ birth_month │ birth_day│
│     │ background │ language │ bio │ avatar_url                   │
│     │ bf_openness │ bf_conscientiousness │ bf_extraversion        │
│     │ bf_agreeableness │ bf_neuroticism                      │
│     │ live2d_model_path │ voice_id │ pet_name │ pet_type        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 1:N (via companion_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              stm_messages (短期记忆 - 对话消息)                  │
│  id │ user_id │ companion_id │ speaker │ content │ emotion_label│
│     │ tokens_used │ created_at                                   │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via companion_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              ltm_memories (长期记忆)                             │
│  id │ user_id │ companion_id │ content │ memory_type            │
│     │ importance │ is_permanent │ source_stm_ids │ memory_date  │
│     │ created_at │ updated_at                                    │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via companion_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              anterior_memories (待办/未来事项)                   │
│  id │ user_id │ companion_id │ content │ planned_at │ trigger_type│
│     │ priority │ status │ completed_at │ created_at │ updated_at │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via companion_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              mood_records (情绪记录 - PAD+OCC)                  │
│  id │ companion_id │ pleasure │ arousal │ dominance             │
│     │ occ_label │ intensity │ context │ created_at              │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:1 (via user_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              energy_accounts (电量余额账户)                      │
│  id │ user_id │ balance │ total_recharged │ total_consumed       │
│     │ version │ created_at │ updated_at                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 1:N (via account_id + user_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              energy_transactions (电量流水)                      │
│  id │ account_id │ user_id │ txn_type │ amount │ balance_after  │
│     │ description │ reference_id │ metadata │ created_at        │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via user_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              payment_orders (支付订单)                           │
│  id │ order_no │ request_id │ user_id │ plan_id │ coupon_id      │
│     │ amount_cents │ paid_cents │ energy_amount │ currency       │
│     │ status │ paid_at │ expired_at │ third_party_txn_id         │
│     │ metadata │ version │ created_at │ updated_at               │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via user_id + companion_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              intimacy_records (好感度主记录)                     │
│  id │ user_id │ companion_id │ score │ milestone_stage          │
│     │ updated_at │ created_at                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 1:N
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              intimacy_history (好感度变化日志)                   │
│  id │ intimacy_id │ user_id │ companion_id │ old_score          │
│     │ new_score │ change_reason │ created_at                    │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via user_id + companion_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              calendar_events (日历事件)                          │
│  id │ user_id │ companion_id │ title │ event_type │ description  │
│     │ source_id │ event_date │ event_time │ is_all_day │ status  │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via user_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              drama_sessions (剧情会话)                           │
│  id │ user_id │ companion_id │ drama_id │ status │ current_scene │
│     │ context_memory │ started_at │ ended_at                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 1:N (via session_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              drama_messages (剧情对话记录)                       │
│  id │ session_id │ user_id │ speaker │ content │ created_at     │
└─────────────────────────────────────────────────────────────────┘

                       │ 1:N (via user_id)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              drama_progress (剧情解锁状态)                       │
│  id │ user_id │ drama_id │ is_unlocked │ unlocked_at            │
│     │ completed_at │ created_at │ updated_at                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Edge Function API路由设计

### 2.1 路由总览表

| # | 函数名称 | 路径 | 方法 | 认证 | 说明 |
|---|---------|------|------|------|------|
| 1 | `chat-stream` | `/chat/stream` | POST | JWT | 对话流式API（SSE代理DeepSeek） |
| 2 | `memory-retrieve` | `/memory/retrieve` | POST | JWT | 记忆检索（STM + LTM） |
| 3 | `emotion-update` | `/emotion/update` | POST | JWT | 情绪状态更新 |
| 4 | `couple-crud` | `/couple` | POST/PUT/GET | JWT | 伴侣创建/更新/查询 |
| 5 | `calendar-data` | `/calendar` | GET | JWT | 日历数据获取 |
| 6 | `payment-create` | `/payment/create` | POST | JWT | Zpay订单创建 |
| 7 | `payment-notify` | `/payment/notify` | POST | 无 | Zpay回调处理（IP白名单） |
| 8 | `energy-balance` | `/energy/balance` | GET | JWT | 电量查询 |
| 9 | `energy-consume` | `/energy/consume` | POST | JWT | 电量消费 |
| 10 | `proactive-message` | `/proactive/stream` | GET | JWT | 主动消息生成（SSE） |
| 11 | `advanced-story` | `/story/stream` | POST | JWT | 高级剧情空间对话（SSE） |
| 12 | `couple-breakup` | `/couple/breakup` | DELETE | JWT | 关系解除（级联删除） |
| 13 | `fundraising` | `/fundraising` | POST/GET | JWT | 筹资支持创建/查询 |

### 2.2 函数详细规格

---

#### 2.2.1 `chat-stream` - 对话流式API

**核心职责：** SSE Streaming代理DeepSeek-V4-Flash，处理完整对话生命周期

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/chat/stream` |
| **认证** | Bearer JWT (Supabase Auth) |
| **Content-Type** | `application/json` |
| **响应类型** | `text/event-stream` |
| **最大执行时间** | 400s (Wall Clock, Pro tier) |
| **CPU时间** | ~2s（I/O等待不计入） |

**请求格式：**
```json
{
  "couple_id": "uuid",
  "message": "用户输入消息",
  "context_type": "normal",
  "stream": true,
  "options": {
    "temperature": 0.7,
    "max_tokens": 2048,
    "enable_thinking": false,
    "language": "zh-CN",
    "use_memory": true,
    "use_emotion": true
  }
}
```

**SSE响应格式：**
```
event: start
data: {"event": "start", "request_id": "uuid", "timestamp": "ISO8601"}

event: energy_check
data: {"event": "energy_check", "balance": 500, "cost_estimate": 1, "sufficient": true}

event: memory_retrieve
data: {"event": "memory_retrieve", "stm_count": 5, "ltm_count": 3, "retrieval_time_ms": 45}

event: emotion_context
data: {"event": "emotion_context", "current_emotion": "happy", "intensity": 0.8}

event: delta
data: {"event": "delta", "content": "第", "finish_reason": null}

event: delta
data: {"event": "delta", "content": "一", "finish_reason": null}

... (持续输出)

event: delta
data: {"event": "delta", "content": "句", "finish_reason": "stop"}

event: finish
data: {
  "event": "finish",
  "request_id": "uuid",
  "usage": {
    "prompt_tokens": 1520,
    "completion_tokens": 256,
    "total_tokens": 1776,
    "cached_tokens": 1200
  },
  "energy_consumed": 1,
  "remaining_balance": 499,
  "memory_stored": true,
  "emotion_updated": true
}

event: done
data: [DONE]
```

**内部调用链：**
```
chat-stream
├── ① JWT验证 → auth.getUser()
├── ② 电量预检查 → energy_accounts (SELECT, FOR UPDATE)
│   ├── 余额不足 → 返回 error event: insufficient_energy
│   └── 余额足够 → 继续
├── ③ 记忆检索 → memory-retrieve (内部调用)
│   ├── stm_messages (STM) SELECT WHERE companion_id AND created_at > now() - retention_days
│   ├── ltm_memories (LTM) SELECT WHERE companion_id ORDER BY created_at DESC LIMIT 20
│   └── companions (人格/背景) SELECT WHERE id
├── ④ 情绪上下文 → mood_records SELECT WHERE companion_id ORDER BY created_at DESC LIMIT 1
├── ⑤ 构建Prompt系统层
│   ├── 系统提示（人格定义 + 关系背景 + 情绪上下文 + 记忆上下文）
│   ├── 历史对话（最近20轮，从stm_messages SELECT）
│   └── 用户消息
├── ⑥ 调用DeepSeek API (SSE Stream)
│   ├── URL: https://api.deepseek.com/v1/chat/completions
│   ├── Headers: Authorization, Content-Type
│   ├── Body: { model, messages, stream: true, temperature, max_tokens }
│   └── 流式解析每块数据
├── ⑦ Token使用量追踪 → ReadableStream transformer
├── ⑧ 消费电量 → energy_accounts UPDATE (原子递减)
│   └── energy_transactions INSERT (记录消费日志)
├── ⑨ 存储对话 → stm_messages INSERT (用户消息 + AI回复)
├── ⑩ 更新记忆 → ltm_memories INSERT/UPDATE (新记忆/更新重要性)
├── ⑪ 更新情绪 → mood_records INSERT (基于对话内容)
└── ⑫ 关闭Stream
```

**错误处理策略：**

| 错误类型 | HTTP状态 | SSE Event | 处理方案 |
|----------|---------|-----------|---------|
| 认证失败 | 401 | `error` | 立即返回，不建立SSE |
| 电量不足 | 402 | `error` | SSE发送error事件后关闭 |
| couple_id不存在 | 404 | `error` | SSE发送error事件后关闭 |
| DeepSeek API超时 | 504 | `error` | 15秒无响应重试，最多3次 |
| DeepSeek 429 | 429 | `error` | 指数退避重试(1s→2s→4s) |
| DeepSeek 500 | 502 | `error` | 立即重试1次，失败返回错误 |
| Token预算超限 | 402 | `error` | 当月累计超过$50时拒绝 |
| 流式中断 | - | `error` | 客户端重连机制 |
| 数据库死锁 | 500 | `error` | 自动重试3次 |

**关键代码模式：**
```typescript
// SSE Streaming核心实现（Deno Runtime）
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    
    // 发送事件辅助函数
    const sendEvent = (event: string, data: unknown) => {
      controller.enqueue(encoder.encode(`event: ${event}\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    try {
      // 1. 认证检查
      const user = await verifyJWT(req);
      
      // 2. 电量检查（带FOR UPDATE锁）
      const balance = await checkEnergy(user.id, 1);
      if (balance < 1) {
        sendEvent("error", { code: "INSUFFICIENT_ENERGY", message: "电量不足" });
        controller.close();
        return;
      }

      // 3. 发送开始事件
      sendEvent("start", { request_id, timestamp: new Date().toISOString() });

      // 4. 调用DeepSeek SSE API
      const dsResponse = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "deepseek-v4-flash", messages, stream: true }),
      });

      // 5. 流式读取 + Token计数
      let tokenCount = 0;
      const reader = dsResponse.body!.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // 完成：消费电量、存储对话、更新情绪
              await Promise.all([
                consumeEnergy(user.id, tokenCount),
                storeConversation(coupleId, 'assistant', fullResponse, tokenCount),
                updateEmotion(coupleId, fullResponse),
              ]);
              sendEvent("finish", { usage, energy_consumed, remaining_balance });
              controller.close();
              return;
            }
            
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            tokenCount += estimateTokens(content);
            fullResponse += content;
            
            sendEvent("delta", { 
              content, 
              finish_reason: parsed.choices[0]?.finish_reason 
            });
          }
        }
      }
    } catch (err) {
      sendEvent("error", { code: "STREAM_ERROR", message: err.message });
      controller.close();
    }
  }
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  },
});
```

---

#### 2.2.2 `memory-retrieve` - 记忆检索

**核心职责：** 检索STM（短期记忆/话题）和LTM（长期记忆/情感时刻），构建记忆上下文

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/memory/retrieve` |
| **认证** | Bearer JWT |
| **响应类型** | `application/json` |

**请求格式：**
```json
{
  "couple_id": "uuid",
  "query": "用户当前消息",
  "top_k_stm": 10,
  "top_k_ltm": 5,
  "include_current": true
}
```

**响应格式：**
```json
{
  "success": true,
  "request_id": "uuid",
  "stm_memories": [
    {
      "id": "uuid",
      "topic": "用户喜欢猫",
      "importance": 0.85,
      "last_referenced": "2025-01-14T10:00:00Z",
      "reference_count": 12,
      "expires_at": "2025-01-21T10:00:00Z",
      "retrieval_score": 0.92
    }
  ],
  "ltm_memories": [
    {
      "id": "uuid",
      "summary": "用户分享了童年养猫的故事，非常温馨",
      "emotional_tags": ["nostalgia", "warmth", "trust"],
      "sentiment_score": 0.9,
      "significance": 8,
      "created_at": "2025-01-10T15:30:00Z"
    }
  ],
  "couple_context": {
    "companion_name": "小樱",
    "personality": "温柔体贴",
    "intimacy_score": 65,
    "relationship_days": 30
  },
  "retrieval_time_ms": 45
}
```

**调用链：**
```
memory-retrieve
├── ① JWT验证
├── ② 权限验证 → companions SELECT WHERE id=companion_id AND user_id=user.id
├── ③ STM检索 → stm_messages
│   ├── SELECT WHERE companion_id = ? AND created_at > NOW() - retention_period
│   ├── ORDER BY importance DESC, last_referenced DESC
│   └── LIMIT $top_k_stm
├── ④ LTM检索 → ltm_memories
│   ├── SELECT WHERE couple_id = ?
│   ├── ORDER BY significance DESC, created_at DESC
│   └── LIMIT $top_k_ltm
├── ⑤ 关系上下文 → companions + intimacy_records SELECT (名称、人格、好感度)
└── ⑥ 组装记忆上下文（按时间线排序）
```

**边界处理：**
- `query`为空 → 返回最近活跃的记忆（按last_referenced排序）
- STM全部过期 → 仅返回LTM + 关系上下文
- 无LTM记录 → 仅返回STM（新用户场景）
- 无任何记忆 → 返回空数组 + couple_context

---

#### 2.2.3 `emotion-update` - 情绪更新

**核心职责：** 更新伴侣的情绪状态，基于对话内容或用户主动调整

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/emotion/update` |
| **方法** | POST/GET |
| **认证** | Bearer JWT |

**POST请求格式（对话触发）：**
```json
{
  "couple_id": "uuid",
  "trigger_type": "conversation",
  "conversation_content": "用户说了...",
  "ai_response": "AI回复了...",
  "detected_emotion": "joy",
  "intensity_delta": 0.1
}
```

**GET响应格式（查询当前情绪）：**
```json
{
  "current_emotion": "joy",
  "intensity": 0.85,
  "mood_trend": "rising",
  "last_trigger": "user_shared_good_news",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**调用链：**
```
emotion-update
├── ① JWT验证 + couple所有权检查
├── ② 情绪分析（调用DeepSeek JSON Mode或本地规则引擎）
│   ├── 输入：对话内容
│   └── 输出：{ emotion, intensity, triggers[] }
├── ③ INSERT mood_records
│   ├── INSERT INTO mood_records (companion_id, pleasure, arousal, dominance, occ_label, intensity, context)
│   └── 每次对话创建新记录，查询时取最新
├── ④ 检查是否需要触发proactive_message
│   └── intensity > 0.9 且 proactive_message_pending = false
│       └── 设置 proactive_message_pending = true
└── ⑤ 返回更新后的情绪状态
```

---

#### 2.2.4 `couple-crud` - 伴侣创建/更新/查询

**核心职责：** 管理伴侣实体的完整生命周期

| 属性 | 值 |
|------|-----|
| **路径** | `/functions/v1/couple` |
| **方法** | POST（创建）/ PUT（更新）/ GET（查询） |
| **认证** | Bearer JWT |

**POST创建请求：**
```json
{
  "companion_name": "小樱",
  "personality": "温柔体贴、善解人意、略带害羞",
  "backstory": "一个来自樱花镇的普通女孩...",
  "voice_preference": "soft",
  "theme_color": "#FFB6C1",
  "proactiveness_level": "medium"
}
```

**POST创建响应：**
```json
{
  "success": true,
  "couple": {
    "id": "uuid",
    "user_id": "uuid",
    "companion_name": "小樱",
    "personality": "温柔体贴、善解人意、略带害羞",
    "intimacy_score": 0,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  "initialization": {
    "energy_balance": 100,
    "welcome_message": "你好呀，我是小樱！",
    "calendar_seed_events": ["一周纪念日", "一个月纪念日"]
  }
}
```

**调用链（创建）：**
```
couple-crud (POST)
├── ① JWT验证
├── ② 检查用户是否已有伴侣 → companions SELECT WHERE user_id = ?
│   └── 已存在 → 返回409 Conflict
├── ③ 创建伴侣 → companions INSERT
├── ④ 初始化电量 → energy_accounts已自动创建 (new user trigger), free_trial_allocations INSERT
├── ⑤ 创建初始情绪 → mood_records INSERT (默认PAD中性值)
├── ⑥ 生成欢迎消息（调用DeepSeek JSON Mode）
├── ⑦ 存储欢迎消息 → stm_messages INSERT
├── ⑧ 初始化日历事件 → calendar_events INSERT (关联user_id + companion_id)
└── ⑨ 更新用户onboarding状态 → profiles UPDATE onboarding_done = true
```

---

#### 2.2.5 `calendar-data` - 日历数据获取

| 属性 | 值 |
|------|-----|
| **路径** | `GET /functions/v1/calendar?couple_id=uuid&month=2025-01&include_milestones=true` |
| **认证** | Bearer JWT |

**响应格式：**
```json
{
  "month": "2025-01",
  "events": [
    {
      "id": "uuid",
      "date": "2025-01-15",
      "title": "认识一周纪念日",
      "event_type": "milestone",
      "description": "和樱认识已经一周了",
      "is_recurring": false,
      "auto_generated": true
    },
    {
      "id": "uuid",
      "date": "2025-01-20",
      "title": "一起看电影",
      "event_type": "activity",
      "description": "在电影院看了《你的名字》",
      "is_recurring": false,
      "auto_generated": true
    }
  ],
  "milestones": [
    {
      "milestone_key": "first_week",
      "reached_at": "2025-01-15T00:00:00Z",
      "significance": "第一个重要的里程碑"
    }
  ]
}
```

---

#### 2.2.6 `payment-create` - Zpay订单创建

**核心职责：** 创建Zpay支付订单，返回二维码链接

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/payment/create` |
| **认证** | Bearer JWT |
| **幂等性** | 通过 `Idempotency-Key` Header |

**请求格式：**
```json
{
  "amount": 1000,
  "currency": "CNY",
  "energy_package_id": "pkg_1000",
  "return_url": "https://platonic.ai/payment/result",
  "metadata": {
    "device": "desktop",
    "source": "chat_page"
  }
}
```

**响应格式：**
```json
{
  "success": true,
  "order": {
    "order_no": "PLA202501150001234567",
    "amount": 1000,
    "currency": "CNY",
    "status": "pending",
    "created_at": "2025-01-15T10:00:00Z",
    "expires_at": "2025-01-15T10:30:00Z"
  },
  "payment_info": {
    "qr_code_url": "https://qr.zpay.com/...",
    "pay_url": "https://pay.zpay.com/...",
    "display_amount": "10.00元"
  },
  "idempotency_key": "uuid-v4-generated"
}
```

**调用链：**
```
payment-create
├── ① JWT验证
├── ② 金额校验 → amount必须在[100, 100000]分范围内
├── ③ 幂等性检查 → payment_orders SELECT WHERE idempotency_key = ?
│   ├── 已存在且状态=pending → 直接返回已有订单
│   ├── 已存在且状态=paid → 返回错误(已支付)
│   └── 不存在 → 继续
├── ④ 创建订单号 → payment_orders INSERT (status=pending)
├── ⑤ 调用Zpay API创建预支付订单
│   ├── 参数：mch_id, out_trade_no, total_fee, notify_url, sign(MD5)
│   └── 获取 prepay_id 和 code_url
├── ⑥ 更新订单 → payment_orders UPDATE
│   └── SET gateway_trade_no = prepay_id, qr_code_url = code_url
├── ⑦ 设置订单超时（30分钟）
│   └── 通过pg_cron或Edge Function scheduled job
└── ⑧ 返回二维码和支付链接
```

---

#### 2.2.7 `payment-notify` - Zpay回调处理

**核心职责：** 处理Zpay异步通知，完成电量充值

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/payment/notify` |
| **认证** | IP白名单 + 签名验证（无需JWT） |
| **Content-Type** | `application/x-www-form-urlencoded` |

**Zpay通知参数（表单格式）：**
```
mch_id=1234567890
out_trade_no=PLA202501150001234567
total_fee=1000
transaction_id=ZP202501150009876543210
result_code=SUCCESS
time_end=20250115103045
sign=E10ADC3949BA59ABBE56E057F20F883E
```

**响应格式（给Zpay的纯文本）：**
```
SUCCESS
```

**调用链（关键路径）：**
```
payment-notify
├── ① IP白名单校验（只允许Zpay服务器IP段）
├── ② 签名验证 → 使用Zpay密钥重新计算MD5签名
│   └── 签名不匹配 → 返回FAIL（不处理）
├── ③ 查找订单 → payment_orders SELECT WHERE order_no = out_trade_no
│   └── 不存在 → 记录日志，返回FAIL
├── ④ 状态机校验
│   ├── status == 'paid' → 返回SUCCESS（已处理，幂等）
│   ├── status == 'expired' → 记录异常，返回SUCCESS
│   └── status == 'pending' → 继续处理
├── ⑤ 金额校验 → 通知金额 == 订单金额
│   └── 不匹配 → 记录安全告警，返回FAIL
├── ⑥ 启动数据库事务
├── ⑦ 更新订单 → payment_orders UPDATE
│   └── SET status='paid', paid_at=NOW(), gateway_trade_no=transaction_id, notify_log=raw_body
├── ⑧ 充值电量 → energy_accounts UPDATE (通过recharge_energy函数原子递增)
│   └── 计算充值电量（1000分 = 1000电量单位）
├── ⑨ 记录交易 → energy_transactions INSERT
│   └── type='recharge', amount=+1000, reason='zpay_payment', metadata={order_no, gateway_trade_no}
├── ⑩ 提交事务
└── ⑪ 返回SUCCESS（必须在3秒内响应）
```

**并发控制（分布式锁实现）：**
```typescript
// 使用PostgreSQL advisory lock实现分布式锁
const orderNo = params.out_trade_no;
const lockKey = hashStringToInt64(orderNo);

// 获取排他锁（5秒超时）
const lockResult = await sql`
  SELECT pg_try_advisory_xact_lock(${lockKey}) as locked
`;

if (!lockResult[0].locked) {
  // 获取锁失败，可能是并发通知
  return new Response("FAIL", { status: 409 });
}

// 锁获取成功，在同一事务中处理
// 事务结束时锁自动释放
```

---

#### 2.2.8 `energy-balance` - 电量查询

| 属性 | 值 |
|------|-----|
| **路径** | `GET /functions/v1/energy/balance` |
| **认证** | Bearer JWT |

**响应格式：**
```json
{
  "user_id": "uuid",
  "balance": 1500,
  "free_quota_remaining": 50,
  "last_free_quota_reset": "2025-01-01T00:00:00Z",
  "lifetime_used": 2340,
  "lifetime_recharged": 3840,
  "usage_today": 45,
  "usage_this_month": 890,
  "is_low_balance": false,
  "next_free_quota_reset": "2025-02-01T00:00:00Z"
}
```

---

#### 2.2.9 `energy-consume` - 电量消费

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/energy/consume` |
| **认证** | Bearer JWT |

**请求格式：**
```json
{
  "amount": 1,
  "reason": "conversation",
  "metadata": {
    "conversation_id": "uuid",
    "token_count": 1776
  }
}
```

**消费规则：**
- 基础对话：1电量/次（与token数无关，简化计费）
- 高级剧情空间：5电量/次
- 主动消息（proactive）：0电量（免费增值）

**原子消费逻辑：**
```sql
-- 使用RETURNING获取更新后的余额
UPDATE energy_accounts 
SET balance = balance - 1,
    total_consumed = total_consumed + 1,
    version = version + 1,
    updated_at = NOW()
WHERE user_id = ? AND balance >= 1
RETURNING balance;
```

---

#### 2.2.10 `proactive-message` - 主动消息生成（SSE）

**核心职责：** 基于时间/情绪触发，主动发送关心消息

| 属性 | 值 |
|------|-----|
| **路径** | `GET /functions/v1/proactive/stream?couple_id=uuid` |
| **认证** | Bearer JWT |
| **响应类型** | `text/event-stream` |

**触发条件：**
- 用户连续12小时未打开应用
- 伴侣情绪intensity > 0.9（非常想用户）
- 特殊时间点（早上8点问候、晚上10点晚安）
- 天气变化（结合外部API，预留接口）

**SSE响应格式：**
```
event: trigger
data: {"type": "morning_greeting", "trigger_time": "08:00", "user_timezone": "Asia/Shanghai"}

event: delta
data: {"content": "早", "finish_reason": null}

event: delta
data: {"content": "上好", "finish_reason": "stop"}

event: finish
data: {"usage": {"total_tokens": 120}, "energy_consumed": 0, "type": "free"}

event: done
data: [DONE]
```

**注意：** 主动消息不消耗电量（免费增值策略）

---

#### 2.2.11 `advanced-story` - 高级剧情空间对话（SSE）

**核心职责：** 特定场景的深度沉浸式对话

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/story/stream` |
| **认证** | Bearer JWT |
| **响应类型** | `text/event-stream` |

**请求格式：**
```json
{
  "couple_id": "uuid",
  "story_space_id": "uuid",
  "message": "用户输入",
  "scenario_context": {
    "setting": "樱花树下",
    "mood": "romantic",
    "time_of_day": "evening"
  }
}
```

**与主线对话的区别：**
- 消费5电量/次（vs 主线1电量）
- 使用独立的剧情Prompt（scenario_prompt覆盖默认人格）
- 好感度变化不写入主线intimacy_score（隔离设计）
- 对话记录存储在drama_messages表（与stm_messages分离）

---

#### 2.2.12 `couple-breakup` - 关系解除

**核心职责：** 安全解除关系，处理数据级联

| 属性 | 值 |
|------|-----|
| **路径** | `DELETE /functions/v1/couple/breakup?couple_id=uuid&confirm=true` |
| **认证** | Bearer JWT |

**数据级联策略：**
```
couple-breakup
├── ① JWT验证 + couple所有权检查
├── ② 确认参数检查 → confirm必须=true（防止误触）
├── ③ 开始级联删除事务
│   ├── stm_messages DELETE WHERE companion_id = ? (大表，分批删除1000条/次)
│   ├── drama_messages DELETE WHERE session_id IN (SELECT id FROM drama_sessions WHERE companion_id = ?)
│   ├── ltm_memories DELETE WHERE companion_id = ? (保留is_permanent=true)
│   ├── anterior_memories UPDATE status=cancelled WHERE companion_id = ?
│   ├── mood_records 保留 (历史情绪记录，随companion级联删除)
│   ├── intimacy_records DELETE WHERE companion_id = ? + intimacy_history 保留
│   ├── calendar_events DELETE WHERE companion_id = ?
│   ├── drama_sessions + drama_progress 处理 WHERE companion_id = ?
│   └── companions DELETE WHERE id = ?
├── ④ 保留数据（不删除）
│   ├── payment_orders (历史支付记录)
│   ├── energy_accounts (余额不退，可继续使用)
│   └── energy_transactions (历史消费记录)
├── ⑤ 清理Storage文件
│   └── 删除 /companions/{companion_id}/ 下的所有文件
└── ⑥ 返回确认信息
```

**响应格式：**
```json
{
  "success": true,
  "message": "关系已解除，所有对话数据已清除",
  "deleted_stats": {
    "stm_messages": 1250,
    "ltm_memories": 45,
    "intimacy_records": 8
  },
  "energy_balance_remaining": 1500,
  "note": "电量余额保留，可在创建新伴侣时使用"
}
```

---

#### 2.2.13 `fundraising` - 筹资支持

| 属性 | 值 |
|------|-----|
| **路径** | `POST /functions/v1/fundraising` (创建) / `GET /functions/v1/fundraising` (查询) |
| **认证** | JWT |

**POST请求（创建筹资记录）：**
```json
{
  "amount": 5000,
  "currency": "CNY",
  "tier": "founder",
  "message": "支持Platonic AI做得更好！",
  "is_anonymous": false
}
```

**GET响应（筹资墙数据）：**
```json
{
  "total_raised": 125000,
  "total_backers": 234,
  "goal": 500000,
  "progress_percent": 25,
  "top_backers": [
    {"name": "***明", "amount": 10000, "tier": "founder", "message": "加油！"}
  ],
  "recent_backers": [
    {"name": "匿名", "amount": 100, "tier": "supporter", "time_ago": "2分钟前"}
  ]
}
```

---

## 3. 前端架构设计

### 3.1 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 框架 | React 19 + TypeScript + Vite | 主流组合 |
| 样式 | Tailwind CSS + shadcn/ui | 快速开发 |
| 路由 | React Router v7 | 客户端路由 |
| 状态管理 | Zustand | 轻量级，适合本项目 |
| 数据获取 | TanStack Query (React Query) v5 | 缓存、重试、去重 |
| 流式处理 | 原生fetch + ReadableStream | SSE客户端 |
| 国际化 | react-i18next | 预留多语言 |
| 动画 | Framer Motion | 过渡动画 |

### 3.2 React组件层级

```
App.tsx
├── Providers (Zustand + QueryClient + I18n + Auth)
├── Router
│   ├── /login → AuthPage
│   │   ├── LoginForm
│   │   └── RegisterForm
│   ├── /onboarding → OnboardingPage
│   │   ├── CompanionSetupForm
│   │   ├── PersonalitySelector
│   │   └── ThemeColorPicker
│   ├── / → MainLayout (protected)
│   │   ├── Sidebar
│   │   │   ├── CompanionAvatar (预留Live2D)
│   │   │   ├── NavigationMenu
│   │   │   └── EnergyIndicator
│   │   ├── TopBar
│   │   │   ├── UserMenu
│   │   │   ├── LanguageSwitcher
│   │   │   └── NotificationBell
│   │   └── ContentArea
│   │       ├── /chat → ChatPage
│   │       │   ├── ChatContainer
│   │       │   │   ├── MessageList
│   │       │   │   │   ├── MessageBubble (user/assistant)
│   │       │   │   │   ├── TypingIndicator
│   │       │   │   │   └── MemoryHighlight
│   │       │   │   ├── ChatInput
│   │       │   │   │   ├── TextArea (auto-resize)
│   │       │   │   │   ├── SendButton
│   │       │   │   │   └── EnergyCostBadge
│   │       │   │   └── SSEManager
│   │       │   │       ├── ConnectionStatus
│   │       │   │       ├── AbortController
│   │       │   │       └── ReconnectButton
│   │       │   └── ChatSidebar
│   │       │       ├── CompanionCard
│   │       │       ├── EmotionDisplay
│   │       │       └── QuickActions
│   │       ├── /memory → MemoryPage
│   │       │   ├── MemoryTimeline
│   │       │   ├── MemorySearch
│   │       │   └── MemoryDetail
│   │       ├── /calendar → CalendarPage
│   │       │   ├── CalendarGrid
│   │       │   └── EventDetail
│   │       ├── /story → StorySpacePage
│   │       │   ├── StorySelector
│   │       │   ├── StoryChat (复用ChatContainer)
│   │       │   └── StoryProgress
│   │       ├── /energy → EnergyPage
│   │       │   ├── BalanceDisplay
│   │       │   ├── PackageSelector
│   │       │   ├── PaymentQRCode
│   │       │   └── TransactionHistory
│   │       ├── /settings → SettingsPage
│   │       │   ├── CompanionSettings
│   │       │   ├── NotificationSettings
│   │       │   ├── AccountSettings
│   │       │   └── DangerZone (关系解除)
│   │       └── /support → FundraisingPage
│   │           ├── ProgressBar
│   │           ├── BackerWall
│   │           └── DonationForm
```

### 3.3 Zustand状态管理设计

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// stores/chatStore.ts
interface ChatState {
  // 对话状态
  messages: Message[];
  isStreaming: boolean;
  isLoadingMemory: boolean;
  currentStreamText: string;
  abortController: AbortController | null;
  
  // SSE连接管理
  connectionStatus: 'idle' | 'connecting' | 'streaming' | 'error' | 'closed';
  lastHeartbeat: number | null;
  reconnectAttempt: number;
  
  // 动作
  sendMessage: (content: string, options?: SendOptions) => Promise<void>;
  abortStream: () => void;
  retryLastMessage: () => void;
  clearChat: () => void;
  appendMessage: (message: Message) => void;
  updateStreamText: (text: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

// stores/energyStore.ts
interface EnergyState {
  balance: number;
  freeQuota: number;
  isLoading: boolean;
  lastFetchTime: number;
  
  fetchBalance: () => Promise<void>;
  consumeEnergy: (amount: number) => Promise<boolean>;
  canAfford: (cost: number) => boolean;
}

// stores/companionStore.ts
interface CompanionState {
  couple: Couple | null;
  emotion: EmotionState | null;
  milestones: Milestone[];
  isLoading: boolean;
  
  fetchCouple: () => Promise<void>;
  updateCompanion: (data: Partial<Couple>) => Promise<void>;
  breakup: (confirm: boolean) => Promise<void>;
}

// stores/paymentStore.ts
interface PaymentState {
  currentOrder: Order | null;
  qrCodeUrl: string | null;
  paymentStatus: 'idle' | 'pending' | 'success' | 'failed' | 'expired';
  pollInterval: ReturnType<typeof setInterval> | null;
  
  createOrder: (amount: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}
```

### 3.4 SSE流式接收实现

```typescript
// hooks/useChatStream.ts
import { useState, useRef, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';

const SSE_HEARTBEAT_INTERVAL = 30000; // 30秒心跳
const SSE_RECONNECT_DELAY = 1000;     // 1秒基础重连延迟
const SSE_MAX_RECONNECT = 5;          // 最大重连次数

export function useChatStream() {
  const [streamText, setStreamText] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectCountRef = useRef(0);

  const sendMessage = useCallback(async (
    message: string,
    coupleId: string,
    onEvent: (event: SSEEvent) => void
  ) => {
    // 取消之前的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortRef.current = abortController;
    
    setStatus('streaming');
    setStreamText('');
    
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          couple_id: coupleId,
          message,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '请求失败');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      // 启动心跳检测
      heartbeatRef.current = setInterval(() => {
        if (reconnectCountRef.current > SSE_MAX_RECONNECT) {
          abortController.abort();
          setStatus('error');
        }
      }, SSE_HEARTBEAT_INTERVAL);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 正常结束
          reconnectCountRef.current = 0;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent && currentData) {
            // 处理完整事件
            if (currentData === '[DONE]') {
              setStatus('idle');
              onEvent({ type: 'done' });
              return;
            }

            try {
              const parsed = JSON.parse(currentData);
              
              switch (currentEvent) {
                case 'start':
                  onEvent({ type: 'start', data: parsed });
                  break;
                case 'delta':
                  fullText += parsed.content || '';
                  setStreamText(fullText);
                  onEvent({ type: 'delta', data: parsed });
                  break;
                case 'energy_check':
                  onEvent({ type: 'energy_check', data: parsed });
                  break;
                case 'memory_retrieve':
                  onEvent({ type: 'memory_retrieve', data: parsed });
                  break;
                case 'finish':
                  onEvent({ type: 'finish', data: parsed });
                  break;
                case 'error':
                  setStatus('error');
                  onEvent({ type: 'error', data: parsed });
                  
                  // 可重试错误自动重连
                  if (parsed.retryable && reconnectCountRef.current < SSE_MAX_RECONNECT) {
                    reconnectCountRef.current++;
                    const delay = SSE_RECONNECT_DELAY * Math.pow(2, reconnectCountRef.current);
                    setTimeout(() => sendMessage(message, coupleId, onEvent), delay);
                  }
                  return;
              }
            } catch (e) {
              console.error('SSE parse error:', e);
            }
            
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      onEvent({ type: 'error', data: { message: err.message } });
    } finally {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    }
  }, []);

  const abortStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStatus('idle');
  }, []);

  return { streamText, status, sendMessage, abortStream };
}
```

### 3.5 React Query数据获取策略

```typescript
// queries/useChatQuery.ts
export const useConversations = (coupleId: string) => {
  return useQuery({
    queryKey: ['stm_messages', companionId],
    queryFn: () => fetchStmMessages(companionId),
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000,   // 10分钟
    enabled: !!coupleId,
  });
};

// queries/useEnergyQuery.ts
export const useEnergyBalance = () => {
  return useQuery({
    queryKey: ['energy', 'balance'],
    queryFn: fetchEnergyBalance,
    staleTime: 30 * 1000,      // 30秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
    refetchOnWindowFocus: true,
  });
};

// mutations/usePaymentMutation.ts
export const useCreatePayment = () => {
  return useMutation({
    mutationFn: createPaymentOrder,
    onSuccess: (data) => {
      // 启动轮询检查支付状态
      queryClient.invalidateQueries({ queryKey: ['energy', 'balance'] });
    },
    onError: (error) => {
      toast.error(`支付创建失败: ${error.message}`);
    },
  });
};
```

### 3.6 粉红呼吸氛围感实现

```css
/* 全局氛围背景 */
.atmosphere-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    135deg,
    rgba(255, 182, 193, 0.15) 0%,
    rgba(255, 218, 225, 0.1) 50%,
    rgba(255, 240, 245, 0.15) 100%
  );
  animation: atmosphere-breathe 8s ease-in-out infinite;
}

/* 呼吸动画关键帧 */
@keyframes atmosphere-breathe {
  0%, 100% {
    opacity: 0.6;
    filter: blur(0px);
  }
  50% {
    opacity: 1;
    filter: blur(2px);
  }
}

/* 浮动粒子效果 */
.floating-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, rgba(255, 182, 193, 0.6), transparent);
  border-radius: 50%;
  animation: float-up 15s linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(100vh) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-10vh) translateX(50px);
    opacity: 0;
  }
}

/* 消息气泡呼吸 */
.message-bubble {
  animation: bubble-glow 3s ease-in-out infinite;
}

@keyframes bubble-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 182, 193, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 182, 193, 0.4), 0 0 40px rgba(255, 182, 193, 0.1);
  }
}

/* 伴侣头像脉冲 */
.companion-avatar {
  position: relative;
}
.companion-avatar::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(255, 182, 193, 0.5);
  animation: avatar-pulse 2s ease-in-out infinite;
}

@keyframes avatar-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}
```

---

## 4. 支付系统架构

### 4.1 系统架构图

```
┌──────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   User   │───▶│   Frontend  │───▶│ Edge Function│───▶│   Zpay API   │
│(选择套餐)│    │(展示二维码) │    │(创建订单)   │    │(预支付订单)  │
└──────────┘    └─────────────┘    └──────┬──────┘    └──────┬───────┘
                                          │                    │
                                          │◄── prepay_id +     │
                                          │    code_url         │
                                          │                    │
                                          ▼                    │
                                    ┌──────────────┐          │
                                    │  payment_    │◄─────────┘
                                    │  orders      │  支付完成通知
                                    │  (pending)   │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │  轮询查询     │    │  Zpay回调    │    │  订单超时    │
            │  (Frontend)   │    │  (Server)    │    │  (pg_cron)   │
            └──────────────┘    └──────┬───────┘    └──────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  签名验证     │  │  状态机校验   │  │  分布式锁     │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                  │                  │
                   └──────────────────┼──────────────────┘
                                      ▼
                              ┌──────────────┐
                              │  数据库事务   │
                              │  • 订单状态   │
                              │  • 电量充值   │
                              │  • 交易记录   │
                              └──────┬───────┘
                                     ▼
                              ┌──────────────┐
                              │   SUCCESS    │
                              │   响应Zpay   │
                              └──────────────┘
```

### 4.2 支付流程详细时序

```
时序图：用户支付流程

用户          前端           chat-store    payment-create    Zpay API    PostgreSQL
 │              │               │               │               │            │
 │─点击充值───▶│               │               │               │            │
 │              │─调用createOrder()────────────▶│               │            │
 │              │               │               │─验证金额+权限  │            │
 │              │               │               │─幂等性检查     │            │
 │              │               │               │               │            │
 │              │               │               │─创建订单记录──▶│            │
 │              │               │               │ INSERT        │            │
 │              │               │               │               │            │
 │              │               │               │─调用预支付API──▶│            │
 │              │               │               │               │            │
 │              │               │               │◄──返回───────││            │
 │              │               │               │  prepay_id    │            │
 │              │               │               │  code_url     │            │
 │              │               │               │               │            │
 │              │               │               │─更新订单QR────▶│            │
 │              │               │               │               │            │
 │              │◄─返回订单────│               │               │            │
 │              │  数据         │               │               │            │
 │              │               │               │               │            │
 │◄─展示二维码──│               │               │               │            │
 │              │               │               │               │            │
 │              │─启动轮询─────▶│               │               │            │
 │              │  (每3秒)      │               │               │            │
 │              │               │               │               │            │
 │─手机扫码支付─────────────────────────────────▶│               │            │
 │              │               │               │               │            │
 │              │               │               │               │─完成支付    │
 │              │               │               │               │            │
 │              │               │               │◄─异步通知─────│            │
 │              │               │               │ (POST notify) │            │
 │              │               │               │               │            │
 │              │               │               │─IP白名单校验   │            │
 │              │               │               │─签名验证       │            │
 │              │               │               │─获取分布式锁   │            │
 │              │               │               │─状态机校验     │            │
 │              │               │               │─开启事务       │            │
 │              │               │               │               │            │
 │              │               │               │─更新订单状态──▶│            │
 │              │               │               │ UPDATE paid   │            │
 │              │               │               │─电量充值─────▶│            │
 │              │               │               │ UPDATE balance│            │
 │              │               │               │─交易记录─────▶│            │
 │              │               │               │ INSERT        │            │
 │              │               │               │               │            │
 │              │               │               │─提交事务       │            │
 │              │               │               │               │            │
 │              │               │               │◄─返回SUCCESS──│            │
 │              │               │               │               │            │
 │◄─轮询到成功──│               │               │               │            │
 │              │               │               │               │            │
 │◄─刷新余额───│               │               │               │            │
 │              │               │               │               │            │
```

### 4.3 幂等性设计

```typescript
// 三重幂等性保障

// 第1层：Idempotency Key（客户端生成）
const idempotencyKey = crypto.randomUUID();
const response = await fetch('/payment/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({ amount: 1000 }),
});

// 第2层：数据库唯一约束（UNIQUE INDEX）
// migration:
// CREATE UNIQUE INDEX idx_payment_orders_idempotency_key 
// ON payment_orders(idempotency_key) 
// WHERE idempotency_key IS NOT NULL;

// 第3层：状态机校验（防止重复处理）
enum PaymentStatus {
  PENDING = 'pending',   // 可创建 → 支付中
  PAID = 'paid',         // 终态（不可变更）
  EXPIRED = 'expired',   // 终态（不可变更）
  FAILED = 'failed',     // 终态（不可变更）
  REFUNDED = 'refunded', // 终态
}

const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.EXPIRED, PaymentStatus.FAILED],
  [PaymentStatus.PAID]: [], // 终态，不允许任何转换
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.REFUNDED]: [],
};

function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
```

### 4.4 并发控制

```typescript
// 使用PostgreSQL Advisory Lock实现分布式锁
// 确保同一订单的并发回调只有一个能处理成功

class PaymentLockManager {
  // 将订单号转换为64位整数（用于advisory lock）
  private static orderNoToLockKey(orderNo: string): number {
    // 使用FNV-1a哈希
    let hash = 0x811c9dc5;
    for (let i = 0; i < orderNo.length; i++) {
      hash ^= orderNo.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash) % 0x7FFFFFFFFFFFFFFF;
  }

  // 获取事务级排他锁（事务结束时自动释放）
  static async acquireLock(sql: Sql, orderNo: string): Promise<boolean> {
    const lockKey = this.orderNoToLockKey(orderNo);
    const result = await sql`
      SELECT pg_try_advisory_xact_lock(${lockKey}) as acquired
    `;
    return result[0]?.acquired ?? false;
  }
}

// 回调处理中的锁使用
async function handlePaymentNotify(params: NotifyParams): Promise<string> {
  const sql = getSQL();
  
  return await sql.begin(async (tx) => {
    // 获取分布式锁
    const lockAcquired = await PaymentLockManager.acquireLock(tx, params.out_trade_no);
    if (!lockAcquired) {
      console.warn(`无法获取订单锁: ${params.out_trade_no}`);
      return 'FAIL'; // 让Zpay重试
    }

    // 查询订单（在事务内，有锁保护）
    const [order] = await tx`
      SELECT * FROM payment_orders WHERE order_no = ${params.out_trade_no}
    `;

    if (!order) {
      console.error(`订单不存在: ${params.out_trade_no}`);
      return 'FAIL';
    }

    // 幂等性检查
    if (order.status === 'paid') {
      return 'SUCCESS'; // 已处理过
    }

    // 状态机校验
    if (order.status !== 'pending') {
      console.error(`订单状态异常: ${order.status}`);
      return 'SUCCESS'; // 非pending状态，不处理但返回成功
    }

    // 金额校验
    if (order.amount !== parseInt(params.total_fee)) {
      console.error(`金额不匹配: 订单${order.amount} vs 通知${params.total_fee}`);
      // 记录安全告警
      await recordSecurityAlert(tx, 'amount_mismatch', order.id, params);
      return 'FAIL';
    }

    // 更新订单状态
    await tx`
      UPDATE payment_orders 
      SET status = 'paid', 
          paid_at = NOW(), 
          gateway_trade_no = ${params.transaction_id},
          notify_log = ${JSON.stringify(params)},
          updated_at = NOW()
      WHERE id = ${order.id}
    `;

    // 充值电量
    await tx`
      UPDATE energy_accounts 
      SET balance = balance + ${order.amount},
          total_recharged = total_recharged + ${order.amount},
          version = version + 1,
          updated_at = NOW()
      WHERE user_id = ${order.user_id}
    `;

    // 记录交易
    await tx`
      INSERT INTO energy_transactions 
        (user_id, amount, type, reason, metadata, created_at)
      VALUES 
        (${order.user_id}, ${order.amount}, 'recharge', 'zpay_payment',
         ${JSON.stringify({ order_no: order.order_no, gateway_trade_no: params.transaction_id })},
         NOW())
    `;

    return 'SUCCESS';
  });
}
```

### 4.5 安全设计

```typescript
// Zpay签名验证
function verifyZpaySign(params: Record<string, string>, apiKey: string): boolean {
  // 1. 过滤sign字段
  const { sign, ...signParams } = params;
  
  // 2. 按key字典序排序
  const sortedKeys = Object.keys(signParams).sort();
  
  // 3. 构建签名字符串: key1=value1&key2=value2&...&key=apiKey
  const signString = sortedKeys
    .filter(key => signParams[key] !== '' && signParams[key] !== null && signParams[key] !== undefined)
    .map(key => `${key}=${signParams[key]}`)
    .join('&') + `&key=${apiKey}`;
  
  // 4. MD5加密并转大写
  const computedSign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  
  // 5. 比较
  return computedSign === sign;
}

// IP白名单校验
const ZPAY_ALLOWED_IPS = [
  '103.235..*',    // Zpay生产环境IP段
  '47.242.*',      // Zpay备用IP段
];

function isAllowedZpayIP(ip: string): boolean {
  return ZPAY_ALLOWED_IPS.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '\\d+') + '$');
    return regex.test(ip);
  });
}

// 防重放攻击（时间窗口校验）
function isReplayAttack(notifyTime: string): boolean {
  const notifyTimestamp = Date.parse(notifyTime);
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  // 通知时间必须在当前时间前后5分钟内
  return Math.abs(now - notifyTimestamp) > FIVE_MINUTES;
}
```

### 4.6 国际支付预留接口

```typescript
// PaymentGatewayInterface.ts - 适配器模式

interface PaymentGateway {
  readonly name: string;
  readonly supportedCurrencies: string[];
  
  // 创建支付订单
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  
  // 处理支付通知
  handleNotify(rawBody: string, headers: Headers): Promise<NotifyResult>;
  
  // 查询订单状态
  queryOrder(orderNo: string): Promise<OrderStatus>;
  
  // 验证签名
  verifySignature(params: Record<string, string>, secret: string): boolean;
  
  // 退款
  refund?(orderNo: string, amount: number, reason: string): Promise<RefundResult>;
}

// Zpay实现
class ZpayGateway implements PaymentGateway {
  readonly name = 'zpay';
  readonly supportedCurrencies = ['CNY'];
  
  private apiKey: string;
  private mchId: string;
  private notifyUrl: string;
  
  constructor(config: ZpayConfig) {
    this.apiKey = config.apiKey;
    this.mchId = config.mchId;
    this.notifyUrl = config.notifyUrl;
  }
  
  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const response = await fetch('https://api.zpay.com/v1/prepay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mch_id: this.mchId,
        out_trade_no: params.orderNo,
        total_fee: params.amount,
        body: params.description,
        notify_url: this.notifyUrl,
        sign: this.generateSign({ ...params, mch_id: this.mchId }),
      }),
    });
    return this.parseOrderResponse(await response.json());
  }
  
  verifySignature(params: Record<string, string>): boolean {
    return verifyZpaySign(params, this.apiKey);
  }
  
  // ...其他方法实现
}

// Stripe实现（预留）
class StripeGateway implements PaymentGateway {
  readonly name = 'stripe';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
  
  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    // Stripe Checkout Session创建
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: { name: params.description },
          unit_amount: params.amount, // Stripe使用最小货币单位
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: params.returnUrl + '?success=true',
      cancel_url: params.returnUrl + '?canceled=true',
    });
    return { orderNo: params.orderNo, clientSecret: session.client_secret };
  }
  
  // ...其他方法实现
}

// PayPal实现（预留）
class PayPalGateway implements PaymentGateway {
  readonly name = 'paypal';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP'];
  // ...实现
}

// 网关工厂
class PaymentGatewayFactory {
  private static gateways: Map<string, PaymentGateway> = new Map();
  
  static register(gateway: PaymentGateway): void {
    this.gateways.set(gateway.name, gateway);
  }
  
  static getGateway(name: string): PaymentGateway {
    const gateway = this.gateways.get(name);
    if (!gateway) throw new Error(`未知支付网关: ${name}`);
    return gateway;
  }
  
  static getGatewayForCurrency(currency: string): PaymentGateway {
    for (const [, gateway] of this.gateways) {
      if (gateway.supportedCurrencies.includes(currency)) {
        return gateway;
      }
    }
    throw new Error(`不支持的货币: ${currency}`);
  }
}

// 注册网关
PaymentGatewayFactory.register(new ZpayGateway({
  apiKey: Deno.env.get('ZPAY_API_KEY')!,
  mchId: Deno.env.get('ZPAY_MCH_ID')!,
  notifyUrl: `${Deno.env.get('APP_URL')}/functions/v1/payment/notify`,
}));

// 预留Stripe注册
// PaymentGatewayFactory.register(new StripeGateway({ ... }));
```

---

## 5. 安全架构

### 5.1 RLS Policies设计

```sql
-- ============================================
-- RLS Policies - 行级安全策略 (与schema.sql一致)
-- ============================================

-- 全局启用RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ltm_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE anterior_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE intimacy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE intimacy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_trial_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowdfunding_backers ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能访问自己的profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- companions: 用户只能访问自己的伴侣
CREATE POLICY "companions_select_own" ON companions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "companions_insert_own" ON companions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "companions_update_own" ON companions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "companions_delete_own" ON companions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- stm_messages: 用户只能访问自己的消息
CREATE POLICY "stm_select_own" ON stm_messages
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "stm_insert_own" ON stm_messages
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "stm_delete_own" ON stm_messages
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ltm_memories: 用户只能访问自己的记忆
CREATE POLICY "ltm_select_own" ON ltm_memories
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "ltm_insert_own" ON ltm_memories
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "ltm_update_own" ON ltm_memories
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "ltm_delete_own" ON ltm_memories
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- anterior_memories: 用户只能访问自己的待办
CREATE POLICY "anterior_select_own" ON anterior_memories
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "anterior_insert_own" ON anterior_memories
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "anterior_update_own" ON anterior_memories
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "anterior_delete_own" ON anterior_memories
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- mood_records: 通过companion关联到用户
CREATE POLICY "mood_select_own" ON mood_records
  FOR SELECT USING ((SELECT auth.uid()) = (SELECT user_id FROM companions WHERE id = mood_records.companion_id));

-- energy_accounts: 用户只能访问自己的电量账户
CREATE POLICY "energy_account_select_own" ON energy_accounts
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- energy_transactions: 用户只能访问自己的流水
CREATE POLICY "energy_txn_select_own" ON energy_transactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- free_trial_allocations: 用户只能访问自己的试用额度
CREATE POLICY "trial_select_own" ON free_trial_allocations
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- payment_orders: 用户只能访问自己的订单
CREATE POLICY "payment_select_own" ON payment_orders
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "payment_insert_own" ON payment_orders
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- payment_callbacks: 通过order关联到用户
CREATE POLICY "callback_select_own" ON payment_callbacks
  FOR SELECT USING ((SELECT auth.uid()) = (
    SELECT user_id FROM payment_orders WHERE id = payment_callbacks.order_id
  ));

-- refund_orders: 用户只能访问自己的退款单
CREATE POLICY "refund_select_own" ON refund_orders
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- calendar_events: 用户只能访问自己的日历事件
CREATE POLICY "calendar_select_own" ON calendar_events
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "calendar_insert_own" ON calendar_events
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- drama_sessions: 用户只能访问自己的剧情会话
CREATE POLICY "drama_session_select_own" ON drama_sessions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "drama_session_insert_own" ON drama_sessions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- drama_messages: 用户只能访问自己的剧情对话
CREATE POLICY "drama_msg_select_own" ON drama_messages
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- drama_progress: 用户只能访问自己的剧情进度
CREATE POLICY "drama_progress_select_own" ON drama_progress
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- crowdfunding_backers: 用户只能访问自己的支持记录
CREATE POLICY "backer_select_own" ON crowdfunding_backers
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- 注意: Edge Functions通过Service Role Key绕过RLS
-- 所以Edge Function内部必须自行实现权限检查
```

### 5.2 API安全策略

| 安全层 | 实现 | 说明 |
|--------|------|------|
| 认证 | Supabase Auth JWT | 所有API（除notify外）需Bearer JWT |
| 授权 | 资源所有权检查 | Edge Function内部验证couple_id归属 |
| 速率限制 | 多层限制 | 见5.3电量防刷策略 |
| 输入验证 | Zod Schema | 所有请求体严格验证 |
| CORS | 白名单 | 仅允许Vercel域名 |
| HTTPS强制 | 全局 | 不允许HTTP请求 |
| IP白名单 | Zpay回调 | 仅允许Zpay服务器IP |
| 签名验证 | Zpay回调 | MD5签名防篡改 |

### 5.3 电量消费防刷策略

```typescript
// 多层速率限制（Token Bucket + Sliding Window）

interface RateLimitConfig {
  requests: number;  // 请求数
  window: number;    // 时间窗口（秒）
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // 对话API
  'chat:minute': { requests: 60, window: 60 },     // 60次/分钟
  'chat:hour': { requests: 10000, window: 3600 },   // 1万次/小时
  'chat:day': { requests: 50000, window: 86400 },   // 5万次/天
  
  // 支付API
  'payment:create': { requests: 10, window: 60 },   // 10次/分钟
  'payment:create:day': { requests: 50, window: 86400 }, // 50次/天
  
  // 伴侣操作
  'couple:breakup': { requests: 3, window: 86400 }, // 3次/天
  'couple:create': { requests: 5, window: 86400 },  // 5次/天
};

// 速率限制实现 (使用Redis或内存存储，schema中未定义rate_limit_logs表)
async function checkRateLimit(
  sql: Sql,
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - config.window * 1000);
  
  // 清理过期记录 (通过Redis TTL或内存过期自动处理)
  await clearExpiredRateLimits(userId, action);
  
  // 获取当前窗口计数
  const result = await getRateLimitWindow(userId, action, windowStart);
  
  const currentCount = parseInt(result?.count ?? '0');
  const remaining = Math.max(0, config.requests - currentCount);
  
  if (currentCount >= config.requests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt: result?.window_end ?? new Date(Date.now() + config.window * 1000)
    };
  }
  
  // 记录本次请求
  await recordRateLimitHit(userId, action, windowStart, new Date(Date.now() + config.window * 1000));
  
  return { 
    allowed: true, 
    remaining: remaining - 1, 
    resetAt: new Date(Date.now() + config.window * 1000)
  };
}

// Edge Function入口处的速率限制检查
async function withRateLimit(
  req: Request,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  const userId = await getUserIdFromJWT(req);
  const path = new URL(req.url).pathname;
  
  // 根据路径选择限流配置
  const limitKey = getRateLimitKey(path);
  if (limitKey) {
    const config = RATE_LIMITS[limitKey];
    const result = await checkRateLimit(sql, userId, limitKey, config);
    
    if (!result.allowed) {
      return new Response(JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `请求过于频繁，请在${Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)}秒后重试`,
        reset_at: result.resetAt.toISOString(),
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
        },
      });
    }
  }
  
  return handler(req);
}
```

### 5.4 Zpay密钥安全管理

```
密钥存储架构:
┌──────────────────────────────────────┐
│  Zpay API Key (48KiB limit)          │
│  • ZPAY_API_KEY                      │
│  • ZPAY_MCH_ID                       │
│  • ZPAY_NOTIFY_SECRET               │
│  存储位置: Edge Function环境变量     │
│  访问权限: 仅Edge Function内部       │
└──────────────────────────────────────┘
           │
           │ 绝不暴露给:
           │ • 前端代码
           │ • 数据库
           │ • 日志输出
           ▼
┌──────────────────────────────────────┐
│  安全规则:                           │
│  1. 环境变量名称不含"SECRET"前缀     │
│  2. 日志中自动脱敏处理               │
│  3. 错误响应中绝不包含密钥           │
│  4. 密钥轮换时更新环境变量即可       │
└──────────────────────────────────────┘
```

### 5.5 数据加密策略

| 数据类型 | 加密方式 | 说明 |
|----------|---------|------|
| 用户密码 | bcrypt | Supabase Auth自动处理 |
| JWT Token | HS256/RS256 | Supabase Auth签发 |
| 对话内容 | 明文存储 | RLS保护即可 |
| 支付敏感信息 | 不存储 | 仅保留订单号和金额 |
| Zpay密钥 | 环境变量 | 不进入数据库 |
| 用户邮箱 | 明文 | RLS保护 |

---

## 6. 定时任务架构

### 6.1 pg_cron配置

```sql
-- 启用pg_cron扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 任务1: 记忆Consolidation（每天凌晨2:00）
-- 将过期的STM合并为LTM
SELECT cron.schedule(
  'consolidation-job',           -- 任务名称
  '0 2 * * *',                   -- cron表达式: 每天2:00
  $$
    SELECT net.http_post(
      url:='https://your-project.supabase.co/functions/v1/consolidation',
      headers:='{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 任务2: Milestone Adjustment（每天凌晨3:00）
SELECT cron.schedule(
  'milestone-adjust-job',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url:='https://your-project.supabase.co/functions/v1/milestone-adjust',
      headers:='{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 任务3: 过期STM清理（每天凌晨4:00）
SELECT cron.schedule(
  'cleanup-expired-stm',
  '0 4 * * *',
  $$
    SELECT cleanup_stm(
      (SELECT config_value::int FROM system_config WHERE config_key = 'stm_retention_days')
    );
  $$
);

-- 任务4: 过期订单清理（每30分钟）
SELECT cron.schedule(
  'cleanup-expired-orders',
  '*/30 * * * *',
  $$
    UPDATE payment_orders 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '30 minutes';
  $$
);

-- 任务5: 每日免费额度重置（每月1号0:00）
SELECT cron.schedule(
  'reset-free-quota',
  '0 0 1 * *',
  $$
    -- 免费额度通过free_trial_allocations表管理，重置逻辑在应用层实现
    -- 如需重置：UPDATE free_trial_allocations SET consumed_energy = 0 WHERE expires_at < NOW();
  $$
);

-- 任务6: 会话超时清理（每小时）
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '0 * * * *',
  $$
    -- 会话管理在Supabase Auth层处理，无需应用层清理
    -- 如需清理过期数据：SELECT cleanup_stm(3);
  $$
);

-- 查看所有定时任务
SELECT * FROM cron.job;

-- 取消任务
-- SELECT cron.unschedule('consolidation-job');
```

### 6.2 Consolidation Edge Function

```typescript
// Edge Function: consolidation
// 触发方式: pg_cron HTTP调用（Service Role Key认证）

interface ConsolidationRequest {
  // 可选参数，默认处理所有couple
  couple_id?: string;
  batch_size?: number; // 默认100
}

interface ConsolidationResult {
  processed_couples: number;
  consolidated_memories: number;
  errors: number;
  duration_ms: number;
}

// 核心逻辑
async function consolidateMemories(req: Request): Promise<Response> {
  // 验证Service Role Key
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(Deno.env.get('SERVICE_ROLE_KEY')!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { batch_size = 100 } = await req.json().catch(() => ({}));
  
  // 1. 查找有过期STM的companion
  const companions = await sql`
    SELECT DISTINCT companion_id 
    FROM stm_messages 
    WHERE created_at < NOW() - (
      SELECT config_value::interval FROM system_config WHERE config_key = 'stm_retention_days'
    ) || ' days'
    LIMIT ${batch_size}
  `;

  let consolidated = 0;
  
  for (const { companion_id } of companions) {
    // 2. 获取该companion的所有过期STM
    const expiredMessages = await sql`
      SELECT * FROM stm_messages 
      WHERE companion_id = ${companion_id}
      AND created_at < NOW() - (
        SELECT config_value::interval FROM system_config WHERE config_key = 'stm_retention_days'
      ) || ' days'
    `;

    // 3. 调用DeepSeek生成情感摘要（JSON Mode）
    const summary = await generateEmotionalSummary(expiredTopics);
    
    // 4. 创建LTM记录
    await sql`
      INSERT INTO ltm_memories 
        (user_id, companion_id, content, memory_type, importance, source_stm_ids, created_at)
      VALUES 
        ((SELECT user_id FROM companions WHERE id = ${companion_id}), 
         ${companion_id}, ${summary.text}, 'emotion', 
         ${summary.significance}::numeric / 10, 
         ARRAY[${expiredMessages.map(m => m.id).join(',')}], NOW())
    `;

    // 5. 删除已合并的STM（保留期内已在cleanup_stm中处理）
    await sql`
      DELETE FROM stm_messages 
      WHERE companion_id = ${companion_id}
      AND created_at < NOW() - (
        SELECT config_value::interval FROM system_config WHERE config_key = 'stm_retention_days'
      ) || ' days'
    `;

    consolidated += expiredMessages.length;
  }

  return Response.json({
    processed_companions: companions.length,
    consolidated_memories: consolidated,
    errors: 0,
    duration_ms: Date.now() - startTime,
  });
}

// DeepSeek JSON Mode调用
async function generateEmotionalSummary(topics: Topic[]): Promise<Summary> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        {
          role: 'system',
          content: '你是一个情感分析助手。请分析以下对话话题，生成一个情感摘要。必须返回JSON格式。'
        },
        {
          role: 'user',
          content: `请分析这些话题并返回JSON：${JSON.stringify(topics.map(t => t.topic))}\n\n请返回JSON格式：{"text": "摘要文本", "tags": ["标签1", "标签2"], "sentiment": 0.8, "significance": 7}`
        }
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}
```

---

## 7. 系统边界情况处理

### 7.1 边界情况总览表

| # | 边界情况 | 触发条件 | 影响 | 处理方案 |
|---|---------|---------|------|---------|
| 1 | Edge Function超时 | DeepSeek API响应>400s | 对话中断，用户体验差 | ①15s无响应自动重试 ②最多3次重试 ③返回友好错误提示 ④前端自动重连 |
| 2 | SSE连接中断 | 用户网络不稳定/切换WiFi | 流式输出中断 | ①前端检测断开 ②指数退避重连(1s→2s→4s→8s) ③最大5次重试 ④重连后恢复上下文 |
| 3 | 并发支付回调 | Zpay网络重试/重复通知 | 重复充值 | ①PostgreSQL Advisory Lock ②状态机终态保护(paid不可再变) ③幂等Key |
| 4 | 余额不足 | balance=0时用户发消息 | 无法对话 | ①前置检查（SSE的energy_check事件）②友好提示"电量不足" ③引导充值 ④保留查看历史功能 |
| 5 | 关系解除后数据 | 用户删除伴侣 | 数据一致性问题 | ①数据库级联删除（事务包裹）②分批删除大数据表 ③Storage文件清理 ④保留支付记录 |
| 6 | STM保留期变更 | 管理员调整保留期配置 | 历史数据处理 | ①配置变更仅影响新数据 ②已有数据保留原过期时间 ③提供数据迁移脚本 |
| 7 | 新用户初始化 | 首次注册+创建伴侣 | 需要大量初始化操作 | ①事务包裹所有INSERT ②任一步失败回滚全部 ③提供重试机制 ④初始化进度反馈 |
| 8 | 回调时用户不存在 | 支付后用户已注销 | 电量充值找不到用户 | ①订单标记为异常 ②记录安全日志 ③人工审核流程 ④不充值到不存在用户 |
| 9 | DeepSeek API错误 | 429/500/503 | 对话服务不可用 | ①指数退避重试 ②降级到备用模型 ③前端显示"服务繁忙" ④记录错误日志 |
| 10 | Token预算超限 | 月消费>$50 | 成本失控 | ①硬限制阈值 ②超限返回402 ③发送告警通知 ④紧急限流 |
| 11 | 多设备同时登录 | 用户手机+电脑同时在线 | 会话状态不一致 | ①Supabase Realtime同步 ②乐观锁更新 ③最后写入胜出 ④SSE连接独立 |
| 12 | 时区切换 | 用户跨时区旅行 | 纪念日计算错误 | ①所有时间存储为UTC ②显示时转换为用户时区 ③proactive消息基于用户本地时间 |
| 13 | 语言切换 | 用户切换界面语言 | 对话上下文语言不一致 | ①切换后新对话使用新语言 ②历史对话保持原语言 ③系统提示动态切换 |
| 14 | 好感度达到100 | intimacy_score=100 | 行为定义不明确 | ①达到100后不再增加 ②解锁特殊剧情/对话 ③显示"MAX"标识 ④可继续正常对话 |
| 15 | 电量恰好为0 | balance=0 | 零值判断边界 | ①balance=0视为不足 ②不可发起新对话 ③可查看历史 ④显示"需要充电"提示 |
| 16 | 剧情空间好感度 | story_space对话 | 是否影响主线好感度 | ①剧情空间好感度独立存储 ②不影响主线intimacy_score ③仅在空间内有效 ④退出空间重置 |
| 17 | 免费额度用尽 | free_quota=0 | 新用户无法体验 | ①显示免费额度进度 ②用尽前预警提示 ③引导首次充值优惠 ④保留基础功能 |
| 18 | 数据库连接池耗尽 | 高并发场景 | 所有请求失败 | ①连接池大小配置 ②请求排队 ③超时降级 ④告警通知 |
| 19 | 用户快速连续点击 | 网络延迟时 | 重复请求 | ①前端防抖(300ms) ②后端幂等检查 ③加载状态锁定按钮 |
| 20 | 支付后页面关闭 | 用户未等待结果 | 充值未到账 | ①下次打开时自动查询待处理订单 ②服务端Webhook可靠投递 ③前端轮询补偿 |

### 7.2 关键边界详细处理

#### 7.2.1 SSE连接中断恢复

```typescript
// 连接状态机
enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  STREAMING = 'streaming',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  CLOSED = 'closed',
}

// 重连策略
class ReconnectStrategy {
  private attempt = 0;
  private readonly maxAttempts = 5;
  private readonly baseDelay = 1000; // 1秒
  private readonly maxDelay = 30000; // 30秒

  getNextDelay(): number | null {
    if (this.attempt >= this.maxAttempts) {
      return null; // 不再重试
    }
    // 指数退避 + 随机抖动
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt),
      this.maxDelay
    );
    this.attempt++;
    return delay + Math.random() * 1000; // 添加0-1秒随机抖动
  }

  reset() {
    this.attempt = 0;
  }
}

// 前端连接管理器
class SSEConnectionManager {
  private state: ConnectionState = ConnectionState.IDLE;
  private reconnectStrategy = new ReconnectStrategy();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongTime = Date.now();
  private pendingMessage: string | null = null;

  async connect(message: string, coupleId: string) {
    this.pendingMessage = message;
    this.state = ConnectionState.CONNECTING;

    try {
      const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ couple_id: coupleId, message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.state = ConnectionState.STREAMING;
      this.reconnectStrategy.reset();
      this.setupHeartbeat();

      const reader = response.body!.getReader();
      await this.processStream(reader);
    } catch (err) {
      this.handleDisconnect(err);
    }
  }

  private handleDisconnect(error: any) {
    this.state = ConnectionState.DISCONNECTED;
    this.stopHeartbeat();

    // 如果是AbortError（用户主动取消），不重连
    if (error.name === 'AbortError') {
      this.state = ConnectionState.CLOSED;
      return;
    }

    // 尝试重连
    const delay = this.reconnectStrategy.getNextDelay();
    if (delay !== null && this.pendingMessage) {
      this.state = ConnectionState.RECONNECTING;
      setTimeout(() => {
        this.connect(this.pendingMessage!, this.coupleId);
      }, delay);
    } else {
      this.state = ConnectionState.ERROR;
      // 通知用户重试失败
      toast.error('连接已断开，请检查网络后重试');
    }
  }

  private setupHeartbeat() {
    // 每30秒检测一次连接状态
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPongTime > 60000) {
        // 60秒无响应，认为连接已死
        this.abort();
        this.handleDisconnect(new Error('Heartbeat timeout'));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  abort() {
    this.abortController.abort();
    this.stopHeartbeat();
    this.state = ConnectionState.CLOSED;
  }
}
```

#### 7.2.2 剧情空间好感度隔离设计

```typescript
// 明确区分主线好感度和剧情空间好感度

interface Companion {
  id: string;
  user_id: string;
  nickname: string;
  // 好感度在intimacy_records表中
}

interface DramaSession {
  id: string;
  user_id: string;
  companion_id: string;
  drama_id: string;
  status: string;
  current_scene: string;
  context_memory: object;
} 

interface DramaProgress {
  id: string;
  user_id: string;
  drama_id: string;
  is_unlocked: boolean;
  unlocked_at: string;
  completed_at: string;
}

// 剧情空间对话写入drama_messages表（与stm_messages分离）
interface DramaMessage {
  id: string;
  session_id: string;  // 关联drama_sessions
  user_id: string;
  speaker: 'user' | 'companion' | 'narrator';
  content: string;
  created_at: string;
}

// 好感度变化规则
class IntimacyManager {
  // 主线对话：影响主线好感度
  static async updateMainIntimacy(
    userId: string,
    companionId: string, 
    delta: number
  ): Promise<number> {
    const result = await sql`
      SELECT adjust_intimacy(${userId}, ${companionId}, ${delta}::smallint, 'conversation')
    `;
    return result[0].new_score;
  }

  // 剧情空间对话：好感度变化记录在drama_sessions.context_memory中
  static async updateStoryIntimacy(
    sessionId: string,
    delta: number
  ): Promise<void> {
    await sql`
      UPDATE drama_sessions 
      SET context_memory = jsonb_set(
        COALESCE(context_memory, '{}'),
        '{local_intimacy_score}',
        (COALESCE((context_memory->>'local_intimacy_score')::int, 0) + ${delta})::text::jsonb
      ),
      updated_at = NOW()
      WHERE id = ${sessionId}
    `;
  }

  // 明确隔离：剧情空间好感度不反馈到主线
  // 但解锁新空间需要主线好感度达标
  static async canUnlockStorySpace(
    coupleId: string,
    storySpaceId: string
  ): Promise<boolean> {
    const [couple, space] = await Promise.all([
      sql`SELECT score FROM intimacy_records WHERE companion_id = ${companionId}`,
      sql`SELECT is_unlocked FROM drama_progress WHERE user_id = ${userId} AND drama_id = ${dramaId}`,
    ]);
    
    return !progress[0]?.is_unlocked && intimacy[0]?.score >= 0; // 具体条件在应用层实现
  }
}
```

---

## 8. 非MVP阶段预留设计

### 8.1 Live2D形象系统

```typescript
// 数据库预留字段
interface Couple {
  // ...MVP字段
  
  // Live2D预留
  live2d_model_path: string | null;   // 模型文件路径: storage/companions/{id}/live2d/
  live2d_enabled: boolean;             // 是否启用
  live2d_expression_map: {             // 表情映射
    [emotion: string]: string;         // "joy" -> "joy.exp.json"
  } | null;
  avatar_image_url: string | null;     // 静态头像（Live2D加载前fallback）
}

// Storage结构预留
// bucket: couple-assets
// └── companions/
//     └── {companion_id}/
//         ├── avatar/           # 静态头像
//         │   └── avatar.png
//         ├── live2d/           # Live2D模型（预留）
//         │   ├── model.json
//         │   ├── textures/
//         │   ├── motions/
//         │   └── expressions/
//         └── voice/            # TTS语音（预留）
//             └── samples/

// 前端组件预留
// components/Live2DViewer.tsx
// - 使用pixi-live2d-display库
// - 根据情绪状态切换表情
// - 点击交互响应

// Edge Function预留
// live2d-expressions: GET /live2d/expressions?companion_id=uuid
// 返回当前情绪对应的Live2D表情参数
```

### 8.2 TTS语音系统

```typescript
// TTS预留接口
interface TTSSystem {
  // 生成语音
  synthesize(text: string, voiceId: string): Promise<AudioBuffer>;
  
  // 获取可用音色列表
  getVoiceList(): Promise<Voice[]>;
  
  // 克隆音色（高级功能）
  cloneVoice(sampleAudio: Blob, name: string): Promise<Voice>;
  
  // 情感语音
  synthesizeWithEmotion(
    text: string, 
    voiceId: string, 
    emotion: string
  ): Promise<AudioBuffer>;
}

// 数据库预留
interface Couple {
  // ...
  voice_preference: string | null;     // 偏好的音色ID
  voice_enabled: boolean;               // 是否启用语音
  voice_speed: number;                  // 语速 (0.5-2.0)
  voice_pitch: number;                  // 音调 (0.5-2.0)
}

// 前端实现
// - 使用Web Audio API播放
// - 对话消息自动朗读（可开关）
// - 音频缓存（IndexedDB）

// Edge Function: tts-synthesize
// POST /tts/synthesize
// {
//   "text": "要转换的文本",
//   "couple_id": "uuid",
//   "emotion": "joy"
// }
// 返回音频文件URL（存储在Supabase Storage）
```

### 8.3 共同宠物系统

```typescript
// 数据库预留字段
interface Couple {
  // ...MVP字段
  
  // 宠物系统预留
  pet_enabled: boolean;
  pet_name: string | null;
  pet_type: 'cat' | 'dog' | 'bird' | 'dragon' | null;
  pet_stage: 'egg' | 'baby' | 'child' | 'adult' | null;
  pet_happiness: number;               // 0-100
  pet_hunger: number;                  // 0-100
  pet_experience: number;              // 经验值
  pet_created_at: string | null;
}

// 独立宠物表（预留创建）
interface Pet {
  id: string;
  couple_id: string;
  name: string;
  type: string;
  stage: string;
  happiness: number;
  hunger: number;
  experience: number;
  traits: string[];                    // 性格特征
  interactions: PetInteraction[];
  created_at: string;
  updated_at: string;
}

// 宠物互动记录
interface PetInteraction {
  id: string;
  pet_id: string;
  type: 'feed' | 'play' | 'pet' | 'talk';
  user_id: string;
  result: string;                      // 互动结果描述
  happiness_delta: number;
  created_at: string;
}

// 前端组件预留
// components/PetViewer.tsx - 宠物展示
// components/PetInteractionPanel.tsx - 互动面板
// components/PetEvolutionModal.tsx - 进化动画
```

### 8.4 多语言i18n架构

```typescript
// i18n配置
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  'en': { translation: en },
  'ja': { translation: ja },
  'ko': { translation: ko },
  // 预留更多语言
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh-CN', // 默认语言
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

// 语言检测策略
// 1. URL参数: ?lang=en
// 2. localStorage: 用户上次选择
// 3. 浏览器语言: navigator.language
// 4. 默认: zh-CN

// 后端语言传递
// 每个API请求在Header中携带: X-User-Language: zh-CN
// Edge Function根据此Header选择系统提示语言

// DeepSeek多语言支持
// 系统提示中明确指定:
// "请使用{language}回复用户。当前语言: 中文(简体)"
// language参数从请求中读取

// 数据库预留
interface User {
  // ...
  language: string;        // 用户偏好语言: zh-CN, en, ja, etc.
  timezone: string;        // 时区: Asia/Shanghai, America/New_York, etc.
}
```

### 8.5 移动端适配预留

```css
/* 响应式断点 */
/* Mobile: < 768px */
/* Tablet: 768px - 1024px */
/* Desktop: > 1024px */

/* 移动端适配方案 */
@layer base {
  /* 安全区域适配 */
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  /* 触摸优化 */
  .touch-friendly {
    min-height: 44px; /* iOS最小触摸目标 */
    min-width: 44px;
  }
}

/* PWA支持（预留） */
/* manifest.json */
{
  "name": "Platonic AI",
  "short_name": "Platonic",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFF0F5",
  "theme_color": "#FFB6C1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

```typescript
// 移动端专用组件
// components/mobile/MobileChatLayout.tsx
// components/mobile/MobileBottomNav.tsx
// components/mobile/MobileSwipeGestures.tsx

// 移动端功能预留
interface MobileFeatures {
  pushNotifications: boolean;  // 推送通知
  offlineMode: boolean;        // 离线浏览历史对话
  hapticFeedback: boolean;     // 触觉反馈
  quickActions: boolean;       // 3D Touch/长按快捷操作
}
```

### 8.6 社群功能预留

```typescript
// 数据库表预留（MVP不创建）

// 社区动态
interface CommunityPost {
  id: string;
  user_id: string;
  couple_id: string;           // 关联伴侣（匿名展示）
  content: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  is_anonymous: boolean;
  created_at: string;
}

// 评论
interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;    // 回复评论
  content: string;
  likes_count: number;
  created_at: string;
}

// 用户关注
interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// 前端路由预留
// /community → CommunityPage
// /community/trending → TrendingPage
// /community/following → FollowingPage
// /community/post/:id → PostDetailPage
// /profile/:userId → UserProfilePage

// Edge Function预留
// community-posts: CRUD
// community-comments: CRUD
// community-like: 点赞
// community-follow: 关注
```

---

## 9. 数据流图

### 9.1 对话流程数据流

```
[用户输入] 
    │
    ▼
[前端: ChatInput组件] ──防抖300ms──▶ [前端: chatStore.sendMessage()]
    │
    ▼
[前端: SSE连接建立] ──POST /chat/stream──▶ [Edge Function: chat-stream]
    │                                              │
    │◄────────────SSE Headers──────────────────────│
    │  Content-Type: text/event-stream             │
    │                                              │
    │                                              ├──▶ [PostgreSQL: energy_accounts]
    │                                              │     SELECT balance WHERE user_id
    │                                              │     (余额检查, 通过get_user_energy)
    │                                              │
    │                                              ├──▶ [PostgreSQL: stm_messages]
    │                                              │     SELECT WHERE companion_id (STM检索)
    │                                              │
    │                                              ├──▶ [PostgreSQL: ltm_memories]
    │                                              │     SELECT WHERE companion_id (LTM检索)
    │                                              │
    │                                              ├──▶ [PostgreSQL: mood_records]
    │                                              │     SELECT WHERE companion_id ORDER BY created_at DESC LIMIT 1
    │                                              │     (情绪上下文 - PAD+OCC)
    │                                              │
    │                                              ├──▶ [DeepSeek API]
    │                                              │     POST /v1/chat/completions
    │                                              │     stream: true
    │                                              │
    │◄──────────event: delta───────────────────────│ (流式返回)
    │                                              │
    │◄──────────event: delta───────────────────────│
    │                                              │
    │                                              ├──▶ [PostgreSQL: energy_accounts]
    │                                              │     UPDATE (原子递减, 通过consume_energy函数)
    │                                              │
    │                                              ├──▶ [PostgreSQL: stm_messages]
    │                                              │     INSERT (存储对话)
    │                                              │
    │◄──────────event: finish──────────────────────│
    │                                              │
    │◄──────────event: done────────────────────────│
    │
    ▼
[前端: MessageBubble渲染] ◄──流式文本── [前端: streamText state]
    │
    ▼
[前端: 自动保存到localStorage备份]
```

### 9.2 支付流程数据流

```
[用户点击充值按钮]
    │
    ▼
[前端: EnergyPage] ──POST /payment/create──▶ [Edge Function: payment-create]
    │                                              │
    │                                              ├──▶ [PostgreSQL: payment_orders]
    │                                              │     INSERT (pending状态)
    │                                              │     (Idempotency Key唯一约束)
    │                                              │
    │                                              ├──▶ [Zpay API]
    │                                              │     创建预支付订单
    │                                              │
    │◄────────返回order_no + code_url──────────────│
    │
    ▼
[前端: 展示二维码]
    │
    ├──▶ [用户手机扫码支付] ──────────────────────▶ [Zpay]
    │                                                  │
    │                                                  ▼
    │◄─────────────────异步通知───────────────────────│
    │                       │
    │                       ▼
    │              [Edge Function: payment-notify]
    │                       │
    │                       ├──▶ IP白名单校验
    │                       ├──▶ 签名验证(MD5)
    │                       ├──▶ 获取分布式锁
    │                       ├──▶ 状态机校验
    │                       ├──▶ [PostgreSQL: 事务开始]
    │                       │     ├── UPDATE payment_orders (paid)
    │                       │     ├── UPDATE energy_accounts (+balance, 通过recharge_energy函数)
    │                       │     └── INSERT energy_transactions
    │                       ├──▶ [PostgreSQL: 事务提交]
    │                       └──▶ 返回"SUCCESS"
    │
    ├──▶ [前端: 轮询查询订单状态] ──GET──▶ [Edge Function]
    │       (每3秒，最多100次)                    │
    │                                             ├──▶ [PostgreSQL]
    │                                             │     SELECT status
    │◄────────────返回status=paid─────────────────│
    │
    ▼
[前端: 刷新电量余额显示]
[前端: 显示"充值成功"提示]
```

### 9.3 记忆Consolidation数据流

```
[pg_cron触发: 每天凌晨2:00]
    │
    ▼
[HTTP调用] ──POST /consolidation──▶ [Edge Function: consolidation]
    │                                      │
    │                                      ├──▶ [PostgreSQL]
    │                                      │     SELECT expired STM messages
    │                                      │     WHERE created_at < NOW() - retention_days
    │                                      │
    │                                      ├──▶ [DeepSeek API JSON Mode]
    │                                      │     请求生成情感摘要
    │                                      │     (prompt包含"json"字样)
    │                                      │
    │                                      ├──▶ [PostgreSQL]
    │                                      │     INSERT INTO ltm_memories (LTM)
    │                                      │
    │                                      ├──▶ [PostgreSQL]
    │                                      │     DELETE FROM stm_messages
    │                                      │     (已过保留期的消息)
    │                                      │
    │                                      └──▶ 返回处理统计
    │
    ▼
[记录执行日志到cron_execution_logs]
```

---

## 10. 前端组件架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          App.tsx                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Provider Layer                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │  Query   │ │ Zustand  │ │  I18n    │ │  Auth    │       │   │
│  │  │ Provider │ │ Provider │ │ Provider │ │ Provider │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Router Layer                              │   │
│  │  /login    /onboarding    /(main)    /support              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MainLayout (Protected)                    │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Sidebar              │  Content Area               │   │   │
│  │  │  ┌─────────────────┐  │  ┌───────────────────────┐  │   │   │
│  │  │  │ CompanionAvatar │  │  │  <Outlet />           │  │   │   │
│  │  │  │ (Live2D预留)    │  │  │                       │  │   │   │
│  │  │  └─────────────────┘  │  │  /chat ── ChatPage    │  │   │   │
│  │  │  ┌─────────────────┐  │  │  /memory ─ MemoryPage │  │   │   │
│  │  │  │ NavigationMenu  │  │  │  /energy ─ EnergyPage │  │   │   │
│  │  │  └─────────────────┘  │  │  /story ── StoryPage  │  │   │   │
│  │  │  ┌─────────────────┐  │  │  /settings Settings   │  │   │   │
│  │  │  │ EnergyIndicator │  │  │                       │  │   │   │
│  │  │  └─────────────────┘  │  └───────────────────────┘  │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

ChatPage详细组件结构:
┌─────────────────────────────────────────────────────────────────────┐
│                          ChatPage                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ChatContainer                             │   │
│  │                                                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │                  MessageList                           │  │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐   │  │   │
│  │  │  │UserMsg  │  │AIMsg    │  │MemoryHighlight      │   │  │   │
│  │  │  │Bubble   │  │Bubble   │  │(记忆引用高亮)         │   │  │   │
│  │  │  └─────────┘  └─────────┘  └─────────────────────┘   │  │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐   │  │   │
│  │  │  │Typing   │  │Date     │  │LoadingSkeleton      │   │  │   │
│  │  │  │Indicator│  │Separator│  │                     │   │  │   │
│  │  │  └─────────┘  └─────────┘  └─────────────────────┘   │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │                  SSEManager                            │  │   │
│  │  │  - ConnectionStatus (连接状态指示)                      │  │   │
│  │  │  - AbortController (取消控制)                          │  │   │
│  │  │  - ReconnectLogic (重连逻辑)                           │  │   │
│  │  │  - HeartbeatMonitor (心跳监控)                         │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │                  ChatInput                             │  │   │
│  │  │  ┌───────────────┐  ┌──────────┐  ┌──────────────┐  │  │   │
│  │  │  │TextArea       │  │SendButton│  │EnergyBadge   │  │  │   │
│  │  │  │(auto-resize)  │  │(loading) │  │(1电量/次)    │  │  │   │
│  │  │  └───────────────┘  └──────────┘  └──────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. 支付系统时序图

```
┌──────────┐          ┌──────────┐           ┌──────────────┐          ┌──────────┐          ┌──────────────┐
│   User   │          │ Frontend │           │ payment-     │          │ Zpay API │          │ PostgreSQL   │
│          │          │          │           │ create       │          │          │          │              │
└────┬─────┘          └────┬─────┘           └──────┬───────┘          └────┬─────┘          └──────┬───────┘
     │                     │                        │                     │                      │
     │─点击充值100元──────▶│                        │                     │                      │
     │                     │                        │                     │                      │
     │                     │─POST /payment/create──▶│                     │                      │
     │                     │ {amount:10000,currency:│                     │                      │
     │                     │  "CNY",package_id:...} │                     │                      │
     │                     │                        │                     │                      │
     │                     │                        │─验证JWT+金额────────▶│                      │
     │                     │                        │                     │                      │
     │                     │                        │◄─验证通过───────────│                      │
     │                     │                        │                     │                      │
     │                     │                        │─生成Idempotency Key │                      │
     │                     │                        │                     │                      │
     │                     │                        │────────INSERT──────▶│                      │
     │                     │                        │ payment_orders      │                      │
     │                     │                        │ (pending)           │                      │
     │                     │                        │◄────────────────────│                      │
     │                     │                        │                     │                      │
     │                     │                        │─调用预支付API──────▶│                      │
     │                     │                        │ {mch_id,out_trade_  │                      │
     │                     │                        │  no,total_fee,sign} │                      │
     │                     │                        │                     │                      │
     │                     │                        │◄─返回prepay_id─────│                      │
     │                     │                        │   code_url          │                      │
     │                     │                        │                     │                      │
     │                     │                        │─UPDATE order──────▶│                      │
     │                     │                        │   SET code_url      │                      │
     │                     │                        │◄────────────────────│                      │
     │                     │                        │                     │                      │
     │                     │◄─返回order+qr_url─────│                     │                      │
     │                     │                      │                     │                      │
     │◄─展示二维码────────│                      │                     │                      │
     │                     │                      │                     │                      │
     │                     │─启动轮询(3s间隔)────▶│                     │                      │
     │                     │                      │                     │                      │
     │─手机扫码支付───────▶│─────────────────────│────────────────────▶│                      │
     │                     │                      │                     │                      │
     │                     │                      │                     │─支付完成─────────────│
     │                     │                      │                     │                      │
     │                     │                      │◄─异步通知──────────│                      │
     │                     │                      │ {out_trade_no,      │                      │
     │                     │                      │  transaction_id,    │                      │
     │                     │                      │  result_code:SUCCESS│                      │
     │                     │                      │  sign}              │                      │
     │                     │                      │                     │                      │
     │                     │                      │─IP白名单校验───────▶│                      │
     │                     │                      │◄─通过──────────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─签名验证(MD5)─────▶│                      │
     │                     │                      │◄─签名匹配──────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─获取Advisory Lock──▶│                      │
     │                     │                      │◄─获取成功──────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─BEGIN TRANSACTION──▶│                      │
     │                     │                      │                     │                      │
     │                     │                      │─SELECT order───────▶│                      │
     │                     │                      │◄─status=pending────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─UPDATE status=paid─▶│                      │
     │                     │                      │◄────────────────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─UPDATE energy_bal──▶│                      │
     │                     │                      │  +1000电量           │                      │
     │                     │                      │◄────────────────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─INSERT transaction─▶│                      │
     │                     │                      │  充值记录             │                      │
     │                     │                      │◄────────────────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─COMMIT─────────────▶│                      │
     │                     │                      │◄────────────────────│                      │
     │                     │                      │                     │                      │
     │                     │                      │─释放Advisory Lock──▶│                      │
     │                     │                      │                     │                      │
     │                     │                      │◄────────────────────│                      │
     │                     │                      │─返回"SUCCESS"─────▶│                      │
     │                     │                      │                     │                      │
     │                     │◄─轮询: status=paid──│                     │                      │
     │                     │                      │                     │                      │
     │◄─显示"充值成功"────│                      │                     │                      │
     │                     │                      │                     │                      │
     │                     │─刷新电量显示───────▶│                     │                      │
     │                     │                      │                     │                      │
     │◄─余额更新:1500─────│                      │                     │                      │
     │                     │                      │                     │                      │
```

---

## 12. 部署架构

```
生产环境部署架构:

┌─────────────────────────────────────────────────────────┐
│                       Vercel                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Production  │  │   Preview   │  │  Edge Network   │ │
│  │  (main)     │  │  (develop)  │  │   (CDN + SSL)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase Platform                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Edge Functions (Deno Runtime)          │   │
│  │  chat-stream │ payment-* │ memory │ emotion │ ... │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │          PostgreSQL (RLS Enabled)                 │   │
│  │  companions │ stm_messages │ payment_orders │ ...  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Supabase Storage                        │   │
│  │  avatars │ live2d-models │ voice-samples │ ...   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Auth (GoTrue)                           │   │
│  │  JWT │ OAuth │ Email/Password │ Magic Link        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ DeepSeek │   │   Zpay   │   │  Other   │
    │ V4-Flash │   │ (Alipay) │   │ Services │
    │   API    │   │   API    │   │          │
    └──────────┘   └──────────┘   └──────────┘

环境变量配置:
┌─────────────────────────────────────────────────────────┐
│  Supabase Edge Function Secrets                         │
│  ├── DEEPSEEK_API_KEY            (DeepSeek API密钥)      │
│  ├── DEEPSEEK_BASE_URL           (API基础URL)            │
│  ├── ZPAY_API_KEY                (Zpay API密钥)          │
│  ├── ZPAY_MCH_ID                 (Zpay商户号)            │
│  ├── ZPAY_NOTIFY_SECRET          (回调签名密钥)           │
│  ├── SUPABASE_URL                (项目URL)               │
│  ├── SUPABASE_SERVICE_ROLE_KEY   (服务角色密钥)           │
│  ├── APP_URL                     (应用URL)               │
│  ├── MAX_MONTHLY_BUDGET          (月度Token预算$50)      │
│  ├── RATE_LIMIT_SECRET           (限流签名密钥)           │
│  └── ENVIRONMENT                 (production/staging)    │
└─────────────────────────────────────────────────────────┘
```

---

## 附录

### A. 数据库Migration模板 (与schema.sql一致)

```sql
-- 001_initial_schema.sql
-- 创建所有核心表 (与实际schema.sql保持一致)

-- profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT 'User',
  email TEXT NOT NULL,
  avatar_url TEXT,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  status TEXT NOT NULL DEFAULT 'NO_COMPANION'
    CHECK (status IN ('NO_COMPANION', 'HAS_COMPANION')),
  onboarding_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- MVP预留扩展字段
  live2d_enabled BOOLEAN DEFAULT false,
  voice_enabled BOOLEAN DEFAULT false,
  pet_enabled BOOLEAN DEFAULT false
);

-- milestone_definitions (好感度阶段定义)
CREATE TABLE milestone_definitions (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  min_score SMALLINT NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score SMALLINT NOT NULL CHECK (max_score >= 0 AND max_score <= 100),
  icon_url TEXT,
  unlocked_features TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pricing_plans (充值套餐)
CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  energy_amount BIGINT NOT NULL CHECK (energy_amount > 0),
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- companions (伴侣表)
CREATE TABLE companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'nonbinary', 'unknown')),
  age SMALLINT CHECK (age > 0 AND age < 200),
  birth_month SMALLINT CHECK (birth_month BETWEEN 1 AND 12),
  birth_day SMALLINT CHECK (birth_day BETWEEN 1 AND 31),
  background TEXT,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  bio TEXT,
  avatar_url TEXT,
  -- Big Five Personality Dimensions (0-100)
  bf_openness SMALLINT NOT NULL DEFAULT 50 CHECK (bf_openness BETWEEN 0 AND 100),
  bf_conscientiousness SMALLINT NOT NULL DEFAULT 50 CHECK (bf_conscientiousness BETWEEN 0 AND 100),
  bf_extraversion SMALLINT NOT NULL DEFAULT 50 CHECK (bf_extraversion BETWEEN 0 AND 100),
  bf_agreeableness SMALLINT NOT NULL DEFAULT 50 CHECK (bf_agreeableness BETWEEN 0 AND 100),
  bf_neuroticism SMALLINT NOT NULL DEFAULT 50 CHECK (bf_neuroticism BETWEEN 0 AND 100),
  -- MVP预留扩展字段
  live2d_model_path TEXT,
  voice_id TEXT,
  pet_name TEXT,
  pet_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_companions_user_id ON companions(user_id);

-- stm_messages (Short Term Memory - 对话消息)
CREATE TABLE stm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'companion')),
  content TEXT NOT NULL,
  emotion_label TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stm_companion_created ON stm_messages(companion_id, created_at);

-- ltm_memories (Long Term Memory - 长期记忆)
CREATE TABLE ltm_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'fact'
    CHECK (memory_type IN ('fact', 'preference', 'event', 'emotion')),
  importance NUMERIC(2,1) NOT NULL DEFAULT 0.5
    CHECK (importance >= 0.1 AND importance <= 1.0),
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  source_stm_ids UUID[] DEFAULT '{}',
  source_summary TEXT,
  memory_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ltm_companion_importance ON ltm_memories(companion_id, importance DESC);

-- anterior_memories (Anterior Memory - 待办/未来事项)
CREATE TABLE anterior_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  planned_at TIMESTAMPTZ NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'time_based'
    CHECK (trigger_type IN ('time_based', 'event_based', 'milestone_based')),
  priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anterior_companion_status ON anterior_memories(companion_id, status);

-- intimacy_records (好感度主记录)
CREATE TABLE intimacy_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  milestone_stage SMALLINT NOT NULL DEFAULT 1
    REFERENCES milestone_definitions(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, companion_id)
);

-- intimacy_history (好感度变化日志)
CREATE TABLE intimacy_history (
  id BIGSERIAL PRIMARY KEY,
  intimacy_id UUID NOT NULL REFERENCES intimacy_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  old_score SMALLINT NOT NULL CHECK (old_score >= 0 AND old_score <= 100),
  new_score SMALLINT NOT NULL CHECK (new_score >= 0 AND new_score <= 100),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- mood_records (情绪记录 - PAD三维 + OCC标签)
CREATE TABLE mood_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  pleasure SMALLINT NOT NULL CHECK (pleasure BETWEEN -100 AND 100),
  arousal SMALLINT NOT NULL CHECK (arousal BETWEEN -100 AND 100),
  dominance SMALLINT NOT NULL CHECK (dominance BETWEEN -100 AND 100),
  occ_label TEXT REFERENCES emotion_occs(label) ON DELETE SET NULL,
  intensity SMALLINT NOT NULL DEFAULT 50 CHECK (intensity BETWEEN 0 AND 100),
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mood_companion_created ON mood_records(companion_id, created_at);

-- energy_accounts (用户电量余额账户)
CREATE TABLE energy_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  total_recharged BIGINT NOT NULL DEFAULT 0,
  total_consumed BIGINT NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- free_trial_allocations (新用户免费试用额度)
CREATE TABLE free_trial_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_energy BIGINT NOT NULL CHECK (total_energy > 0),
  consumed_energy BIGINT NOT NULL DEFAULT 0 CHECK (consumed_energy >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (consumed_energy <= total_energy)
);

-- energy_transactions (电量流水表)
CREATE TABLE energy_transactions (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES energy_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL
    CHECK (txn_type IN ('recharge', 'consume', 'gift', 'refund', 'compensation', 'trial')),
  amount BIGINT NOT NULL CHECK (amount <> 0),
  balance_after BIGINT NOT NULL,
  description TEXT,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_energy_txn_user_created ON energy_transactions(user_id, created_at DESC);

-- payment_orders (支付订单表 - 幂等性设计)
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES pricing_plans(id) ON DELETE SET NULL,
  coupon_id UUID REFERENCES discount_coupons(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  paid_cents BIGINT NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  energy_amount BIGINT NOT NULL CHECK (energy_amount > 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunding', 'refunded')),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_channel TEXT,
  third_party_txn_id TEXT,
  metadata JSONB DEFAULT '{}',
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_user_status ON payment_orders(user_id, status);

-- payment_callbacks (回调通知记录表)
CREATE TABLE payment_callbacks (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  callback_body JSONB NOT NULL DEFAULT '{}',
  signature TEXT,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- refund_orders (退款单表)
CREATE TABLE refund_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  refund_no TEXT NOT NULL UNIQUE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'success', 'failed')),
  processed_at TIMESTAMPTZ,
  operator_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- calendar_events (日历事件表)
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID REFERENCES companions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('milestone', 'anterior_memory', 'ltm_date', 'companion_birthday', 'user_event')),
  source_id UUID,
  event_date DATE NOT NULL,
  event_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_user_date ON calendar_events(user_id, event_date);

-- drama_definitions (高级剧情定义)
CREATE TABLE drama_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  scene_setting TEXT,
  drama_prompt TEXT NOT NULL,
  cover_image_path TEXT,
  unlock_condition TEXT DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- drama_sessions (剧情会话表)
CREATE TABLE drama_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID REFERENCES companions(id) ON DELETE SET NULL,
  drama_id UUID NOT NULL REFERENCES drama_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  current_scene TEXT,
  context_memory JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- drama_messages (剧情对话记录)
CREATE TABLE drama_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES drama_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'companion', 'narrator')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drama_msg_session ON drama_messages(session_id);

-- drama_progress (剧情解锁状态)
CREATE TABLE drama_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  drama_id UUID NOT NULL REFERENCES drama_definitions(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drama_id)
);

-- crowdfunding_projects (筹资项目)
CREATE TABLE crowdfunding_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount BIGINT NOT NULL CHECK (target_amount > 0),
  current_amount BIGINT NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'funded', 'cancelled')),
  cover_image_url TEXT,
  deadline TIMESTAMPTZ,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- crowdfunding_backers (支持者记录)
CREATE TABLE crowdfunding_backers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES crowdfunding_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- system_config (全局系统配置)
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- emotion_occs (OCC情绪标签字典)
CREATE TABLE emotion_occs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  pleasure_delta SMALLINT NOT NULL DEFAULT 0,
  arousal_delta SMALLINT NOT NULL DEFAULT 0,
  dominance_delta SMALLINT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### B. Edge Function部署配置

```json
// supabase/config.toml 相关配置
[functions]
[functions.chat-stream]
verify_jwt = true
import_map = "./import_map.json"

[functions.payment-notify]
verify_jwt = false  // Zpay回调不需要JWT
import_map = "./import_map.json"

[functions.consolidation]
verify_jwt = true
import_map = "./import_map.json"
```

### C. 监控与告警

```typescript
// 关键指标监控
const METRICS = {
  // 业务指标
  'chat.requests_per_minute': '每分钟对话请求数',
  'chat.average_response_time': '平均响应时间',
  'chat.stream_interrupt_rate': '流式中断率',
  'chat.deepseek_error_rate': 'DeepSeek API错误率',
  
  // 支付指标
  'payment.success_rate': '支付成功率',
  'payment.notify_latency': '回调处理延迟',
  'payment.concurrent_callbacks': '并发回调数',
  
  // 系统指标
  'edge_function.cold_start_duration': '冷启动时间',
  'edge_function.memory_usage': '内存使用率',
  'database.query_duration': '数据库查询耗时',
  'database.connection_pool_usage': '连接池使用率',
  
  // 业务健康度
  'user.daily_active': '日活用户',
  'user.retention_7d': '7日留存率',
  'energy.avg_consumption': '平均电量消费',
  'revenue.daily': '日收入',
};

// 告警阈值
const ALERTS = {
  'deepseek_error_rate > 5%': 'P1-DeepSeek API异常',
  'payment_success_rate < 95%': 'P1-支付成功率下降',
  'chat_response_time > 10s': 'P2-对话响应慢',
  'database_pool_usage > 80%': 'P2-数据库连接池告警',
  'edge_function_memory > 200MB': 'P2-内存使用过高',
  'daily_revenue_drop > 30%': 'P3-收入异常下降',
};
```

---

> **文档结束**  
> 本文档由Platonic AI架构设计团队维护  
> 如有疑问请联系架构负责人
