# Corolas | Platonic — Edge Functions 技术文档

> **文档版本**: v1.0  
> **适用项目**: Platonic AI 伴侣系统  
> **编写日期**: 2025年6月  
> **Edge Functions 总数**: 13 个  
> **共享模块**: 4 个

---

## 目录

- [一、全局概述](#一全局概述)
- [二、共享模块](#二共享模块)
- [三、Edge Functions 详细文档](#三edge-functions-详细文档)
  - [1. chat-stream](#1-chat-stream)
  - [2. drama-chat](#2-drama-chat)
  - [3. drama-session](#3-drama-session)
  - [4. energy](#4-energy)
  - [5. payment-create](#5-payment-create)
  - [6. payment-callback](#6-payment-callback)
  - [7. achievement-check](#7-achievement-check)
  - [8. consolidation](#8-consolidation)
  - [9. milestone-adjust](#9-milestone-adjust)
  - [10. proactive](#10-proactive)
  - [11. proactive-scheduler](#11-proactive-scheduler)
  - [12. seed-data](#12-seed-data)
  - [13. setup-proactive](#13-setup-proactive)
- [四、部署配置汇总](#四部署配置汇总)
- [五、数据库表关联图](#五数据库表关联图)
- [六、外部依赖汇总](#六外部依赖汇总)
- [七、安全策略总览](#七安全策略总览)

---

## 一、全局概述

### 1.1 系统架构

Platonic 项目的 Edge Functions 构建于 **Supabase Edge Functions** (Deno Runtime) 之上，构成了 AI 伴侣系统的后端服务层。所有函数通过 HTTP 接口对外暴露，内部通过 Supabase JS Client 与 PostgreSQL 数据库交互，通过 REST API 与 DeepSeek 大模型服务交互。

### 1.2 函数分类

| 类别 | 函数 | 说明 |
|------|------|------|
| **核心聊天** | `chat-stream`, `drama-chat` | SSE 流式对话（普通聊天 + 剧情模式） |
| **会话管理** | `drama-session` | 剧情会话的 CRUD 管理 |
| **能量系统** | `energy` | 能量账户查询与消费（乐观锁） |
| **支付系统** | `payment-create`, `payment-callback` | ZPay 支付订单创建与回调处理 |
| **成就系统** | `achievement-check` | 成就检测与解锁 |
| **记忆系统** | `consolidation` | STM -> LTM -> 远事记忆的 AI 整合 |
| **亲密度系统** | `milestone-adjust` | 每日亲密度评分调整 |
| **主动消息** | `proactive`, `proactive-scheduler` | AI 主动发消息 + 定时调度 |
| **系统工具** | `seed-data`, `setup-proactive` | 种子数据初始化 + 定时任务配置 |

### 1.3 环境变量清单

| 变量名 | 用途 | 哪些函数使用 |
|--------|------|-------------|
| `SUPABASE_URL` | Supabase 项目 URL | 全部 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务角色密钥（绕过 RLS） | 全部 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | chat-stream, drama-chat, consolidation, milestone-adjust, proactive, proactive-scheduler |
| `ZPAY_PID` | ZPay 商户 ID | payment-create, payment-callback |
| `ZPAY_KEY` | ZPay 商户密钥 | payment-create, payment-callback |
| `SCHEDULER_SECRET` | 调度器密钥 | proactive-scheduler |

### 1.4 技术栈

- **运行时**: Deno (via Supabase Edge Functions)
- **Supabase Client**: `@supabase/supabase-js@2.39.0`
- **AI 模型**: DeepSeek V4 Flash (`deepseek-v4-flash`)
- **支付网关**: ZPay (zpayz.cn)
- **数据库**: PostgreSQL 16 (via Supabase)
- **定时调度**: pg_cron (PostgreSQL 扩展)

---

## 二、共享模块

### 2.1 `_shared/cors.ts` — CORS 跨域配置

**文件路径**: `supabase/functions/_shared/cors.ts`

**导出内容**:

```typescript
export const corsHeaders: Record<string, string>
export function handleCors(req: Request): Response | null
```

**CORS 配置详情**:

| 响应头 | 值 | 说明 |
|--------|------|------|
| `Access-Control-Allow-Origin` | `*` | 允许所有来源 |
| `Access-Control-Allow-Headers` | `authorization, x-client-info, apikey, content-type` | 允许的请求头 |
| `Access-Control-Allow-Methods` | `POST, GET, OPTIONS` | 允许的 HTTP 方法 |

**handleCors 函数逻辑**:
1. 检查请求方法是否为 `OPTIONS`（预检请求）
2. 如果是，返回状态码 200 的 `Response('ok')`
3. 如果不是，返回 `null`，由调用方继续处理

> **注意**: 生产环境函数（如 chat-stream）通常内联自己的 CORS 配置（限定 `https://platonic.corolas.top`），不使用此共享模块。

---

### 2.2 `_shared/deepseek.ts` — DeepSeek API 调用

**文件路径**: `supabase/functions/_shared/deepseek.ts`

**导出内容**:

```typescript
export interface DeepSeekMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export async function* streamChat(messages, options): AsyncGenerator<string>
export async function chatJSON<T>(messages, options): Promise<T>
export function buildSystemPrompt(companion, mood, memories, milestone): string
```

#### `streamChat()` — SSE 流式对话

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `messages` | `DeepSeekMessage[]` | 是 | 对话消息数组 |
| `options.temperature` | `number` | 否 | 温度参数，默认 `0.8` |
| `options.max_tokens` | `number` | 否 | 最大 token 数，默认 `500` |
| `options.stream` | `boolean` | 否 | 是否流式输出，默认 `true` |

**处理流程**:
1. 从环境变量读取 `DEEPSEEK_API_KEY`
2. 向 `https://api.deepseek.com/v1/chat/completions` 发送 POST 请求
3. 使用模型 `deepseek-v4-flash`
4. 通过 `response.body.getReader()` 读取 SSE 流
5. 使用 `TextDecoder` 解码数据块
6. 解析 `data:` 开头的 SSE 行，提取 `choices[0].delta.content`
7. 遇到 `data: [DONE]` 时结束

#### `chatJSON()` — 非流式 JSON 输出

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `messages` | `DeepSeekMessage[]` | 是 | 对话消息数组 |
| `options.temperature` | `number` | 否 | 默认 `0.5` |
| `options.max_tokens` | `number` | 否 | 默认 `2000` |

**特性**: 设置 `response_format: { type: 'json_object' }`，确保输出合法 JSON。

#### `buildSystemPrompt()` — 系统提示构建

**输入参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `companion` | `object` | 伴侣表完整数据（昵称、性别、年龄、五大人格、背景等） |
| `mood` | `object | null` | 情绪记录（pleasure, arousal, dominance, valence） |
| `memories` | `any[]` | LTM 记忆列表 |
| `milestone` | `object | null` | 亲密度里程碑记录 |

**核心逻辑**:
1. **五大人格映射**: 将 0-100 的数值映射到 10 级描述文本（如开放性 75 -> "很开放"）
2. **情绪状态计算**: 根据 PAD 模型（pleasure/arousal/dominance）映射到中文情绪词
3. **里程碑映射**: 阶段 1-5 分别对应「初见乍欢」「渐入佳境」「暗生情愫」「情投意合」「心有灵犀」
4. **记忆格式化**: 将 LTM 记忆按类型和重要性格式化
5. **规则注入**: 注入角色扮演规则（禁止打破第四面墙、中文回复 300-500 字等）

**输出**: 完整的系统提示字符串，约 1000-2000 字。

---

### 2.3 `_shared/supabase.ts` — Supabase 客户端工具

**文件路径**: `supabase/functions/_shared/supabase.ts`

**导出内容**:

```typescript
export function getSupabaseClient(authHeader?: string): SupabaseClient
export async function getUser(supabase: any): Promise<User>
export async function checkEnergy(supabase: any, userId: string, cost: number): Promise<boolean>
export async function consumeEnergy(supabase: any, userId: string, cost: number, description: string): Promise<boolean>
export async function getCompanionForUser(supabase: any, userId: string): Promise<any>
export async function getRecentMessages(supabase: any, companionId: string, limit: number): Promise<any[]>
export async function getLTMMemories(supabase: any, companionId: string, limit: number): Promise<any[]>
export async function getMoodRecord(supabase: any, companionId: string): Promise<any | null>
export async function getAnteriorMemories(supabase: any, companionId: string): Promise<any[]>
```

#### `getSupabaseClient()`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `authHeader` | `string` | 否 | JWT 授权头，用于传递用户身份 |

**逻辑**: 使用 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 创建客户端。如果提供 `authHeader`，则在全局 headers 中设置 `Authorization`，使后续的 `supabase.auth.getUser()` 能正确解析用户身份。

#### `consumeEnergy()` — 能量消费（含事务）

**处理流程**:
1. 查询 `energy_accounts` 表，获取用户账户（`id`, `balance`）
2. 检查余额是否充足
3. 更新账户余额（`balance - cost`）
4. 在 `energy_transactions` 表中插入消费记录
5. 如果步骤 4 失败，回滚余额（重新写入旧余额）
6. 返回 `true`（成功）或 `false`（失败）

---

### 2.4 `_shared/zpay.ts` — ZPay 支付集成

**文件路径**: `supabase/functions/_shared/zpay.ts`

**导出内容**:

```typescript
export function getZpayConfig(): { pid: string; key: string; }
export function generateZpaySign(params: Record<string, string>, key: string): string
export function createZpayOrder(params: object): { url: string; sign: string; }
export function verifyZpayCallback(params: Record<string, string>, key: string): boolean
export function generateOutTradeNo(): string
```

#### `generateZpaySign()` — 签名生成

**算法**:
1. 过滤掉 `sign`、`sign_type` 字段和空值字段
2. 按键名字母升序排序
3. 用 `&` 拼接为 `key1=value1&key2=value2` 格式
4. 末尾追加商户密钥 `key`
5. 返回 Base64 编码（简化版；实际 ZPay 使用 MD5）

#### `createZpayOrder()` — 创建支付订单

**输入参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `pid` | `string` | 商户 ID |
| `type` | `string` | 支付类型（如 `alipay`） |
| `out_trade_no` | `string` | 商户订单号 |
| `notify_url` | `string` | 异步回调 URL |
| `return_url` | `string` | 同步返回 URL |
| `name` | `string` | 商品名称 |
| `money` | `string` | 金额（元） |
| `clientip` | `string` | 客户端 IP |
| `device` | `string` | 设备类型 |
| `key` | `string` | 商户密钥 |

**输出**: 支付跳转 URL（`https://zpayz.cn/submit.php?...`）和签名。

#### `generateOutTradeNo()` — 订单号生成

**格式**: `PLATONIC_${timestamp}_${random}`  
**示例**: `PLATONIC_1718001234567_A3B9C2`

---

## 三、Edge Functions 详细文档

---

### 1. chat-stream

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | SSE 流式对话（核心聊天功能）。接收用户消息，调用 DeepSeek AI 生成回复，以 SSE 流式返回。同时处理情绪检测、能量消费、消息持久化、亲密度更新、记忆整合触发等。 |
| **重要性** | **极高** — 系统最核心的功能 |
| **触发方式** | 前端 HTTP POST 请求 |
| **调度频率** | 实时（每次用户发送消息时） |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/chat-stream` |
| Content-Type | `application/json` |
| 响应类型 | `text/event-stream` (SSE) |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |
| `Content-Type` | 是 | `application/json` |

**请求体格式**:

```json
{
  "message": "用户输入的消息文本"
}
```

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| `message` | `string` | 是 | 用户发送的消息内容 | `"今天过得怎么样？"` |

**响应体格式 (SSE 流)**:

```
data: 你
data: 好
data: 呀
data: ～
data: 今
data: 天
data: ...
data: [DONE]
```

| SSE 事件 | 说明 |
|----------|------|
| `data: <text>` | AI 生成的文本片段（逐字/逐词流式推送） |
| `data: [DONE]` | 流式传输完成标志 |
| `data: [ERROR] <message>` | 发生错误 |

**处理流程**:

1. **CORS 处理**: 响应 OPTIONS 预检请求（204 No Content）
2. **身份验证**: 从 `Authorization` 头提取 JWT，调用 `supabase.auth.getUser(jwt)` 验证
3. **请求体解析**: 解析 JSON 请求体，检查 `message` 字段非空
4. **能量检查与自动创建**:
   - 查询 `energy_accounts` 表获取用户余额
   - 如果账户不存在，**自动创建**（balance=0, version=1）
   - 检查余额是否 >= 50（单次消息消耗），不足返回 402 错误
5. **获取伴侣数据**: 从 `companions` 表查询用户的 AI 伴侣
6. **并行获取上下文数据**:
   - `intimacy_records` — 亲密度记录
   - `ltm_memories` — 长期记忆（按重要性降序，最多 20 条）
   - `mood_records` — 情绪记录（最新 1 条）
   - `stm_messages` — 短期记忆消息（最近 15 条）
   - `profiles` — 用户配置（获取 timezone）
7. **提取情绪上下文**: 从近期用户消息中提取情绪标签，保留最近 5 次
8. **提取待办事项**: 从记忆中过滤 `pending/todo/reminder` 类型的记忆
9. **消费能量**: 扣除 50 能量，记录交易流水
10. **保存用户消息**: 插入 `stm_messages` 表（含 speaker='user'）
11. **更新主动调度计划**（非阻塞）: 计算下次触发时间，upsert `proactive_schedule`
12. **异步情绪检测**（非阻塞）: 调用 DeepSeek 检测用户消息情绪，更新消息记录
13. **构建 DeepSeek 消息**:
    - System: 通过 `buildSystemPrompt()` 构建（含人格、记忆、情绪、时间等）
    - History: 将 STM 消息按时间正序排列，每条前缀加 `[用户/我 X分钟前]`
    - User: 当前消息
14. **SSE 流式响应**: 调用 `streamChat()` 获取 AI 流式输出，逐块推送给客户端
15. **AI 情绪检测**: 对完整 AI 回复进行情绪检测
16. **保存 AI 回复**: 插入 `stm_messages` 表（含情绪标签）
17. **更新亲密度**: 调用 `update_intimacy` RPC 函数
18. **触发记忆整合**（非阻塞）: 异步调用 `consolidation` Edge Function

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `energy_accounts` | SELECT, UPDATE（自动 INSERT） | 能量余额查询与扣减 |
| `energy_transactions` | INSERT | 消费流水记录 |
| `companions` | SELECT | 获取伴侣信息 |
| `intimacy_records` | SELECT, RPC update_intimacy | 亲密度查询与更新 |
| `ltm_memories` | SELECT | 获取长期记忆 |
| `mood_records` | SELECT | 获取情绪记录 |
| `stm_messages` | INSERT (x2) | 保存用户消息和 AI 回复 |
| `profiles` | SELECT | 获取用户时区 |
| `proactive_schedule` | UPSERT | 更新主动消息调度 |

**外部 API 调用**:

| 服务 | 调用次数 | 说明 |
|------|----------|------|
| DeepSeek API | 1-2 次 | 主对话流（必调）+ 情绪检测（异步，可能不调） |

**错误处理**:

| 错误码 | 触发条件 | 响应 |
|--------|----------|------|
| `401 Unauthorized` | 缺少/无效 JWT | JSON `{ error: 'Unauthorized' }` |
| `402` | 能量不足 | JSON `{ error: 'Insufficient energy', balance }` |
| `500` | 内部错误 | SSE 流中返回 `[ERROR] message` |

**安全机制**:

- **JWT 验证**: 通过 `supabase.auth.getUser()` 验证
- **CORS**: 限定 `https://platonic.corolas.top`
- **能量校验**: 每次消息消耗 50 能量，余额不足拒绝服务

**代码关键逻辑说明**:

- **指数退避重试**: DeepSeek 调用失败时自动重试 3 次，延迟分别为 1s, 2s, 4s
- **30 秒超时**: 每次 API 调用设置 30 秒超时
- **乐观锁**: 能量扣减使用 `version` 字段实现乐观锁
- **情绪检测超时**: 500ms 超时，失败不影响主流程
- **时区感知**: 根据用户时区格式化当前时间，生成时段描述（清晨/上午/中午/下午/傍晚/晚上/深夜）
- **时间感知前缀**: 历史消息前缀包含 `timeSince()` 计算的时间差，AI 能感知对话间隔

---

### 2. drama-chat

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | SSE 流式剧情对话。在剧情空间中，AI 伴侣完全沉浸在预设剧情场景中，以第一人称 RPG 方式与用户互动。 |
| **重要性** | **高** — 核心剧情功能 |
| **触发方式** | 前端 HTTP POST 请求 |
| **调度频率** | 实时 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/drama-chat` |
| 响应类型 | `text/event-stream` (SSE) |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |
| `Content-Type` | 是 | `application/json` |

**请求体格式**:

```json
{
  "session_id": " drama_session_uuid",
  "message": "用户输入的剧情消息"
}
```

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| `session_id` | `string` | 是 | 剧情会话 UUID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `message` | `string` | 否 | 用户消息（为空则只获取 AI 开场白） | `"我走进了这个房间..."` |

**处理流程**:

1. **CORS 处理**: 响应 OPTIONS 预检请求
2. **身份验证**: JWT 验证
3. **获取剧情会话**: 从 `drama_sessions` 表查询 session，验证属于当前用户
4. **获取剧情定义**: 从 `drama_definitions` 表获取剧情信息（名称、场景设定、剧情提示）
5. **获取伴侣**: 从 `companions` 表获取伴侣的人格数据
6. **能量检查**: 查询余额，不足返回 402（每次消耗 30 能量）
7. **获取时区**: 从 `profiles` 表获取用户时区
8. **获取剧情历史**: 从 `drama_messages` 表获取最近 20 条消息
9. **构建剧情系统提示**: 包含身份、场景设定、剧情规则、对话历史
10. **保存用户消息**: 插入 `drama_messages` 表
11. **SSE 流式响应**: 调用 DeepSeek 生成 AI 回复
12. **保存 AI 回复**: 插入 `drama_messages` 表
13. **扣减能量**: 更新余额，记录交易
14. **更新会话上下文**: 更新 `context_memory` 和 `updated_at`

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `drama_sessions` | SELECT, UPDATE | 会话查询与上下文更新 |
| `drama_definitions` | SELECT | 剧情定义 |
| `companions` | SELECT | 伴侣数据 |
| `drama_messages` | INSERT (x2) | 用户消息和 AI 回复 |
| `energy_accounts` | SELECT, UPDATE | 能量查询与扣减 |
| `energy_transactions` | INSERT | 交易流水 |
| `profiles` | SELECT | 时区 |

**代码关键逻辑说明**:

- **完全沉浸模式**: AI 被严格要求"忘记自己是 AI"，完全沉浸在剧情角色中
- **动作与心理描写**: AI 可以用 `*星号*` 标注动作、表情、心理活动
- **剧情场景驱动**: 系统提示包含 `scene_setting` 和 `drama_prompt`，AI 的回应必须贴合场景
- **旁白角色**: `speaker='narrator'` 用于场景描述和剧情推进

---

### 3. drama-session

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 剧情会话管理。提供剧情列表查询、会话创建/获取/完成/重启等操作。 |
| **重要性** | **高** — 剧情空间入口 |
| **触发方式** | 前端 HTTP POST 请求 |
| **调度频率** | 按需调用 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/drama-session` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |
| `Content-Type` | 是 | `application/json` |

**请求体格式**:

```json
{
  "action": "list|start|get|complete|restart",
  "drama_id": "uuid",
  "session_id": "uuid"
}
```

**action 说明**:

| action | 必填参数 | 说明 |
|--------|----------|------|
| `list` | 无 | 获取所有可用剧情列表及用户进度 |
| `start` | `drama_id` | 开始/恢复某个剧情 |
| `get` | `session_id` | 获取会话详情及消息历史 |
| `complete` | `session_id` | 完成某个剧情会话 |
| `restart` | `drama_id` | 重新开始某个剧情（删除旧数据） |

**处理流程（按 action）**:

#### `list` 流程

1. 查询 `drama_definitions` 表中 `is_active=true` 的剧情，按 `sort_order` 排序
2. 查询 `drama_progress` 表获取用户解锁进度
3. 查询 `drama_sessions` 表中 `active/paused` 状态的会话
4. 合并数据：将进度和活跃会话合并到剧情定义中
5. 返回完整剧情列表（含 `is_unlocked`, `active_session` 等字段）

#### `start` 流程

1. 检查是否已有活跃会话（同一 `user_id + drama_id`，状态为 `active/paused`）
2. 如果有，直接返回现有会话
3. 如果没有，获取用户的 `companion_id`
4. 创建新会话：插入 `drama_sessions`（status='active', context_memory={}）
5. 获取剧情定义，生成开场旁白
6. 插入开场旁白到 `drama_messages`（speaker='narrator'）
7. 更新 `drama_progress`（标记为已解锁）
8. 返回会话信息和 `is_new` 标志

#### `get` 流程

1. 验证会话存在且属于当前用户
2. 查询 `drama_definitions` 获取剧情信息
3. 查询 `companions` 获取伴侣基本信息
4. 查询 `drama_messages` 按时间升序获取全部消息
5. 返回 `{ session, drama, companion, messages }`

#### `complete` 流程

1. 验证会话存在且属于当前用户
2. 更新会话状态为 `completed`，设置 `ended_at`
3. 更新 `drama_progress` 标记 `completed_at`
4. 返回 `{ success: true }`

#### `restart` 流程

1. 查询该用户+剧情的所有旧会话
2. 循环删除每个会话关联的 `drama_messages`
3. 删除旧会话记录
4. 调用 `createOrGetSession` 创建全新会话
5. 返回新会话信息

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `drama_definitions` | SELECT | 剧情定义查询 |
| `drama_sessions` | SELECT, INSERT, UPDATE, DELETE | 会话 CRUD |
| `drama_messages` | SELECT, INSERT, DELETE | 消息操作 |
| `drama_progress` | SELECT, UPSERT | 进度追踪 |
| `companions` | SELECT | 获取伴侣 |

**错误处理**:

| 错误码 | 触发条件 |
|--------|----------|
| `401` | JWT 无效或缺失 |
| `500` | 数据库错误或参数缺失 |

---

### 4. energy

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 能量账户管理。提供余额查询和能量消费功能，使用乐观锁防止并发冲突。 |
| **重要性** | **高** — 核心经济系统 |
| **触发方式** | 前端 HTTP GET/POST 请求 |
| **调度频率** | 按需调用 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `GET`, `POST` |
| 路径 | `/functions/v1/energy` |
| 响应类型 | `application/json` |

**GET 请求 — 查询余额**

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |

**响应体**:

```json
{
  "balance": 1250,
  "total_recharged": 5000,
  "total_consumed": 3750
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `balance` | `number` | 当前余额 |
| `total_recharged` | `number` | 累计充值 |
| `total_consumed` | `number` | 累计消费 |

**POST 请求 — 消费能量**

**请求体**:

```json
{
  "amount": 50,
  "description": "chat_message"
}
```

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| `amount` | `number` | 是 | 消费金额（正整数） | `50` |
| `description` | `string` | 否 | 消费描述 | `"chat_message"` |

**成功响应**:

```json
{
  "success": true,
  "remaining_balance": 1200
}
```

**失败响应（余额不足）**:

```json
{
  "success": false,
  "reason": "insufficient",
  "balance": 30
}
```

**失败响应（并发冲突）**:

```json
{
  "success": false,
  "reason": "concurrent_conflict",
  "message": "Retry needed due to concurrent update"
}
```

**处理流程 (GET)**:

1. 验证 JWT
2. 查询 `energy_accounts` 表（`SELECT * ... user_id = ?`）
3. 返回余额信息

**处理流程 (POST)**:

1. 验证 JWT
2. 解析请求体，验证 `amount > 0`
3. **乐观锁读取**: `SELECT id, balance, version FROM energy_accounts WHERE user_id = ?`
4. 检查余额充足性
5. **条件更新**: `UPDATE energy_accounts SET balance = ?, version = version + 1 WHERE id = ? AND version = ?`
6. 检查更新行数（`count === 0` 表示并发冲突）
7. 插入 `energy_transactions` 记录
8. 返回结果

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `energy_accounts` | SELECT, UPDATE（乐观锁） | 余额查询与更新 |
| `energy_transactions` | INSERT | 消费流水 |

**乐观锁机制详解**:

```
读取: balance=1000, version=5
计算: newBalance=950
更新: UPDATE ... SET balance=950, version=6 WHERE id=X AND version=5
      ↑ 如果此时 version 已被改为 6，则 count=0，返回并发冲突
```

---

### 5. payment-create

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 创建 ZPay 支付订单。根据用户选择的套餐生成支付链接，用户点击后跳转至 ZPay 完成支付。 |
| **重要性** | **高** — 付费转化入口 |
| **触发方式** | 前端 HTTP POST 请求 |
| **调度频率** | 按需调用 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/payment-create` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |
| `Content-Type` | 是 | `application/json` |

**请求体**:

```json
{
  "plan_id": "uuid_of_pricing_plan"
}
```

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| `plan_id` | `string` | 是 | 套餐 ID（pricing_plans 表主键） | `"uuid-string"` |

**响应体**:

```json
{
  "order_no": "PLATONIC_1718001234567_A3B9",
  "payment_url": "https://zpayz.cn/submit.php?pid=...&sign=...",
  "amount": "29.90",
  "energy_amount": 3000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `order_no` | `string` | 商户订单号 |
| `payment_url` | `string` | ZPay 支付跳转链接 |
| `amount` | `string` | 支付金额（元） |
| `energy_amount` | `number` | 获得的总能量数（含赠送） |

**处理流程**:

1. 验证 JWT
2. 从请求体获取 `plan_id`
3. 查询 `pricing_plans` 表验证套餐有效性（`is_active = true`）
4. 计算金额: `amount = price_cents / 100`（单位：元）
5. 计算总能量: `totalEnergy = energy_amount + bonus_amount`
6. 生成订单号: `PLATONIC_${timestamp}_${random}`
7. 插入 `payment_orders` 表（状态 `pending`，30 分钟过期）
8. 构建 ZPay 支付参数（含 MD5 签名）
9. 生成支付 URL
10. 返回订单信息和支付链接

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `pricing_plans` | SELECT | 套餐信息查询 |
| `payment_orders` | INSERT | 创建待支付订单 |

**外部 API 调用**:

| 服务 | 说明 |
|------|------|
| ZPay (zpayz.cn) | 生成支付跳转 URL，用户浏览器实际跳转到 ZPay |

**安全机制**:

- 使用 CryptoJS.MD5 生成 ZPay 签名
- 订单号包含时间戳和随机字符串，防止重放攻击
- `idempotency_key` 确保幂等性

---

### 6. payment-callback

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | ZPay 异步回调处理。接收 ZPay 支付结果通知，验证签名，更新订单状态。**不需要 JWT 验证**（由 ZPay 服务器调用）。 |
| **重要性** | **极高** — 支付完成的关键链路 |
| **触发方式** | ZPay 服务器 HTTP GET 回调 |
| **调度频率** | 支付完成后由 ZPay 触发 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `GET` |
| 路径 | `/functions/v1/payment-callback` |
| 响应类型 | `text/plain` |

**请求参数 (URL Query String)**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `out_trade_no` | `string` | 商户订单号 |
| `trade_status` | `string` | 交易状态（`TRADE_SUCCESS` 表示成功） |
| `money` | `string` | 实际支付金额 |
| `sign` | `string` | ZPay 签名 |
| `sign_type` | `string` | 签名类型（`MD5`） |

**响应**:

| 响应体 | 说明 |
|--------|------|
| `success` | 处理成功（ZPay 要求返回此字符串） |
| `sign_error` | 签名验证失败 |
| `error` | 内部错误 |

**处理流程**:

1. 解析 URL 查询参数
2. 提取 `out_trade_no`、`trade_status`、`money`
3. 使用 ZPay 密钥重新计算签名
4. 对比签名（防止篡改）
5. 查询 `payment_orders` 表获取订单信息
6. 检查订单是否已处理（`paid` 或 `completed` 状态则跳过）
7. 如果 `trade_status === 'TRADE_SUCCESS'`:
   - 更新订单状态为 `paid`
   - 设置 `paid_cents`
   - **能量充值由数据库触发器 `trg_payment_orders_status` 自动处理**
8. 无论结果如何，返回 `success`（ZPay 要求）

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `payment_orders` | SELECT, UPDATE | 订单查询与状态更新 |

**安全机制**:

- **签名验证**: MD5 签名对比，确保请求来自 ZPay
- **幂等处理**: 已支付订单直接返回 success，防止重复充值
- **错误静默**: 找不到订单也返回 success（避免 ZPay 重试风暴）

> **关键设计**: 能量充值不在这个函数中直接处理，而是由数据库触发器自动完成。这种设计确保了即使回调处理失败，只要订单状态更新为 paid，能量一定会到账。

---

### 7. achievement-check

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 成就检测引擎。检查用户行为是否满足成就定义条件，解锁成就并记录进度。支持三种触发类型：一次性、累积型、阈值型。 |
| **重要性** | **中** — 游戏化系统核心 |
| **触发方式** | 被其他 Edge Function 调用（chat-stream、consolidation、milestone-adjust 等） |
| **调度频率** | 事件驱动 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/achievement-check` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |
| `Content-Type` | 是 | `application/json` |

**请求体**:

```json
{
  "event_type": "chat",
  "event_target": "send_message",
  "event_value": 1
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `event_type` | `string` | 否 | `"chat"` | 事件类型 |
| `event_target` | `string` | 否 | `"send_message"` | 事件目标 |
| `event_value` | `number` | 否 | `1` | 事件数值 |

**响应体**:

```json
{
  "unlocked": ["初次对话", "百次交流"],
  "errors": []
}
```

**处理流程**:

1. 验证 JWT 获取用户 ID
2. 从请求体获取 `event_type`、`event_target`、`event_value`
3. 查询 `achievement_definitions` 表中 `is_active = true` 的成就定义
4. 过滤匹配的成就定义:
   - `one_time` + `trigger_target` 匹配事件目标
   - `cumulative` + `trigger_target` 匹配
   - `threshold` + `trigger_target` 匹配且 `event_value >= trigger_value`
5. 对每个匹配成就:
   - 检查 `achievement_progress` 表是否已解锁
   - 如果已解锁则跳过
   - 计算新进度值: `newValue = current_value + event_value`
   - 判断是否满足解锁条件
   - 如果满足: upsert progress 记录（标记 `is_unlocked=true`, `unlocked_at=now`）
   - 如果不满足: 仅更新进度值
6. 返回解锁的成就列表和错误列表

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `achievement_definitions` | SELECT | 成就定义查询 |
| `achievement_progress` | SELECT, UPSERT | 成就进度查询与更新 |

**成就触发类型详解**:

| 类型 | 说明 | 示例 |
|------|------|------|
| `one_time` | 一次性成就，完成即解锁 | "初次对话" |
| `cumulative` | 累积型，累计达到阈值解锁 | "百次交流"（累计 100 次） |
| `threshold` | 阈值型，单次事件值达到阈值解锁 | "单次长对话"（一次 50 条消息） |

---

### 8. consolidation

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 记忆整合系统（STM -> LTM -> 远事记忆）。对话结束后（最后消息 > 1 小时），由 AI 分析对话内容，提取结构化长期记忆，进行语义去重后合并入库。同时生成日记条目和远事记忆任务。 |
| **重要性** | **极高** — AI 记忆系统的核心引擎 |
| **触发方式** | 被 chat-stream 异步调用 / 被 pg_cron 定时调用 |
| **调度频率** | 每 15 分钟（pg_cron）|

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/consolidation` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 否 | `Bearer <JWT_TOKEN>`（pg_cron 调用时使用 service_key） |

**请求体**: 无（函数扫描所有伴侣）

**响应体**:

```json
{
  "processed": 5,
  "skipped": 12,
  "memories_inserted": 8,
  "memories_merged": 3,
  "anterior_created": 4,
  "companions": 17,
  "elapsed_sec": "45.2"
}
```

**处理流程**:

1. 获取 Supabase 客户端
2. 查询所有活跃用户伴侣（排除测试用户 `'00000000-...'`）
3. 对每个伴侣循环处理:
   1. **获取最后消息时间**: 查询 `stm_messages` 最新一条
   2. **判断对话是否结束**: 最后消息 > 1 小时则认为对话已结束
   3. **获取上次整合时间**: 查询 `companion_consolidations` 表
   4. **获取待处理消息**: 获取上次整合后（或 24 小时内）的新消息，至少 3 条才处理
   5. **获取上下文数据**: 现有 LTM（最多 50 条）+ 往日日记（最近 3 篇）
   6. **AI 提取记忆**: 调用 DeepSeek 分析对话，提取结构化记忆
   7. **去重与入库**: 逐条检查是否重复，新记忆插入，相似记忆合并
   8. **创建远事记忆**: 插入 `anterior_memories` 表
   9. **生成日记**: 插入 `companion_diaries` 表
   10. **更新整合记录**: upsert `companion_consolidations`
4. 返回处理统计

**AI 提取的记忆结构**:

```typescript
interface ExtractedMemory {
  content: string;           // 记忆内容（简洁清晰，第三人称描述）
  type: 'fact' | 'preference' | 'event' | 'emotion' | 'relationship' | 'goal';
  importance: number;        // 0.0-1.0
  is_permanent: boolean;     // 是否永久保存
  confidence: number;        // 0.0-1.0 AI 置信度
  source_stm_ids: string[];  // 来源 STM 消息 ID
  context_quote: string;     // 支撑证据的对话原文
  time_anchor?: string;      // 时间锚点描述
}
```

**去重算法**:

1. **精确匹配**: 内容完全相同的跳过
2. **子串匹配**: 长度 > 10 且互相包含的跳过
3. **语义重叠**: 同类型 + 70% 以上词语重叠的跳过

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `companions` | SELECT | 获取所有伴侣 |
| `stm_messages` | SELECT | 获取待处理消息 |
| `companion_consolidations` | SELECT, UPSERT | 整合记录 |
| `ltm_memories` | SELECT, INSERT, UPDATE | 长期记忆 CRUD |
| `companion_diaries` | SELECT, INSERT | 日记 |
| `anterior_memories` | INSERT | 远事记忆任务 |

**外部 API 调用**:

| 服务 | 调用次数 | 说明 |
|------|----------|------|
| DeepSeek API | 每伴侣 1 次 | 记忆提取（JSON 输出，最多 3 次重试） |

**代码关键逻辑说明**:

- **重试机制**: DeepSeek 调用失败时指数退避重试（1s, 2s, 4s），30 秒超时
- **置信度过滤**: 置信度 < 0.5 的记忆被丢弃
- **批量处理**: 每次最多处理所有伴侣，每个伴侣独立失败不影响其他
- **日记生成**: AI 以伴侣第一人称写 200-400 字的温暖日记

---

### 9. milestone-adjust

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 亲密度里程碑调整系统。每日凌晨自动评估所有用户与伴侣的关系进展，基于多维度算法调整亲密度分数，检测里程碑跨越事件。 |
| **重要性** | **高** — 关系系统的核心 |
| **触发方式** | pg_cron 每日凌晨 3 点调用 |
| **调度频率** | 每日 1 次 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/milestone-adjust` |
| 响应类型 | `application/json` |

**请求头**: 无特殊要求（由 pg_cron 使用 service_key 调用）

**响应体**:

```json
{
  "adjusted": 5,
  "total_companions": 12,
  "duration_ms": 45200,
  "timestamp": "2025-06-01T03:00:45.200Z",
  "details": [...]
}
```

**处理流程**:

1. 获取所有伴侣列表
2. 批量获取所有亲密度记录
3. 对每个伴侣执行评估:
   1. **获取最近 24 小时消息**: 从 `stm_messages` 表
   2. **获取最近 24 小时 LTM**: 从 `ltm_memories` 表
   3. **获取最后消息时间**: 计算距今天数
   4. **LTM 记忆评分**: 根据记忆类型加分
   5. **情绪质量评分**: 根据正负情绪占比加分/减分
   6. **对话质量评分**: 根据消息数量和深度加分
   7. **不活跃惩罚**: 按未对话天数减分
   8. **DeepSeek 辅助分析**（可选，不阻塞）: 分析对话摘要，生成关系评分
   9. **汇总计算**: 各维度 delta 求和
   10. **计算新分数**: `newScore = max(0, min(100, currentScore + totalDelta))`
   11. **检测里程碑事件**: 检查是否跨越阈值（20, 40, 60, 80）
   12. **保存记录**: upsert `intimacy_records`
   13. **记录里程碑日记**: 如有跨越则插入 `companion_diaries`
4. 返回处理统计

**评分维度详解**:

#### LTM 记忆评分

| 记忆类型 | 条件 | 加分 |
|----------|------|------|
| `fact` | `is_permanent = true` 且 `importance >= 0.8` | +3 |
| `preference` | 无条件 | +2 |
| `emotion` | `importance >= 0.6` | +2 |
| `event` | 无条件 | +1 |
| `relationship` | 无条件 | +3 |
| 其他 | `importance >= 0.7` | +1 |

#### 情绪质量评分

| 条件 | 加分 |
|------|------|
| 正向情绪占比 > 60% | +2 |
| 负向情绪占比 > 60% | -2 |

#### 对话质量评分

| 条件 | 加分 |
|------|------|
| 消息数量 >= 50 | +3 |
| 消息数量 >= 20 | +2 |
| 平均消息长度 > 50 字 | +1 |
| 用户主动开启对话 | +1 |

#### 不活跃惩罚

| 未对话天数 | 减分 |
|------------|------|
| >= 30 天 | -10 |
| >= 7 天 | -3 |
| >= 3 天 | -1 |
| < 3 天 | 0 |

#### DeepSeek 辅助评分

- 调用 DeepSeek 分析最近 30 条对话
- 返回 `relationship_score` (0-10)
- 转换为 delta: `round((score - 5) * 0.5)`，范围 [-2.5, +2.5]
- 5 秒超时，失败不影响主流程

**里程碑阈值**:

| 阶段 | 分数范围 | 名称 |
|------|----------|------|
| 1 | 0-20 | 初见乍欢 |
| 2 | 21-40 | 渐入佳境 |
| 3 | 41-60 | 暗生情愫 |
| 4 | 61-80 | 情投意合 |
| 5 | 81-100 | 心有灵犀 |

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `companions` | SELECT | 获取伴侣列表 |
| `intimacy_records` | SELECT, UPSERT | 亲密度记录 |
| `stm_messages` | SELECT | 获取消息 |
| `ltm_memories` | SELECT | 获取 LTM |
| `companion_diaries` | INSERT | 里程碑日记 |

---

### 10. proactive

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | AI 主动消息生成。伴侣在特定时机主动给用户发送消息，营造真实陪伴感。基于时间感知、亲密度、长期记忆和待办事项生成个性化主动消息。 |
| **重要性** | **中** — 提升沉浸感的关键功能 |
| **触发方式** | 前端 HTTP POST 请求 / proactive-scheduler 调用 |
| **调度频率** | 由 scheduler 控制（随机 2 分钟 ~ 24 小时） |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/proactive` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>` |
| `Content-Type` | 是 | `application/json` |

**请求体**:

```json
{
  "companion_id": "companion_uuid"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `companion_id` | `string` | 否 | 伴侣 ID（不传则自动选择用户的伴侣） |

**响应体**:

```json
{
  "success": true,
  "message": "你今天过得怎么样呀～",
  "energy_deducted": 10,
  "balance_after": 1240
}
```

**处理流程**:

1. 验证 JWT
2. 获取伴侣（按 `companion_id` 或按 `user_id` 查找）
3. **能量检查**: 检查余额是否 >= 10，不足则跳过
4. **获取用户时区**: 从 `profiles` 表
5. **获取亲密度**: 从 `intimacy_records` 表
6. **获取 LTM 记忆**: 按重要性降序，最多 15 条
7. **获取远事记忆**: `status='active'`，按优先级排序，最多 5 条
8. **获取 STM 历史**: 最近 10 条消息
9. **计算距上次回复时间**: 计算小时数
10. **构建主动消息提示**: 包含时间感知、人格画像、记忆、待办事项
11. **调用 DeepSeek 生成消息**
12. **扣减能量**: 10 能量
13. **保存到 STM**: 插入 `stm_messages`（speaker='companion'）
14. **更新调度记录**: upsert `proactive_schedule`

**时间感知语调调整**:

| 距上次回复 | 语调指令 |
|------------|----------|
| < 0.5 小时 | 轻松自然，随口分享 |
| < 2 小时 | 温暖带一点俏皮 |
| < 6 小时 | 温柔关心，问问在忙什么 |
| < 12 小时 | 关切温柔，提醒注意休息 |
| < 24 小时 | 思念牵挂，表达不习惯 |
| >= 24 小时 | 淡淡思念和委屈，自言自语式想念 |

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `companions` | SELECT | 伴侣数据 |
| `energy_accounts` | SELECT, UPDATE | 能量查询与扣减 |
| `energy_transactions` | INSERT | 交易流水 |
| `profiles` | SELECT | 时区 |
| `intimacy_records` | SELECT | 亲密度 |
| `ltm_memories` | SELECT | 长期记忆 |
| `anterior_memories` | SELECT | 远事记忆 |
| `stm_messages` | INSERT | 保存主动消息 |
| `proactive_schedule` | UPSERT | 调度记录 |

---

### 11. proactive-scheduler

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 主动消息定时调度器。由 pg_cron 每分钟调用，扫描到期的调度计划，逐个触发主动消息生成。每个用户独立处理，失败不影响其他用户。 |
| **重要性** | **中** — 主动消息系统的心脏 |
| **触发方式** | pg_cron 每分钟调用 |
| **调度频率** | 每分钟 1 次 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/proactive-scheduler` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `x-scheduler-secret` | 条件 | `SCHEDULER_SECRET` 环境变量的值（如果配置了） |

**请求体**: 无

**响应体**:

```json
{
  "processed": 3,
  "results": [
    { "user_id": "uuid", "status": "success", "message": "你好呀～" },
    { "user_id": "uuid", "status": "skipped", "error": "insufficient_energy" }
  ]
}
```

**处理流程**:

1. **认证**: 验证 `x-scheduler-secret`（如果配置了 `SCHEDULER_SECRET`）
2. 获取 Supabase 客户端
3. **查询到期计划**: 从 `proactive_schedule` 表中查询:
   - `next_trigger_at <= now()`
   - `is_triggered = false`
   - 最多 10 条（防止单次处理过多）
4. 如果没有到期计划，返回 `processed: 0`
5. **逐个处理用户**:
   - 调用 `processUser()` 内部函数
   - 包含完整的 proactive 消息生成逻辑（与 proactive function 相同）
6. **成功处理**:
   - 计算下次触发时间（随机 45-75 分钟，避开深夜 23:00-08:00）
   - upsert `proactive_schedule`（`is_triggered = false`, 设置新 `next_trigger_at`）
7. **失败处理**:
   - 标记 `is_triggered = true`（防止无限重试）
   - 记录失败原因
8. 返回处理结果

**下次触发时间计算**:

1. 基础间隔: 45 + random(0~30) 分钟
2. 检查目标时间是否在用户时区的 23:00-08:00 之间
3. 如果是，推迟到次日 08:30-09:30 之间
4. 返回 ISO 格式时间字符串

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `proactive_schedule` | SELECT, UPSERT, UPDATE | 调度计划查询与更新 |
| （间接通过 processUser） | — | 涉及 energy、stm、ltm、anterior 等全部表 |

---

### 12. seed-data

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 种子数据初始化。为新环境或测试快速创建完整的数据集：测试用户、能量账户、伴侣、亲密度、情绪记录、测试消息。 |
| **重要性** | **低** — 仅用于开发和测试 |
| **触发方式** | 前端/开发者 HTTP POST 调用 |
| **调度频率** | 一次性/按需 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/seed-data` |
| 响应类型 | `application/json` |

**请求头**:

| 头字段 | 必填 | 说明 |
|--------|------|------|
| `Authorization` | 是 | `Bearer <JWT_TOKEN>`（service_role） |
| `Content-Type` | 是 | `application/json` |

**请求体**:

```json
{
  "action": "full",
  "user_id": "11111111-1111-1111-1111-111111111111"
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `action` | `string` | 否 | `"full"` | 操作类型：`full`, `energy`, `companion`, `messages`, `profile` |
| `user_id` | `string` | 否 | 固定测试 UUID | 目标用户 ID |

**处理流程**:

1. 创建测试账号（调用 `create_test_account` RPC）
2. 根据 `action` 创建对应数据:
   - `energy`: 创建能量账户（balance=10000）
   - `companion`: 创建伴侣"小樱"（含五大人格参数）
   - `messages`: 创建 9 条测试对话消息
   - `profile`: 创建用户配置
3. 如果创建伴侣成功，同时创建:
   - 亲密度记录（score=53, stage=3 暗生情愫）
   - 情绪记录（pleasure=0.3, arousal=0.2）

**数据库操作**:

| 表名 | 操作 | 说明 |
|------|------|------|
| `energy_accounts` | UPSERT | 能量账户 |
| `companions` | SELECT, INSERT | 伴侣（先查后插） |
| `intimacy_records` | UPSERT | 亲密度 |
| `mood_records` | UPSERT | 情绪 |
| `stm_messages` | DELETE, INSERT | 消息（先删后插） |
| `profiles` | UPSERT | 用户配置 |

---

### 13. setup-proactive

**函数概述**

| 属性 | 说明 |
|------|------|
| **功能描述** | 初始化主动消息系统的数据库结构。创建必要的函数、索引、触发器和 pg_cron 定时任务。一次性执行，用于新环境部署。 |
| **重要性** | **低** — 仅用于初始化 |
| **触发方式** | 开发者手动调用 |
| **调度频率** | 一次性 |

**HTTP 接口定义**

| 属性 | 值 |
|------|------|
| 方法 | `POST` |
| 路径 | `/functions/v1/setup-proactive` |
| 响应类型 | `application/json` |

**请求头**: 无（`verify_jwt: false`）

**请求体**: 无

**响应体**:

```json
{
  "overall": "success",
  "steps": [
    { "step": 1, "name": "check_table", "status": "ok", "exists": true },
    { "step": 4, "name": "create_exec_sql", "status": "ok", "method": "pg_execute_rpc" },
    { "step": 5, "name": "create_index", "status": "ok" },
    { "step": 6, "name": "pg_cron", "status": "ok" }
  ]
}
```

**处理流程**:

1. 检查 `proactive_schedule` 表是否存在
2. 尝试通过 `pg_execute` RPC 创建 `exec_sql` 函数
3. 如果 `exec_sql` 创建成功，依次执行:
   - 创建索引 `idx_proactive_schedule_trigger`
   - 创建 `update_proactive_schedule_updated_at()` 触发器函数
   - 创建 `trigger_proactive_schedule_updated_at` 触发器
   - 启用 RLS
4. 配置 pg_cron:
   - 先取消已有任务（`cron.unschedule`）
   - 创建每分钟执行的新任务
5. 验证 cron 任务是否创建成功
6. 返回各步骤执行结果

**创建的 pg_cron 任务**:

```sql
SELECT cron.schedule('proactive-scheduler', '* * * * *', 
  $$SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/proactive-scheduler',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  )$$);
```

**数据库操作**:

| 操作 | 说明 |
|------|------|
| `CREATE FUNCTION exec_sql` | 动态 SQL 执行函数 |
| `CREATE INDEX` | 触发时间索引 |
| `CREATE TRIGGER` | 自动更新 updated_at |
| `cron.schedule()` | 每分钟调度任务 |

---

## 四、部署配置汇总

### verify_jwt 设置

| Edge Function | verify_jwt | 说明 |
|---------------|------------|------|
| `chat-stream` | `true` | 需用户登录 |
| `drama-chat` | `true` | 需用户登录 |
| `drama-session` | `true` | 需用户登录 |
| `energy` | `true` | 需用户登录 |
| `payment-create` | `true` | 需用户登录 |
| `payment-callback` | `false` | ZPay 服务器调用，无需 JWT |
| `achievement-check` | `true` | 需用户登录 |
| `consolidation` | `true/false` | 可被 pg_cron 调用，支持 service_key |
| `milestone-adjust` | `false` | 由 pg_cron 调用 |
| `proactive` | `true` | 需用户登录 |
| `proactive-scheduler` | `false` | 由 pg_cron 调用，使用 scheduler_secret |
| `seed-data` | `true` | 需管理员权限 |
| `setup-proactive` | `false` | 一次性初始化 |

### CORS 设置汇总

| Edge Function | Allow-Origin | 特殊头字段 |
|---------------|-------------|------------|
| 大多数 | `https://platonic.corolas.top` | `x-requested-with` |
| `proactive-scheduler` | `*` | 无 |
| `setup-proactive` | `*` | 无 |

---

## 五、数据库表关联图

```
+------------------+     +------------------+     +------------------+
|   auth.users     |<---|    companions    |<---|  intimacy_records|
+------------------+     +------------------+     +------------------+
       |                         |                        |
       |                         |                        v
       v                         v                 +------------------+
+------------------+     +------------------+      | companion_diaries|
|     profiles     |     |  stm_messages    |     +------------------+
+------------------+     +------------------+            |
       |                         |                       v
       |                         v                +------------------+
       |                  +------------------+     |ltm_memories      |
       |                  | mood_records     |    +------------------+
       |                  +------------------+            |
       |                                                  v
       |                                           +------------------+
       |                                           |anterior_memories |
       |                                           +------------------+
       |
       v
+------------------+     +------------------+     +------------------+
| energy_accounts  |<--->| energy_transactions|    | payment_orders   |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
+------------------+     +------------------+
|drama_definitions |<--->|  drama_sessions   |
+------------------+     +------------------+
                               |
                               v
                         +------------------+
                         |  drama_messages  |
                         +------------------+
                               |
                               v
                         +------------------+
                         |  drama_progress  |
                         +------------------+

+------------------+     +------------------+
|achievement_defs  |<--->|achievement_progress|
+------------------+     +------------------+

+---------------------------+
|   companion_consolidations |
+---------------------------+

+---------------------------+
|   proactive_schedule       |
+---------------------------+
```

---

## 六、外部依赖汇总

| 服务 | URL | 用途 | 调用函数 |
|------|-----|------|----------|
| DeepSeek API | `https://api.deepseek.com/v1/chat/completions` | AI 对话、情绪检测、记忆提取、关系分析 | chat-stream, drama-chat, consolidation, milestone-adjust, proactive, proactive-scheduler |
| ZPay | `https://zpayz.cn/submit.php` | 支付网关 | payment-create, payment-callback |
| Supabase REST | `<SUPABASE_URL>/rest/v1` | 数据库操作 | 全部 |
| Supabase Functions | `<SUPABASE_URL>/functions/v1` | Edge Function 间调用 | chat-stream -> consolidation |

---

## 七、安全策略总览

### 7.1 认证机制

| 层级 | 机制 | 说明 |
|------|------|------|
| API Gateway | JWT (Supabase Auth) | 通过 `Authorization: Bearer <token>` 头验证 |
| Service Role | `SUPABASE_SERVICE_ROLE_KEY` | 绕过 RLS，用于内部服务调用 |
| Scheduler | `SCHEDULER_SECRET` | `x-scheduler-secret` 头验证 |

### 7.2 能量消费安全

- 每次对话消费 50 能量
- 剧情对话消费 30 能量
- 主动消息消费 10 能量
- 使用乐观锁（`version` 字段）防止并发冲突
- 余额不足返回 402 状态码

### 7.3 支付安全

- MD5 签名验证（ZPay 回调）
- 订单号包含时间戳 + 随机数，防止重放
- 幂等性键确保同一请求不会重复创建订单
- 支付状态由数据库触发器自动处理能量充值

### 7.4 CORS 安全

- 生产环境限定 `https://platonic.corolas.top`
- 仅允许 `POST`, `GET`, `OPTIONS` 方法
- 暴露 `authorization, x-client-info, apikey, content-type` 头

### 7.5 RLS (Row Level Security)

- `proactive_schedule` 表启用 RLS
- 大多数数据访问通过 service_role_key 绕过 RLS（后端函数内部使用）
- 前端直接访问数据库需通过 RLS 策略

---

*文档结束 — Corolas | Platonic Edge Functions 技术文档 v1.0*
