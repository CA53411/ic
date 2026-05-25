# Corolas | Platonic -- 数据库Schema技术文档

> **文档版本**: v1.0  
> **适用版本**: Platonic MVP (Phase 0)  
> **数据库**: PostgreSQL 15+ (Supabase托管)  
> **文档日期**: 2025年1月  
> **编写规范**: 企业级技术手册格式，每个表的每个列均包含完整说明

---

## 目录

1. [项目概述](#1-项目概述)
2. [完整ER关系图](#2-完整er关系图)
3. [模块一：用户与认证系统](#3-模块一用户与认证系统)
4. [模块二：伴侣核心系统](#4-模块二伴侣核心系统)
5. [模块三：三层记忆系统](#5-模块三三层记忆系统)
6. [模块四：亲密度与情绪系统](#6-模块四亲密度与情绪系统)
7. [模块五：能量与支付系统](#7-模块五能量与支付系统)
8. [模块六：剧情空间系统](#8-模块六剧情空间系统)
9. [模块七：主动消息系统](#9-模块七主动消息系统)
10. [模块八：成就与礼物系统](#10-模块八成就与礼物系统)
11. [模块九：日历与日记系统](#11-模块九日历史与日记系统)
12. [模块十：通知与合规系统](#12-模块十通知与合规系统)
13. [模块十一：系统配置与字典表](#13-模块十一系统配置与字典表)
14. [归档表与视图](#14-归档表与视图)
15. [数据库函数汇总](#15-数据库函数汇总)
16. [触发器汇总](#16-触发器汇总)
17. [RLS策略汇总](#17-rls策略汇总)
18. [索引策略](#18-索引策略)
19. [数据流说明](#19-数据流说明)
20. [关键设计决策说明](#20-关键设计决策说明)

---

## 1. 项目概述

### 1.1 数据库设计目标

Corolas | Platonic 是一款AI虚拟伴侣应用，其数据库设计需支撑以下核心能力：

| 设计目标 | 具体描述 |
|---------|---------|
| **多层记忆架构** | 短期记忆(STM)保留最近3天对话，长期记忆(LTM)通过AI Consolidation自动提取，Anterior Memory管理待办事项 |
| **人格化伴侣** | 基于Big Five五大人格模型(0-100分)塑造每个伴侣的独特性格 |
| **亲密度进化** | 5阶段亲密度体系(初见乍欢→渐入佳境→暗生情愫→情投意合→心有灵犀)，分数0-100 |
| **情绪建模** | PAD三维情绪模型(Pleasure愉悦度/Arousal唤醒度/Dominance支配度) |
| **能量经济** | 电量(Energy)作为应用内货币，支撑对话消费和充值体系 |
| **剧情沉浸** | Drama Space提供第一人称RPG式剧情体验，独立于主对话 |
| **主动陪伴** | Proactive Schedule驱动伴侣主动发消息，时间感知+个性化 |
| **数据安全** | RLS行级安全策略确保用户数据隔离，符合GDPR要求 |

### 1.2 架构理念

**核心设计原则**：

1. **UUID主键策略**：除审计/日志表使用BIGSERIAL外，所有业务表主键使用`gen_random_uuid()`，确保分布式环境下无冲突
2. **RLS全覆盖**：所有用户数据表启用Row Level Security，策略基于`auth.uid()`进行用户级隔离
3. **外键级联显式声明**：每个外键均显式指定`ON DELETE`行为(RESTRICT/CASCADE/SET NULL)
4. **索引完备性**：每个外键列、RLS过滤列、时间范围查询列均建立索引
5. **触发器防递归**：通过`session variables`保护触发器防止无限递归
6. **乐观并发控制**：能量账户等高频更新表使用版本号(version)实现乐观锁
7. **SECURITY DEFINER审慎使用**：仅在需要绕过RLS执行内部操作时使用

### 1.3 技术栈

| 组件 | 技术 |
|------|------|
| 数据库引擎 | PostgreSQL 15+ |
| 托管平台 | Supabase |
| 扩展依赖 | uuid-ossp, pgcrypto, pg_cron, pg_net |
| 身份认证 | Supabase Auth (auth.users内置表) |
| 服务端逻辑 | Supabase Edge Functions (Deno Runtime) |
| AI模型 | DeepSeek Chat API (deepseek-v4-flash) |

---

## 2. 完整ER关系图

### 2.1 实体关系概览（文字描述）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PLATONIC DATABASE ER DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐               │
│  │ auth.users  │◄────────┤  profiles   │◄────────┤ companions  │               │
│  │ (内置)      │  1:1    │ (用户资料)   │  1:1    │ (伴侣)       │               │
│  └─────────────┘         └──────┬──────┘         └──────┬──────┘               │
│                                 │                       │                        │
│                    ┌────────────┼────────────┐         │                        │
│                    │            │            │         │                        │
│              ┌─────▼─────┐ ┌───▼────┐ ┌────▼────┐  ┌──▼─────┐                │
│              │energy_    │ │free_   │ │payment_ │  │intimacy│                │
│              │accounts   │ │trial_  │ │orders   │  │records │                │
│              └─────┬─────┘ └────────┘ └────┬────┘  └───┬────┘                │
│                    │                         │           │                       │
│              ┌─────▼─────┐            ┌─────▼─────┐   ┌──▼──────────┐         │
│              │energy_    │            │payment_   │   │intimacy_    │         │
│              │transactions│           │callbacks  │   │history      │         │
│              └───────────┘            └───────────┘   └─────────────┘         │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                         MEMORY SYSTEM (3-Layer)                      │        │
│  │                                                                      │        │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │        │
│  │  │stm_messages │     │ltm_memories │     │anterior_    │          │        │
│  │  │(短期记忆)    │     │(长期记忆)    │     │memories     │          │        │
│  │  │  保留3天    │────►│  AI提取    │     │(待办事项)   │          │        │
│  │  └─────────────┘     └──────┬──────┘     └──────┬──────┘          │        │
│  │                             │                   │                    │        │
│  │                      ┌──────▼──────┐     ┌─────▼──────┐            │        │
│  │                      │companion_   │     │calendar_   │            │        │
│  │                      │diaries      │     │events      │            │        │
│  │                      └─────────────┘     └────────────┘            │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                      DRAMA SPACE SYSTEM                              │        │
│  │                                                                      │        │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │        │
│  │  │drama_       │◄────┤drama_       │◄────┤drama_       │          │        │
│  │  │definitions  │ 1:N │sessions     │ 1:N │messages     │          │        │
│  │  └─────────────┘     └──────┬──────┘     └─────────────┘          │        │
│  │                             │                                       │        │
│  │                      ┌──────▼──────┐     ┌─────────────┐          │        │
│  │                      │drama_       │     │drama_       │          │        │
│  │                      │progress     │     │session_     │          │        │
│  │                      └─────────────┘     │intimacy     │          │        │
│  │                                          └─────────────┘          │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                      SUPPORTING MODULES                              │        │
│  │                                                                      │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │        │
│  │  │milestone_   │  │emotion_occs │  │pricing_     │  │system_    │ │        │
│  │  │definitions  │  │(OCC情绪字典)│  │plans        │  │config     │ │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │        │
│  │                                                                      │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │        │
│  │  │achievement_ │  │gift_catalog │  │companion_   │  │proactive_ │ │        │
│  │  │definitions  │  │             │  │diaries      │  │schedule   │ │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心关系说明

| 主表 | 从表 | 关系类型 | 级联行为 | 业务含义 |
|------|------|---------|---------|---------|
| `auth.users` | `profiles` | 1:1 | ON DELETE CASCADE | 认证用户对应一个Profile |
| `profiles` | `companions` | 1:1 | ON DELETE CASCADE | 每个用户只有一个伴侣 |
| `profiles` | `energy_accounts` | 1:1 | ON DELETE CASCADE | 每个用户一个能量账户 |
| `profiles` | `stm_messages` | 1:N | ON DELETE CASCADE | 用户拥有多条消息 |
| `companions` | `stm_messages` | 1:N | ON DELETE CASCADE | 伴侣关联多条消息 |
| `companions` | `ltm_memories` | 1:N | ON DELETE CASCADE | 伴侣拥有多条长期记忆 |
| `companions` | `intimacy_records` | 1:1 | ON DELETE CASCADE | 伴侣对应一条亲密度记录 |
| `companions` | `mood_records` | 1:N | ON DELETE CASCADE | 伴侣有多条情绪记录 |
| `companions` | `anterior_memories` | 1:N | ON DELETE CASCADE | 伴侣有多个待办事项 |
| `companions` | `companion_diaries` | 1:N | ON DELETE CASCADE | 伴侣有多篇日记 |
| `milestone_definitions` | `intimacy_records` | 1:N 引用 | ON DELETE RESTRICT | 亲密度阶段定义被引用 |
| `drama_definitions` | `drama_sessions` | 1:N | ON DELETE CASCADE | 一个剧情有多个会话 |
| `drama_sessions` | `drama_messages` | 1:N | ON DELETE CASCADE | 一个会话有多条消息 |
| `profiles` | `drama_progress` | 1:N | ON DELETE CASCADE | 用户有多个剧情进度 |

---

## 3. 模块一：用户与认证系统

### 3.1 auth.users（Supabase内置认证表）

| 属性 | 说明 |
|------|------|
| **表名** | `auth.users` |
| **来源** | Supabase Auth系统内置表，不可修改结构 |
| **用途** | 存储所有注册用户的基本认证信息 |
| **关联** | 本系统所有用户数据均通过`profiles.id`与之1:1关联 |

**关键列说明**：

| 列名 | 数据类型 | 约束 | 说明 |
|------|---------|------|------|
| `id` | uuid | PK, 默认gen_random_uuid() | 用户唯一标识，全局使用此ID关联 |
| `email` | varchar(255) | 唯一 | 用户邮箱，认证凭据 |
| `encrypted_password` | varchar(255) | - | 加密密码(Supabase自动处理) |
| `email_confirmed_at` | timestamptz | - | 邮箱确认时间 |
| `created_at` | timestamptz | 默认now() | 注册时间 |
| `last_sign_in_at` | timestamptz | - | 最后登录时间 |
| `raw_app_meta_data` | jsonb | - | 应用元数据(角色等) |
| `raw_user_meta_data` | jsonb | - | 用户元数据(昵称等) |

---

### 3.2 profiles（用户资料扩展表）

| 属性 | 说明 |
|------|------|
| **表名** | `profiles` |
| **用途** | 扩展Supabase Auth用户信息，存储应用级用户资料 |
| **关联模块** | 所有模块 |
| **主键** | `id` (uuid) |
| **数据量预估** | 与注册用户数1:1 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, FK→auth.users(id) ON DELETE CASCADE | - | NO | 主键，与auth.users.id完全对应 |
| `nickname` | text | NOT NULL | 'User' | NO | 用户昵称，前端展示 |
| `email` | text | NOT NULL | - | NO | 邮箱地址，冗余存储便于查询 |
| `avatar_url` | text | - | - | YES | 用户头像URL |
| `language` | text | NOT NULL | 'zh-CN' | NO | 用户语言偏好，影响UI和AI回复语言 |
| `timezone` | text | NOT NULL | 'Asia/Shanghai' | NO | 用户时区，用于时间感知功能 |
| `status` | text | NOT NULL, CHECK(status IN ('NO_COMPANION', 'HAS_COMPANION')) | 'NO_COMPANION' | NO | 用户状态标记，是否有伴侣 |
| `onboarding_at` | timestamptz | - | - | YES | 首次完成引导流程的时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 记录创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间(触发器自动维护) |
| `live2d_enabled` | boolean | - | false | YES | MVP预留：Live2D功能开关 |
| `voice_enabled` | boolean | - | false | YES | MVP预留：语音功能开关 |
| `pet_enabled` | boolean | - | false | YES | MVP预留：宠物功能开关 |

**索引**：
```sql
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
```

**触发器**：
- `trg_profiles_updated_at` -- 自动更新updated_at
- `trg_profiles_after_insert` -- 创建profile后自动创建energy_accounts和free_trial_allocations

**RLS策略**：
- SELECT: `auth.uid() = id` -- 用户只能查自己的profile
- UPDATE: `auth.uid() = id` -- 用户只能更新自己的profile
- INSERT: `auth.uid() = id` -- 用户只能插入自己的profile

---

## 4. 模块二：伴侣核心系统

### 4.1 companions（伴侣表）

| 属性 | 说明 |
|------|------|
| **表名** | `companions` |
| **用途** | 存储每个用户的AI伴侣信息，是系统的核心实体之一 |
| **关联模块** | 记忆系统、亲密度系统、情绪系统、剧情系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id)` -- 每个用户只有一个伴侣 |
| **数据量预估** | 与profile表1:1 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | gen_random_uuid() | NO | 伴侣唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE, UNIQUE | - | NO | 关联的用户ID，1:1关系 |
| `nickname` | text | NOT NULL | - | NO | 伴侣昵称，如"小樱" |
| `gender` | text | CHECK(gender IN ('male','female','nonbinary','unknown')) | - | YES | 性别：male/female/nonbinary/unknown |
| `age` | smallint | CHECK(age > 0 AND age < 200) | - | YES | 年龄，影响AI的说话风格 |
| `birth_month` | smallint | CHECK(birth_month BETWEEN 1 AND 12) | - | YES | 生日月份，用于生日提醒 |
| `birth_day` | smallint | CHECK(birth_day BETWEEN 1 AND 31) | - | YES | 生日日期 |
| `background` | text | - | - | YES | 背景故事，提供给AI作为人格上下文 |
| `language` | text | NOT NULL | 'zh-CN' | NO | 伴侣语言偏好 |
| `bio` | text | - | - | YES | 个性签名，展示在伴侣卡片上 |
| `avatar_url` | text | - | - | YES | 头像图片URL |
| `bf_openness` | smallint | NOT NULL, CHECK(0-100) | 50 | NO | **Big Five开放性**：0=极度保守, 100=极度开放 |
| `bf_conscientiousness` | smallint | NOT NULL, CHECK(0-100) | 50 | NO | **Big Five尽责性**：0=极度随性, 100=极度严谨 |
| `bf_extraversion` | smallint | NOT NULL, CHECK(0-100) | 50 | NO | **Big Five外向性**：0=极度内向, 100=极度外向 |
| `bf_agreeableness` | smallint | NOT NULL, CHECK(0-100) | 50 | NO | **Big Five宜人性**：0=极度独立, 100=极度温暖 |
| `bf_neuroticism` | smallint | NOT NULL, CHECK(0-100) | 50 | NO | **Big Five神经质**：0=极度冷静, 100=极度多愁善感 |
| `live2d_model_path` | text | - | - | YES | MVP预留：Live2D模型路径 |
| `voice_id` | text | - | - | YES | MVP预留：语音合成声音ID |
| `pet_name` | text | - | - | YES | MVP预留：宠物名字 |
| `pet_type` | text | - | - | YES | MVP预留：宠物类型 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 伴侣创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**索引**：
```sql
CREATE INDEX idx_companions_user_id ON companions(user_id);
CREATE INDEX idx_companions_created_at ON companions(created_at);
```

**触发器**：
- `trg_companions_updated_at` -- 自动更新updated_at
- `trg_companions_after_insert` -- 创建伴侣后：①更新profile.status为'HAS_COMPANION' ②自动创建intimacy_records(初始分数0，阶段1)

**RLS策略**：
- SELECT: `auth.uid() = user_id` -- 只能查看自己的伴侣
- INSERT: `auth.uid() = user_id` -- 只能创建自己的伴侣
- UPDATE: `auth.uid() = user_id` -- 只能更新自己的伴侣
- DELETE: `auth.uid() = user_id` -- 只能删除自己的伴侣

**Big Five人格映射参考**：

```
分值范围    开放性描述          尽责性描述          外向性描述          宜人性描述          神经质描述
─────────────────────────────────────────────────────────────────────────────────────────────────
0-9        极度保守            极度随性            极度内向            极度独立            极度冷静
10-19      非常传统            非常散漫            非常内向            非常独立            非常冷静
20-29      偏传统              偏随性              偏内向              偏独立              偏冷静
30-39      略保守              略随意              略内向              略冷淡              略沉稳
40-49      略偏保守            略偏随性            略偏内向            略偏冷淡            略偏沉稳
50         均衡                均衡                均衡                均衡                均衡
51-59      略偏开放            略偏认真            略偏外向            略偏友善            略偏敏感
60-69      偏开放              偏严谨              偏外向              偏温暖              偏情绪化
70-79      很开放              很严谨              很外向              很温暖              很敏感
80-89      非常开放            非常严谨            非常外向            非常温暖            非常多愁善感
90-100     极度开放            极度严谨            极度外向            极度温暖            极度多愁善感
```

**示例数据**（seed-data插入的"小樱"）：
```
昵称: 小樱
性别: female
年龄: 18
背景: "来自樱花之国的温柔少女，喜欢阅读和绘画，总是带着温暖的微笑。"
开放性: 75 (偏开放)
尽责性: 60 (略偏认真)
外向性: 45 (略偏内向)
宜人性: 80 (很温暖)
神经质: 30 (偏冷静)
个性签名(bio): "每一个相遇都是命运的安排～"
```

---

## 5. 模块三：三层记忆系统

### 5.1 记忆架构总览

Platonic采用**三层记忆架构**模拟人类记忆机制：

```
┌─────────────────────────────────────────────────────────────┐
│                      MEMORY ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Layer 1: STM (Short Term Memory)                           │
│   ├── 表: stm_messages                                       │
│   ├── 保留期: 3天 (stm_retention_days配置)                   │
│   ├── 数据量: 高频写入，定时清理                             │
│   └── 用途: 对话上下文，情绪标注                             │
│                                                              │
│   Layer 2: LTM (Long Term Memory)                            │
│   ├── 表: ltm_memories                                       │
│   ├── 生成方式: AI Consolidation自动提取                     │
│   ├── 数据量: 持续增长，重要性分层                           │
│   └── 用途: 伴侣的持久记忆，人格个性化基础                   │
│                                                              │
│   Layer 3: Anterior Memory                                   │
│   ├── 表: anterior_memories                                  │
│   ├── 生成方式: Consolidation提取待办事项                    │
│   ├── 触发方式: 时间/事件/里程碑触发                       │
│   └── 用途: 待办提醒，主动消息内容来源                       │
│                                                              │
│   Consolidation Flow:                                        │
│   stm_messages ──► AI分析 ──► ltm_memories                   │
│                     │          + anterior_memories           │
│                     └──► companion_diaries                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.2 stm_messages（短期记忆-对话消息表）

| 属性 | 说明 |
|------|------|
| **表名** | `stm_messages` |
| **用途** | 存储用户与伴侣之间的所有对话消息，作为短期记忆 |
| **关联模块** | 聊天系统、Consolidation系统 |
| **主键** | `id` (uuid) |
| **保留策略** | 默认保留3天，超过后由cleanup_stm()函数清理 |
| **数据量预估** | 高频写入，每个用户每天10-100条消息 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | gen_random_uuid() | NO | 消息唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 关联用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 关联伴侣ID |
| `speaker` | text | NOT NULL, CHECK(speaker IN ('user', 'companion')) | - | NO | 发言者身份：user=用户, companion=伴侣 |
| `content` | text | NOT NULL | - | NO | 消息内容 |
| `emotion_label` | text | - | - | YES | 情绪标注JSON，格式`{"label":"开心","valence":0.8,"arousal":0.6}` |
| `tokens_used` | integer | - | 0 | YES | 消耗的token数(计费参考) |
| `created_at` | timestamptz | NOT NULL | now() | NO | 消息创建时间 |

**MVP增强列**（schema.sql Section 13中追加）：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `reply_to_id` | uuid | FK→stm_messages(id) ON DELETE SET NULL | - | YES | 引用的父消息ID，支持消息回复链 |
| `edited_at` | timestamptz | - | - | YES | 最后编辑时间 |
| `edit_count` | smallint | NOT NULL, CHECK(edit_count <= 3) | 0 | NO | 编辑次数上限3次 |
| `message_type` | text | NOT NULL, CHECK('text','image','audio','system') | 'text' | NO | 消息类型 |
| `is_deleted` | boolean | NOT NULL | false | NO | 软删除标记 |
| `media_url` | text | - | - | YES | 图片/音频媒体文件URL |
| `metadata` | jsonb | - | '{}' | YES | 消息扩展元数据JSON |

**索引**：
```sql
CREATE INDEX idx_stm_user_id ON stm_messages(user_id);
CREATE INDEX idx_stm_companion_id ON stm_messages(companion_id);
CREATE INDEX idx_stm_created_at ON stm_messages(created_at);
CREATE INDEX idx_stm_user_created ON stm_messages(user_id, created_at);
CREATE INDEX idx_stm_companion_created ON stm_messages(companion_id, created_at);
CREATE INDEX idx_stm_reply_to ON stm_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_stm_message_type ON stm_messages(message_type);
CREATE INDEX idx_stm_deleted ON stm_messages(is_deleted) WHERE is_deleted = true;
```

**RLS策略**：
- SELECT: `companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid())`
- INSERT: `companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid())`
- DELETE: `companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid())`

**设计说明**：
- 不设计UPDATE策略(追加写入日志)
- `edit_count <= 3`限制编辑次数，防止滥用
- `is_deleted`软删除，实际数据保留至cleanup_stm()执行
- `emotion_label`由chat-stream函数调用DeepSeek情绪检测后异步更新

---

### 5.3 ltm_memories（长期记忆表）

| 属性 | 说明 |
|------|------|
| **表名** | `ltm_memories` |
| **用途** | 存储Consolidation系统从对话中提取的长期记忆 |
| **关联模块** | Consolidation系统、主动消息系统 |
| **主键** | `id` (uuid) |
| **数据量预估** | 中等增长，每个伴侣50-500条记忆 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记忆唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 关联用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 关联伴侣ID |
| `content` | text | NOT NULL | - | NO | 记忆内容(简洁的第三人称描述) |
| `memory_type` | text | NOT NULL, CHECK(fact, preference, event, emotion, relationship, goal) | 'fact' | NO | 记忆类型：事实/偏好/事件/情感/关系/目标 |
| `importance` | numeric(2,1) | NOT NULL, CHECK(0.1-1.0) | 0.5 | NO | 重要性评分：0.1=次要, 1.0=不可磨灭 |
| `is_permanent` | boolean | NOT NULL | false | NO | 永久标记：true=不可删除(如真实姓名、生日) |
| `source_stm_ids` | uuid[] | - | '{}' | YES | 来源STM消息ID数组，可追溯对话原文 |
| `source_summary` | text | - | - | YES | 来源对话摘要 |
| `memory_date` | date | - | - | YES | 记忆关联的日期(如事件发生日) |
| `created_at` | timestamptz | NOT NULL | now() | NO | 记忆创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**索引**：
```sql
CREATE INDEX idx_ltm_user_id ON ltm_memories(user_id);
CREATE INDEX idx_ltm_companion_id ON ltm_memories(companion_id);
CREATE INDEX idx_ltm_memory_type ON ltm_memories(memory_type);
CREATE INDEX idx_ltm_importance ON ltm_memories(importance DESC);
CREATE INDEX idx_ltm_is_permanent ON ltm_memories(is_permanent) WHERE is_permanent = true;
CREATE INDEX idx_ltm_memory_date ON ltm_memories(memory_date) WHERE memory_date IS NOT NULL;
CREATE INDEX idx_ltm_user_type_importance ON ltm_memories(user_id, memory_type, importance DESC);
CREATE INDEX idx_ltm_created_at ON ltm_memories(created_at);
```

**记忆类型说明**：

| 类型 | 说明 | 示例 | 重要性典型值 |
|------|------|------|-------------|
| `fact` | 客观事实 | 用户的真实姓名、生日、家乡、职业 | 0.8-1.0 |
| `preference` | 喜好偏好 | 喜欢的食物、颜色、音乐、活动 | 0.6-0.9 |
| `event` | 具体事件 | 今天做了什么、去了哪里 | 0.5-0.7 |
| `emotion` | 情感体验 | 开心的原因、难过的事情 | 0.4-0.8 |
| `relationship` | 关系动态 | 称呼变化、亲密度里程碑 | 0.7-1.0 |
| `goal` | 目标愿望 | 想做的事、计划、梦想 | 0.6-0.9 |

**RLS策略**：与stm_messages相同，通过companion_id关联控制

---

### 5.4 anterior_memories（前瞻记忆-待办事项表）

| 属性 | 说明 |
|------|------|
| **表名** | `anterior_memories` |
| **用途** | 存储AI从对话中提取的待办/提醒事项，驱动Proactive主动消息 |
| **关联模块** | Proactive系统、Consolidation系统 |
| **主键** | `id` (uuid) |
| **数据量预估** | 每个伴侣5-50条活跃待办 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 待办唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 关联用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 关联伴侣ID |
| `content` | text | NOT NULL | - | NO | 待办内容描述 |
| `planned_at` | timestamptz | NOT NULL | - | NO | 计划执行时间 |
| `trigger_type` | text | NOT NULL, CHECK(time_based, event_based, milestone_based) | 'time_based' | NO | 触发类型：时间/事件/里程碑 |
| `priority` | smallint | NOT NULL, CHECK(1-5) | 3 | NO | 优先级：1=最高, 5=最低 |
| `status` | text | NOT NULL, CHECK(pending, active, completed, cancelled) | 'pending' | NO | 状态：待处理/进行中/已完成/已取消 |
| `completed_at` | timestamptz | - | - | YES | 完成时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**索引**：
```sql
CREATE INDEX idx_anterior_user_id ON anterior_memories(user_id);
CREATE INDEX idx_anterior_companion_id ON anterior_memories(companion_id);
CREATE INDEX idx_anterior_status ON anterior_memories(status);
CREATE INDEX idx_anterior_planned_at ON anterior_memories(planned_at);
CREATE INDEX idx_anterior_user_status ON anterior_memories(user_id, status);
CREATE INDEX idx_anterior_priority ON anterior_memories(priority, planned_at);
```

**状态流转**：
```
pending ──► active ──► completed
   │            │
   └──► cancelled ◄──┘
```

---

### 5.5 companion_consolidations（伴侣整合记录表）

| 属性 | 说明 |
|------|------|
| **表名** | `companion_consolidations` |
| **用途** | 记录每个伴侣的最后一次记忆整合时间，避免重复处理 |
| **关联模块** | Consolidation系统 |
| **主键** | `companion_id` (uuid) |
| **唯一约束** | `UNIQUE(companion_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `companion_id` | uuid | PK, FK→companions(id) ON DELETE CASCADE | - | NO | 伴侣ID |
| `last_consolidated_at` | timestamptz | - | - | YES | 上次整合时间 |
| `total_ltm_created` | integer | - | 0 | YES | 累计创建的LTM记忆数量 |
| `total_anterior_created` | integer | - | 0 | YES | 累计创建的前瞻记忆数量 |

---

### 5.6 companion_diaries（伴侣日记表）

| 属性 | 说明 |
|------|------|
| **表名** | `companion_diaries` |
| **用途** | 存储Consolidation系统每日自动生成的伴侣日记（第一人称） |
| **关联模块** | Consolidation系统、记忆回顾 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(companion_id, diary_date)` -- 每天一篇 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 日记唯一标识 |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 关联伴侣ID |
| `diary_date` | date | NOT NULL | - | NO | 日记日期 |
| `content` | text | NOT NULL | - | NO | 日记正文(第一人称) |
| `title` | text | - | - | YES | 日记标题 |
| `summary` | text | - | - | YES | 摘要 |
| `key_moments` | text[] | - | - | YES | 关键瞬间数组 |
| `reflection` | text | - | - | YES | 反思感悟 |
| `emotion_trend` | text | - | '平和' | YES | 当天主导情绪标签 |
| `tomorrow_hopes` | text | - | - | YES | 对明天的期待 |
| `source_stm_ids` | uuid[] | - | - | YES | 来源STM消息ID |
| `generated_at` | timestamptz | - | - | YES | 生成时间 |
| `sentiment_score` | numeric(3,2) | - | 0 | YES | 情感倾向 -1.00~1.00 |
| `is_favorite` | boolean | NOT NULL | false | NO | 用户收藏标记 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**索引**：
```sql
CREATE INDEX idx_companion_diaries_companion ON companion_diaries(companion_id);
CREATE INDEX idx_companion_diaries_date ON companion_diaries(diary_date DESC);
CREATE INDEX idx_companion_diaries_favorite ON companion_diaries(is_favorite) WHERE is_favorite = true;
```

---

## 6. 模块四：亲密度与情绪系统

### 6.1 milestone_definitions（好感度阶段定义表）

| 属性 | 说明 |
|------|------|
| **表名** | `milestone_definitions` |
| **用途** | 定义亲密度5个阶段的阈值、名称、解锁功能 |
| **类型** | 静态配置字典表（种子数据初始化后只读） |
| **主键** | `id` (smallint) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | smallint | PK | - | NO | 阶段编号(1-5) |
| `name` | text | NOT NULL | - | NO | 阶段名称 |
| `description` | text | NOT NULL | - | NO | 阶段描述 |
| `min_score` | smallint | NOT NULL, CHECK(0-100) | - | NO | 最低分数(含) |
| `max_score` | smallint | NOT NULL, CHECK(0-100) | - | NO | 最高分数(含) |
| `icon_url` | text | - | - | YES | 阶段图标URL |
| `unlocked_features` | text | - | '' | YES | 解锁功能列表(逗号分隔) |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**种子数据**：

| id | 阶段名称 | 分数范围 | 解锁功能 |
|----|---------|---------|---------|
| 1 | 初见乍欢 | 0-20 | basic_chat |
| 2 | 渐入佳境 | 21-40 | nickname_unlocked, shared_jokes |
| 3 | 暗生情愫 | 41-60 | memory_sharing, emotional_support, anterior_memory |
| 4 | 情投意合 | 61-80 | proactive_messages, personalized_greetings, advanced_drama |
| 5 | 心有灵犀 | 81-100 | all_features, exclusive_content, voice_preview |

---

### 6.2 intimacy_records（亲密度主记录表）

| 属性 | 说明 |
|------|------|
| **表名** | `intimacy_records` |
| **用途** | 记录用户与伴侣之间的亲密度分数和阶段 |
| **关联模块** | 亲密度系统、里程碑系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id, companion_id)` |
| **数据量预估** | 与companions表1:1 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 伴侣ID |
| `score` | smallint | NOT NULL, CHECK(0-100) | 0 | NO | 亲密度分数：0-100 |
| `milestone_stage` | smallint | NOT NULL, FK→milestone_definitions(id) ON DELETE RESTRICT | 1 | NO | 当前阶段(1-5) |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**索引**：
```sql
CREATE INDEX idx_intimacy_user_id ON intimacy_records(user_id);
CREATE INDEX idx_intimacy_companion_id ON intimacy_records(companion_id);
CREATE INDEX idx_intimacy_milestone ON intimacy_records(milestone_stage);
CREATE INDEX idx_intimacy_score ON intimacy_records(score);
```

---

### 6.3 intimacy_history（亲密度变化历史表）

| 属性 | 说明 |
|------|------|
| **表名** | `intimacy_history` |
| **用途** | 记录每次亲密度分数变化的详细日志 |
| **关联模块** | 亲密度系统 |
| **主键** | `id` (bigserial) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | bigserial | PK | - | NO | 自增ID |
| `intimacy_id` | uuid | NOT NULL, FK→intimacy_records(id) ON DELETE CASCADE | - | NO | 关联的亲密度记录 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 伴侣ID |
| `old_score` | smallint | NOT NULL, CHECK(0-100) | - | NO | 变化前分数 |
| `new_score` | smallint | NOT NULL, CHECK(0-100) | - | NO | 变化后分数 |
| `change_reason` | text | - | - | YES | 变化原因说明 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 记录时间 |

**索引**：
```sql
CREATE INDEX idx_intimacy_hist_intimacy_id ON intimacy_history(intimacy_id);
CREATE INDEX idx_intimacy_hist_user_id ON intimacy_history(user_id);
CREATE INDEX idx_intimacy_hist_created ON intimacy_history(created_at);
CREATE INDEX idx_intimacy_hist_user_created ON intimacy_history(user_id, created_at);
```

---

### 6.4 emotion_occs（OCC情绪标签字典表）

| 属性 | 说明 |
|------|------|
| **表名** | `emotion_occs` |
| **用途** | 定义OCC情绪模型的情绪标签及其对PAD三维的影响值 |
| **类型** | 静态配置字典表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 标签唯一标识 |
| `label` | text | NOT NULL, UNIQUE | - | NO | 情绪标签名(如joy, love, anger) |
| `pleasure_delta` | smallint | NOT NULL | 0 | NO | 对愉悦度的影响(-100~+100) |
| `arousal_delta` | smallint | NOT NULL | 0 | NO | 对唤醒度的影响(-100~+100) |
| `dominance_delta` | smallint | NOT NULL | 0 | NO | 对支配度的影响(-100~+100) |
| `description` | text | - | - | YES | 标签描述 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**种子数据**（15种OCC情绪）：

| label | pleasure | arousal | dominance | 中文描述 |
|-------|----------|---------|-----------|---------|
| joy | 80 | 60 | 10 | 快乐、高兴、欣喜 |
| distress | -80 | -40 | -30 | 悲伤、痛苦、苦恼 |
| hope | 60 | 40 | 20 | 希望、乐观、期待美好 |
| fear | -70 | 80 | -60 | 害怕、焦虑、恐惧 |
| pride | 70 | 30 | 70 | 自豪、成就感 |
| shame | -70 | -20 | -60 | 羞愧、尴尬、屈辱 |
| love | 90 | 70 | 20 | 爱、喜爱、深情 |
| hate | -90 | 80 | 60 | 恨、厌恶、鄙视 |
| gratitude | 70 | 20 | -10 | 感激、感谢 |
| anger | -70 | 90 | 80 | 愤怒、暴怒、狂怒 |
| surprise | 20 | 90 | -20 | 惊讶、惊奇 |
| disgust | -80 | 40 | -10 | 厌恶、反胃 |
| contentment | 60 | -30 | 20 | 满足、满意、平和 |
| boredom | -20 | -60 | -30 | 无聊、乏味 |
| curiosity | 30 | 60 | 30 | 好奇、求知 |

---

### 6.5 mood_records（情绪记录表 - PAD模型）

| 属性 | 说明 |
|------|------|
| **表名** | `mood_records` |
| **用途** | 记录伴侣的实时情绪状态（PAD三维模型） |
| **关联模块** | 情绪系统、聊天系统（影响AI回复风格） |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 关联伴侣ID |
| `pleasure` | smallint | NOT NULL, CHECK(-100~100) | - | NO | **愉悦度**：-100=极不悦, +100=极愉悦 |
| `arousal` | smallint | NOT NULL, CHECK(-100~100) | - | NO | **唤醒度**：-100=极低, +100=极高 |
| `dominance` | smallint | NOT NULL, CHECK(-100~100) | - | NO | **支配度**：-100=被支配, +100=支配 |
| `occ_label` | text | FK→emotion_occs(label) ON DELETE SET NULL | - | YES | OCC情绪标签引用 |
| `intensity` | smallint | NOT NULL, CHECK(0-100) | 50 | NO | 情绪强度：0=微弱, 100=强烈 |
| `context` | text | - | - | YES | 触发情绪的上下文描述 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 记录时间 |

**索引**：
```sql
CREATE INDEX idx_mood_companion_id ON mood_records(companion_id);
CREATE INDEX idx_mood_created_at ON mood_records(created_at);
CREATE INDEX idx_mood_companion_created ON mood_records(companion_id, created_at);
CREATE INDEX idx_mood_occ_label ON mood_records(occ_label);
```

**注意**：seed-data中存储的PAD值为浮点数(0.3, 0.2, 0.1)，实际数据库schema使用smallint(-100~100)。Edge Function代码中有转换逻辑。

---

## 7. 模块五：能量与支付系统

### 7.1 energy_accounts（能量账户表）

| 属性 | 说明 |
|------|------|
| **表名** | `energy_accounts` |
| **用途** | 存储用户的能量余额，作为应用内货币体系的核心 |
| **关联模块** | 支付系统、聊天系统、主动消息系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id)` -- 每个用户只有一个能量账户 |
| **数据量预估** | 与profiles表1:1 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 账户唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE, UNIQUE | - | NO | 用户ID |
| `balance` | bigint | NOT NULL | 0 | NO | **当前能量余额**，最小单位=1能量 |
| `total_recharged` | bigint | NOT NULL | 0 | NO | 累计充值能量 |
| `total_consumed` | bigint | NOT NULL | 0 | NO | 累计消费能量 |
| `version` | bigint | NOT NULL | 1 | NO | **乐观锁版本号**，用于并发扣减 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 账户创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**索引**：
```sql
CREATE INDEX idx_energy_user_id ON energy_accounts(user_id);
```

**乐观锁机制**：
```
1. 读取: SELECT balance, version FROM energy_accounts WHERE user_id = ?
2. 计算: new_balance = balance - cost
3. 更新: UPDATE energy_accounts SET balance = new_balance, version = version + 1 
         WHERE id = ? AND version = old_version
4. 校验: 如果影响行数=0，说明并发冲突，需重试
```

---

### 7.2 energy_transactions（能量流水表）

| 属性 | 说明 |
|------|------|
| **表名** | `energy_transactions` |
| **用途** | 记录所有能量变动流水，完整审计追踪 |
| **关联模块** | 能量系统、支付系统 |
| **主键** | `id` (bigserial) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | bigserial | PK | - | NO | 自增ID |
| `account_id` | uuid | NOT NULL, FK→energy_accounts(id) ON DELETE CASCADE | - | NO | 关联的能量账户 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `txn_type` | text | NOT NULL, CHECK(6种类型) | - | NO | 交易类型 |
| `amount` | bigint | NOT NULL, CHECK(amount <> 0) | - | NO | 变动金额：正=收入, 负=支出 |
| `balance_after` | bigint | NOT NULL | - | NO | 变动后余额 |
| `description` | text | - | - | YES | 交易描述 |
| `reference_id` | text | - | - | YES | 关联订单号或外部ID |
| `metadata` | jsonb | - | '{}' | YES | 扩展元数据 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 交易时间 |

**txn_type枚举说明**：

| 类型值 | 说明 | amount符号 |
|--------|------|-----------|
| `recharge` | 充值(支付完成) | 正数 |
| `consume` | 消费(聊天/剧情等) | 负数 |
| `gift` | 赠送礼物 | 负数 |
| `refund` | 退款 | 负数(扣除已充值能量) |
| `compensation` | 系统补偿 | 正数 |
| `trial` | 免费试用额度消耗 | 负数 |

**各功能能量消耗标准**：

| 功能 | 消耗能量 | 说明 |
|------|---------|------|
| 普通聊天(chat-stream) | 50/条 | 主对话消息 |
| 剧情模式(drama-chat) | 30/条 | 剧情空间消息 |
| 主动消息(proactive) | 10/条 | 伴侣主动消息 |

**索引**：
```sql
CREATE INDEX idx_energy_txn_account ON energy_transactions(account_id);
CREATE INDEX idx_energy_txn_user ON energy_transactions(user_id);
CREATE INDEX idx_energy_txn_type ON energy_transactions(txn_type);
CREATE INDEX idx_energy_txn_created ON energy_transactions(created_at);
CREATE INDEX idx_energy_txn_user_created ON energy_transactions(user_id, created_at DESC);
CREATE INDEX idx_energy_txn_reference ON energy_transactions(reference_id) WHERE reference_id IS NOT NULL;
```

---

### 7.3 free_trial_allocations（免费试用额度表）

| 属性 | 说明 |
|------|------|
| **表名** | `free_trial_allocations` |
| **用途** | 新用户免费试用额度管理 |
| **关联模块** | 能量系统、注册流程 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE, UNIQUE | - | NO | 用户ID |
| `total_energy` | bigint | NOT NULL, CHECK(total_energy > 0) | - | NO | 试用总额度(默认100) |
| `consumed_energy` | bigint | NOT NULL, CHECK(consumed_energy >= 0) | 0 | NO | 已消耗额度 |
| `is_active` | boolean | NOT NULL | true | NO | 是否有效 |
| `expires_at` | timestamptz | - | - | YES | 过期时间(默认7天) |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**约束**：
```sql
CHECK (consumed_energy <= total_energy) -- 已消耗不能超过总额度
```

---

### 7.4 pricing_plans（充值套餐表）

| 属性 | 说明 |
|------|------|
| **表名** | `pricing_plans` |
| **用途** | 定义能量充值套餐 |
| **类型** | 静态配置字典表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 套餐唯一标识 |
| `name` | text | NOT NULL | - | NO | 套餐名称(如"Premium Pack") |
| `description` | text | - | - | YES | 套餐描述 |
| `energy_amount` | bigint | NOT NULL, CHECK(energy_amount > 0) | - | NO | 包含能量数量 |
| `bonus_amount` | bigint | NOT NULL | 0 | NO | 赠送能量数量 |
| `price_cents` | bigint | NOT NULL, CHECK(price_cents >= 0) | - | NO | 价格(单位：分，避免浮点数) |
| `currency` | text | NOT NULL | 'CNY' | NO | 货币代码 |
| `sort_order` | smallint | NOT NULL | 0 | NO | 排序顺序 |
| `is_active` | boolean | NOT NULL | true | NO | 是否上架 |
| `metadata` | jsonb | - | '{}' | YES | 扩展元数据 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**种子数据**：

| 套餐名称 | 能量 | 价格(分) | 人民币 |
|---------|------|---------|--------|
| Starter Pack | 100 | 100 | 1.00元 |
| Standard Pack | 550 | 500 | 5.00元 |
| Premium Pack | 1200 | 1000 | 10.00元 |
| Ultimate Pack | 6500 | 5000 | 50.00元 |

---

### 7.5 payment_orders（支付订单表）

| 属性 | 说明 |
|------|------|
| **表名** | `payment_orders` |
| **用途** | 存储用户充值订单，幂等性设计 |
| **关联模块** | 支付系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 订单唯一标识 |
| `order_no` | text | NOT NULL, UNIQUE | - | NO | 平台订单号，对外展示 |
| `request_id` | text | NOT NULL, UNIQUE | - | NO | 业务方请求ID，保证幂等性 |
| `idempotency_key` | text | NOT NULL DEFAULT '' | '' | NO | 幂等键(客户端生成) |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `plan_id` | uuid | FK→pricing_plans(id) ON DELETE SET NULL | - | YES | 关联的套餐ID |
| `coupon_id` | uuid | FK→discount_coupons(id) ON DELETE SET NULL | - | YES | 使用的优惠券ID |
| `amount_cents` | bigint | NOT NULL, CHECK(amount_cents > 0) | - | NO | 应付金额(分) |
| `paid_cents` | bigint | NOT NULL, CHECK(paid_cents >= 0) | 0 | NO | 实付金额(分) |
| `energy_amount` | bigint | NOT NULL, CHECK(energy_amount > 0) | - | NO | 应得能量数量 |
| `currency` | text | NOT NULL | 'CNY' | NO | 货币 |
| `status` | text | NOT NULL, CHECK(7种状态) | 'pending' | NO | 订单状态 |
| `paid_at` | timestamptz | - | - | YES | 支付完成时间 |
| `expired_at` | timestamptz | - | - | YES | 订单过期时间(默认30分钟) |
| `payment_method` | text | - | - | YES | 支付方式(alipay/wechat) |
| `payment_channel` | text | - | - | YES | 支付渠道 |
| `third_party_txn_id` | text | - | - | YES | 第三方支付流水号 |
| `metadata` | jsonb | - | '{}' | YES | 扩展元数据 |
| `version` | bigint | NOT NULL | 1 | NO | 乐观锁版本号 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 订单创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**status枚举说明**：

| 状态值 | 说明 |
|--------|------|
| `pending` | 待支付(初始状态) |
| `paid` | 已支付 |
| `failed` | 支付失败 |
| `cancelled` | 已取消(超时等) |
| `refunding` | 退款中 |
| `refunded` | 已退款 |

**索引**：
```sql
CREATE INDEX idx_payment_user_id ON payment_orders(user_id);
CREATE INDEX idx_payment_plan_id ON payment_orders(plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX idx_payment_coupon_id ON payment_orders(coupon_id) WHERE coupon_id IS NOT NULL;
CREATE INDEX idx_payment_status ON payment_orders(status);
CREATE INDEX idx_payment_created ON payment_orders(created_at);
CREATE INDEX idx_payment_user_status ON payment_orders(user_id, status);
CREATE INDEX idx_payment_third_party ON payment_orders(third_party_txn_id) WHERE third_party_txn_id IS NOT NULL;
CREATE UNIQUE INDEX uk_payment_idempotency ON payment_orders(idempotency_key) WHERE idempotency_key <> '';
```

---

### 7.6 payment_callbacks（支付回调记录表）

| 属性 | 说明 |
|------|------|
| **表名** | `payment_callbacks` |
| **用途** | 存储支付渠道(Zpay)的异步回调通知 |
| **关联模块** | 支付系统 |
| **主键** | `id` (bigserial) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | bigserial | PK | - | NO | 自增ID |
| `order_id` | uuid | NOT NULL, FK→payment_orders(id) ON DELETE CASCADE | - | NO | 关联订单ID |
| `channel` | text | NOT NULL | - | NO | 回调渠道(如zpay) |
| `callback_body` | jsonb | NOT NULL DEFAULT '{}' | '{}' | NO | 回调原始报文 |
| `signature` | text | - | - | YES | 签名值 |
| `is_processed` | boolean | NOT NULL | false | NO | 是否已处理 |
| `processed_at` | timestamptz | - | - | YES | 处理时间 |
| `error_message` | text | - | - | YES | 错误信息 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 回调接收时间 |

**索引**：
```sql
CREATE INDEX idx_callback_order_id ON payment_callbacks(order_id);
CREATE INDEX idx_callback_processed ON payment_callbacks(is_processed) WHERE is_processed = false;
CREATE INDEX idx_callback_created ON payment_callbacks(created_at);
```

---

### 7.7 refund_orders（退款单表）

| 属性 | 说明 |
|------|------|
| **表名** | `refund_orders` |
| **用途** | 存储退款申请，独立状态机 |
| **关联模块** | 支付系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 退款单唯一标识 |
| `order_id` | uuid | NOT NULL, FK→payment_orders(id) ON DELETE CASCADE | - | NO | 关联原订单 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `refund_no` | text | NOT NULL, UNIQUE | - | NO | 退款单号 |
| `amount_cents` | bigint | NOT NULL, CHECK(amount_cents > 0) | - | NO | 退款金额(分) |
| `reason` | text | - | - | YES | 退款原因 |
| `status` | text | NOT NULL, CHECK(6种状态) | 'pending' | NO | 退款状态 |
| `processed_at` | timestamptz | - | - | YES | 处理时间 |
| `operator_id` | uuid | - | - | YES | 后台操作员ID |
| `metadata` | jsonb | - | '{}' | YES | 扩展元数据 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**status枚举**：pending → approved → processing → success / rejected / failed

---

### 7.8 discount_coupons（折扣券表）

| 属性 | 说明 |
|------|------|
| **表名** | `discount_coupons` |
| **用途** | 折扣券定义，用于支持者和促销活动 |
| **类型** | 配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 券唯一标识 |
| `code` | text | NOT NULL, UNIQUE | - | NO | 券码 |
| `discount_type` | text | NOT NULL, CHECK(percentage, fixed_amount) | 'percentage' | NO | 折扣类型 |
| `discount_value` | bigint | NOT NULL, CHECK(discount_value > 0) | - | NO | 折扣值(百分比或固定金额) |
| `min_order_cents` | bigint | NOT NULL | 0 | NO | 最低订单金额(分) |
| `max_uses` | bigint | NOT NULL | 1 | NO | 最大使用次数 |
| `used_count` | bigint | NOT NULL | 0 | NO | 已使用次数 |
| `valid_from` | timestamptz | NOT NULL | - | NO | 生效时间 |
| `valid_until` | timestamptz | - | - | YES | 失效时间 |
| `is_active` | boolean | NOT NULL | true | NO | 是否激活 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

---

## 8. 模块六：剧情空间系统

### 8.1 drama_definitions（剧情定义表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_definitions` |
| **用途** | 定义可供体验的剧情内容 |
| **类型** | 配置字典表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 剧情唯一标识 |
| `name` | text | NOT NULL | - | NO | 剧情名称 |
| `description` | text | NOT NULL | - | NO | 剧情描述 |
| `scene_setting` | text | - | - | YES | 场景设定描述(提供给AI的上下文) |
| `drama_prompt` | text | NOT NULL | - | NO | 剧情系统提示词(给AI的完整指令) |
| `cover_image_path` | text | - | - | YES | 封面图片路径 |
| `unlock_condition` | text | - | 'default' | YES | 解锁条件：default=默认, milestone:N=阶段N解锁 |
| `is_active` | boolean | NOT NULL | true | NO | 是否上架 |
| `sort_order` | smallint | NOT NULL | 0 | NO | 排序顺序 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

### 8.2 drama_categories（剧情分类表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_categories` |
| **用途** | 剧情分类字典 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 分类唯一标识 |
| `name` | text | NOT NULL, UNIQUE | - | NO | 分类名称(如"浪漫","悬疑") |
| `description` | text | - | - | YES | 分类描述 |
| `sort_order` | smallint | NOT NULL | 0 | NO | 排序顺序 |
| `icon_url` | text | - | - | YES | 图标URL |
| `is_active` | boolean | NOT NULL | true | NO | 是否启用 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

---

### 8.3 drama_tags（剧情标签表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_tags` |
| **用途** | 剧情标签字典 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 标签唯一标识 |
| `name` | text | NOT NULL, UNIQUE | - | NO | 标签名称 |
| `category_id` | uuid | FK→drama_categories(id) ON DELETE SET NULL | - | YES | 所属分类 |
| `usage_count` | int | NOT NULL | 0 | NO | 使用次数 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

---

### 8.4 drama_tag_mappings（剧情-标签关联表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_tag_mappings` |
| **用途** | 剧情和标签的多对多关联 |
| **主键** | `(drama_id, tag_id)` 复合主键 |

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `drama_id` | uuid | NOT NULL, FK→drama_definitions(id) ON DELETE CASCADE | - | NO | 剧情ID |
| `tag_id` | uuid | NOT NULL, FK→drama_tags(id) ON DELETE CASCADE | - | NO | 标签ID |

---

### 8.5 drama_sessions（剧情会话表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_sessions` |
| **用途** | 用户进入某个剧情后的会话记录 |
| **关联模块** | 剧情空间系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 会话唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `companion_id` | uuid | FK→companions(id) ON DELETE SET NULL | - | YES | 伴侣ID |
| `drama_id` | uuid | NOT NULL, FK→drama_definitions(id) ON DELETE CASCADE | - | NO | 剧情定义ID |
| `status` | text | NOT NULL, CHECK(active, paused, completed, abandoned) | 'active' | NO | 会话状态 |
| `current_scene` | text | - | - | YES | 当前场景名称 |
| `context_memory` | jsonb | - | '{}' | YES | AI上下文记忆JSON |
| `started_at` | timestamptz | NOT NULL | now() | NO | 开始时间 |
| `ended_at` | timestamptz | - | - | YES | 结束时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**索引**：
```sql
CREATE INDEX idx_drama_session_user ON drama_sessions(user_id);
CREATE INDEX idx_drama_session_companion ON drama_sessions(companion_id) WHERE companion_id IS NOT NULL;
CREATE INDEX idx_drama_session_drama ON drama_sessions(drama_id);
CREATE INDEX idx_drama_session_status ON drama_sessions(status);
```

---

### 8.6 drama_messages（剧情消息表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_messages` |
| **用途** | 剧情会话中的对话记录，独立于stm_messages |
| **关联模块** | 剧情空间系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 消息唯一标识 |
| `session_id` | uuid | NOT NULL, FK→drama_sessions(id) ON DELETE CASCADE | - | NO | 关联会话ID |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `speaker` | text | NOT NULL, CHECK(user, companion, narrator) | - | NO | 发言者：user=用户, companion=伴侣, narrator=旁白 |
| `content` | text | NOT NULL | - | NO | 消息内容 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**索引**：
```sql
CREATE INDEX idx_drama_msg_session ON drama_messages(session_id);
CREATE INDEX idx_drama_msg_user ON drama_messages(user_id);
CREATE INDEX idx_drama_msg_created ON drama_messages(created_at);
```

---

### 8.7 drama_progress（剧情进度表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_progress` |
| **用途** | 跟踪用户对每个剧情的解锁和完成状态 |
| **关联模块** | 剧情空间系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id, drama_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `drama_id` | uuid | NOT NULL, FK→drama_definitions(id) ON DELETE CASCADE | - | NO | 剧情ID |
| `is_unlocked` | boolean | NOT NULL | false | NO | 是否已解锁 |
| `unlocked_at` | timestamptz | - | - | YES | 解锁时间 |
| `completed_at` | timestamptz | - | - | YES | 完成时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

### 8.8 drama_ratings（剧情评分汇总表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_ratings` |
| **用途** | 存储每个剧情的评分统计 |
| **关联模块** | 剧情空间系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(drama_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `drama_id` | uuid | NOT NULL, FK→drama_definitions(id) ON DELETE CASCADE | - | NO | 剧情ID |
| `avg_score` | numeric(2,1) | NOT NULL, CHECK(0-5) | 0 | NO | 平均评分(0-5) |
| `total_ratings` | int | NOT NULL | 0 | NO | 总评分次数 |
| `five_star_count` | int | NOT NULL | 0 | NO | 5星次数 |
| `four_star_count` | int | NOT NULL | 0 | NO | 4星次数 |
| `three_star_count` | int | NOT NULL | 0 | NO | 3星次数 |
| `two_star_count` | int | NOT NULL | 0 | NO | 2星次数 |
| `one_star_count` | int | NOT NULL | 0 | NO | 1星次数 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

### 8.9 drama_reviews（剧情评价表）

| 属性 | 说明 |
|------|------|
| **表名** | `drama_reviews` |
| **用途** | 用户对剧情的文字评价 |
| **关联模块** | 剧情空间系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(drama_id, user_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 评价唯一标识 |
| `drama_id` | uuid | NOT NULL, FK→drama_definitions(id) ON DELETE CASCADE | - | NO | 剧情ID |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `rating` | smallint | NOT NULL, CHECK(1-5) | - | NO | 评分(1-5星) |
| `content` | text | NOT NULL DEFAULT '' | '' | NO | 评价内容 |
| `is_anonymous` | boolean | NOT NULL | false | NO | 是否匿名 |
| `like_count` | int | NOT NULL | 0 | NO | 被点赞数 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

## 9. 模块七：主动消息系统

### 9.1 proactive_schedule（主动消息调度表）

| 属性 | 说明 |
|------|------|
| **表名** | `proactive_schedule` |
| **用途** | 管理伴侣主动消息的触发时间，驱动Proactive Scheduler |
| **关联模块** | 主动消息系统、pg_cron定时任务 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id, companion_id)` -- 每个伴侣一条调度记录 |
| **创建方式** | 由migration文件`20250115_proactive_schedule.sql`创建 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 调度记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→auth.users(id) ON DELETE CASCADE | - | NO | 用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 伴侣ID |
| `next_trigger_at` | timestamptz | NOT NULL | now() | NO | **下次触发时间**，调度器查询的核心字段 |
| `last_user_message_at` | timestamptz | - | - | YES | 用户最后发消息的时间(用于计算静默时长) |
| `last_triggered_at` | timestamptz | - | - | YES | 上次触发时间 |
| `is_triggered` | boolean | NOT NULL | false | NO | **触发状态**：false=待触发, true=已触发(避免重复) |
| `created_at` | timestamptz | NOT NULL | now() | NO | 记录创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间(触发器自动维护) |

**索引**：
```sql
CREATE INDEX idx_proactive_schedule_next_trigger 
  ON proactive_schedule(next_trigger_at) 
  WHERE is_triggered = false;
```

**触发器**：
- `trigger_proactive_schedule_updated_at` -- BEFORE UPDATE自动更新updated_at

**RLS策略**：
- SELECT: `auth.uid() = user_id` -- 用户只能查看自己的调度

**pg_cron定时任务**：
```sql
-- 每分钟检查一次是否有待触发的主动消息
SELECT cron.schedule(
  'proactive-scheduler',
  '* * * * *',  -- 每分钟
  $$SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/proactive-scheduler',
    headers := jsonb_build_object('Authorization', 'Bearer <token>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  )$$  
);
```

**调度器查询逻辑**：
```sql
-- proactive-scheduler Edge Function每分钟执行：
SELECT id, user_id, companion_id, next_trigger_at 
FROM proactive_schedule 
WHERE next_trigger_at <= now()   -- 触发时间已到
  AND is_triggered = false       -- 尚未触发
LIMIT 10;                         -- 每批最多处理10条
```

---

## 10. 模块八：成就与礼物系统

### 10.1 achievement_definitions（成就定义表）

| 属性 | 说明 |
|------|------|
| **表名** | `achievement_definitions` |
| **用途** | 定义所有可解锁的成就 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 成就唯一标识 |
| `name` | text | NOT NULL | - | NO | 成就名称 |
| `description` | text | NOT NULL | - | NO | 成就描述 |
| `category` | text | NOT NULL, CHECK(conversation, intimacy, drama, payment, streak, social, special) | - | NO | 成就分类 |
| `trigger_type` | text | NOT NULL, CHECK(count, threshold, streak, one_time, cumulative) | - | NO | 触发类型 |
| `trigger_target` | text | NOT NULL | - | NO | 触发目标标识符 |
| `trigger_value` | bigint | NOT NULL | 1 | NO | 触发阈值 |
| `reward_type` | text | NOT NULL, CHECK(energy, title, unlock_drama, special) | 'energy' | NO | 奖励类型 |
| `reward_amount` | bigint | NOT NULL | 0 | NO | 奖励数量 |
| `reward_data` | jsonb | - | '{}' | YES | 奖励额外数据 |
| `icon_url` | text | - | - | YES | 图标URL |
| `rarity` | text | NOT NULL, CHECK(common, rare, epic, legendary) | 'common' | NO | 稀有度 |
| `sort_order` | smallint | NOT NULL | 0 | NO | 排序顺序 |
| `is_active` | boolean | NOT NULL | true | NO | 是否启用 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**种子数据**（11个预设成就）：

| 成就名称 | 分类 | 触发类型 | 目标 | 阈值 | 奖励 | 稀有度 |
|---------|------|---------|------|------|------|--------|
| 初次相遇 | conversation | one_time | first_message | 1 | 100能量 | common |
| 夜猫子 | conversation | one_time | late_night_chat | 1 | 50能量 | common |
| 早安问候 | conversation | one_time | early_morning_chat | 1 | 50能量 | common |
| 百次倾心 | conversation | cumulative | total_messages | 100 | 500能量 | rare |
| 渐入佳境 | intimacy | threshold | intimacy_score | 21 | 称号 | rare |
| 情投意合 | intimacy | threshold | intimacy_score | 61 | 1000能量 | epic |
| 心有灵犀 | intimacy | threshold | intimacy_score | 81 | 3000能量 | legendary |
| 7日之约 | streak | streak | daily_conversation | 7 | 300能量 | rare |
| 30日同心 | streak | streak | daily_conversation | 30 | 2000能量 | epic |
| 剧情初探 | drama | one_time | first_drama_complete | 1 | 200能量 | common |
| 充值先锋 | payment | one_time | first_recharge | 1 | 100能量 | common |

---

### 10.2 user_achievements（用户成就进度表）

| 属性 | 说明 |
|------|------|
| **表名** | `user_achievements` |
| **用途** | 记录用户每个成就的解锁进度 |
| **关联模块** | 成就系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id, achievement_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `achievement_id` | uuid | NOT NULL, FK→achievement_definitions(id) ON DELETE CASCADE | - | NO | 成就定义ID |
| `progress` | bigint | NOT NULL | 0 | NO | 当前进度值 |
| `is_unlocked` | boolean | NOT NULL | false | NO | 是否已解锁 |
| `unlocked_at` | timestamptz | - | - | YES | 解锁时间 |
| `reward_claimed` | boolean | NOT NULL | false | NO | 奖励是否已领取 |
| `claimed_at` | timestamptz | - | - | YES | 奖励领取时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

### 10.3 gift_catalog（礼物目录表）

| 属性 | 说明 |
|------|------|
| **表名** | `gift_catalog` |
| **用途** | 虚拟礼物定义 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 礼物唯一标识 |
| `name` | text | NOT NULL | - | NO | 礼物名称 |
| `description` | text | - | - | YES | 礼物描述 |
| `price_energy` | bigint | NOT NULL, CHECK(price_energy >= 0) | - | NO | 价格(能量) |
| `intimacy_boost` | smallint | NOT NULL | 0 | NO | 增加亲密度值 |
| `rarity` | text | NOT NULL, CHECK(common, rare, epic, legendary) | 'common' | NO | 稀有度 |
| `icon_url` | text | - | - | YES | 图标URL |
| `unlock_drama_id` | uuid | FK→drama_definitions(id) ON DELETE SET NULL | - | YES | 解锁该礼物所需的剧情 |
| `is_active` | boolean | NOT NULL | true | NO | 是否上架 |
| `sort_order` | smallint | NOT NULL | 0 | NO | 排序顺序 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**种子数据**（7个礼物）：

| 名称 | 能量价格 | 亲密度 | 稀有度 |
|------|---------|--------|--------|
| 鲜花 | 100 | 2 | common |
| 巧克力 | 200 | 3 | common |
| 手写情书 | 300 | 5 | rare |
| 星空头灯 | 500 | 7 | rare |
| 定制项链 | 1000 | 10 | epic |
| 许愿瓶 | 2000 | 15 | epic |
| 流星戒指 | 5000 | 25 | legendary |

---

### 10.4 gift_transactions（礼物赠送记录表）

| 属性 | 说明 |
|------|------|
| **表名** | `gift_transactions` |
| **用途** | 记录用户给伴侣赠送礼物的历史 |
| **关联模块** | 礼物系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `companion_id` | uuid | NOT NULL, FK→companions(id) ON DELETE CASCADE | - | NO | 伴侣ID |
| `gift_id` | uuid | NOT NULL, FK→gift_catalog(id) ON DELETE RESTRICT | - | NO | 礼物ID |
| `cost_energy` | bigint | NOT NULL | - | NO | 实际消耗能量 |
| `intimacy_added` | smallint | NOT NULL | 0 | NO | 增加的亲密度值 |
| `note` | text | - | '' | YES | 附言 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 赠送时间 |

---

## 11. 模块九：日历与日记系统

### 11.1 calendar_events（日历事件表）

| 属性 | 说明 |
|------|------|
| **表名** | `calendar_events` |
| **用途** | 聚合里程碑、待办提醒、LTM日期标记、生日等事件 |
| **关联模块** | 日历系统、亲密度系统、记忆系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 事件唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `companion_id` | uuid | FK→companions(id) ON DELETE CASCADE | - | YES | 伴侣ID |
| `title` | text | NOT NULL | - | NO | 事件标题 |
| `description` | text | - | - | YES | 事件描述 |
| `event_type` | text | NOT NULL, CHECK(6种类型) | - | NO | 事件类型 |
| `source_id` | uuid | - | - | YES | 关联的anterior_memory或ltm_memories的ID |
| `event_date` | date | NOT NULL | - | NO | 事件日期 |
| `event_time` | time | - | - | YES | 事件时间 |
| `is_all_day` | boolean | NOT NULL | false | NO | 是否全天事件 |
| `status` | text | NOT NULL, CHECK(active, archived, deleted) | 'active' | NO | 状态 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**event_type枚举说明**：

| 类型值 | 说明 |
|--------|------|
| `milestone` | 亲密度阶段里程碑 |
| `anterior_memory` | 待办提醒事项 |
| `ltm_date` | 长期记忆中的重要日期 |
| `companion_birthday` | 伴侣生日 |
| `user_event` | 用户自定义事件 |
| `system` | 系统事件 |

---

### 11.2 companion_diaries（伴侣日记表）

已在**5.6节**中详细说明。

---

## 12. 模块十：通知与合规系统

### 12.1 notification_templates（通知模板表）

| 属性 | 说明 |
|------|------|
| **表名** | `notification_templates` |
| **用途** | 定义推送通知模板 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 模板唯一标识 |
| `name` | text | NOT NULL, UNIQUE | - | NO | 模板名称 |
| `title_template` | text | NOT NULL | - | NO | 标题模板(支持变量插值) |
| `body_template` | text | NOT NULL | - | NO | 正文模板(支持变量插值) |
| `notification_type` | text | NOT NULL, CHECK(7种类型) | - | NO | 通知类型 |
| `action_url` | text | - | '' | YES | 点击跳转路径 |
| `is_active` | boolean | NOT NULL | true | NO | 是否启用 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

**种子数据**：

| 模板名称 | 标题模板 | 正文模板 | 类型 | 跳转路径 |
|---------|---------|---------|------|---------|
| 主动问候 | `{{companion_name}}发来消息` | `{{message_preview}}` | proactive | /chat |
| 电量不足 | `电量即将耗尽` | `您的电量还剩{{energy_balance}}，快去充值吧` | energy_low | /payment |
| 阶段解锁 | `好感度阶段提升` | `恭喜！你和{{companion_name}}的关系进入了{{milestone_name}}` | milestone_unlocked | /companion |
| 剧情解锁 | `新剧情已解锁` | `{{drama_name}}已经解锁，快来体验吧` | drama_unlocked | /drama |
| 成就解锁 | `获得新成就` | `恭喜获得「{{achievement_name}}」成就` | achievement_unlocked | /profile |

---

### 12.2 notification_settings（用户通知设置表）

| 属性 | 说明 |
|------|------|
| **表名** | `notification_settings` |
| **用途** | 用户个性化的推送通知设置 |
| **关联模块** | 通知系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 设置唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE, UNIQUE | - | NO | 用户ID |
| `push_enabled` | boolean | NOT NULL | true | NO | 推送总开关 |
| `email_enabled` | boolean | NOT NULL | false | NO | 邮件通知开关 |
| `proactive_enabled` | boolean | NOT NULL | true | NO | 主动消息通知开关 |
| `energy_alert_threshold` | bigint | - | 100 | YES | 电量低提醒阈值 |
| `quiet_hours_start` | time | - | '22:00' | YES | 免打扰开始时间 |
| `quiet_hours_end` | time | - | '08:00' | YES | 免打扰结束时间 |
| `timezone` | text | NOT NULL | 'Asia/Shanghai' | NO | 时区 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

### 12.3 notification_history（通知历史表）

| 属性 | 说明 |
|------|------|
| **表名** | `notification_history` |
| **用途** | 已发送通知的历史记录 |
| **关联模块** | 通知系统 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `template_id` | uuid | FK→notification_templates(id) ON DELETE SET NULL | - | YES | 使用的模板ID |
| `title` | text | NOT NULL | - | NO | 实际发送的标题 |
| `body` | text | NOT NULL | - | NO | 实际发送的正文 |
| `is_read` | boolean | NOT NULL | false | NO | 是否已读 |
| `read_at` | timestamptz | - | - | YES | 阅读时间 |
| `action_taken` | boolean | NOT NULL | false | NO | 是否已点击操作 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 发送时间 |

---

### 12.4 privacy_policies（隐私政策表）

| 属性 | 说明 |
|------|------|
| **表名** | `privacy_policies` |
| **用途** | 隐私政策版本管理 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 政策唯一标识 |
| `version` | text | NOT NULL, UNIQUE | - | NO | 版本号(如"1.0") |
| `content` | text | NOT NULL | - | NO | 政策全文 |
| `effective_at` | timestamptz | NOT NULL | - | NO | 生效时间 |
| `is_current` | boolean | NOT NULL | false | NO | 是否为当前版本 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |

---

### 12.5 consent_logs（用户同意记录表）

| 属性 | 说明 |
|------|------|
| **表名** | `consent_logs` |
| **用途** | 记录用户对隐私政策的同意状态(GDPR合规) |
| **主键** | `id` (uuid) |

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `user_id` | uuid | NOT NULL | - | NO | 用户ID |
| `consent_type` | text | NOT NULL, CHECK(5种类型) | - | NO | 同意类型 |
| `policy_version` | text | NOT NULL | - | NO | 政策版本 |
| `consent_given` | boolean | NOT NULL | true | NO | 是否同意 |
| `ip_address` | text | - | - | YES | 用户IP地址 |
| `user_agent` | text | - | - | YES | 用户代理信息 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 记录时间 |

---

### 12.6 data_export_requests（数据导出请求表）

| 属性 | 说明 |
|------|------|
| **表名** | `data_export_requests` |
| **用途** | GDPR数据可携带权：用户数据导出请求 |
| **主键** | `id` (uuid) |

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 请求唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `status` | text | NOT NULL, CHECK(5种状态) | 'pending' | NO | 请求状态 |
| `file_url` | text | - | - | YES | 导出文件URL |
| `expires_at` | timestamptz | - | - | YES | 文件过期时间 |
| `completed_at` | timestamptz | - | - | YES | 完成时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 请求时间 |

---

### 12.7 data_deletion_requests（数据删除请求表）

| 属性 | 说明 |
|------|------|
| **表名** | `data_deletion_requests` |
| **用途** | GDPR被遗忘权：用户数据删除请求 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(user_id)` |

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 请求唯一标识 |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE, UNIQUE | - | NO | 用户ID |
| `status` | text | NOT NULL, CHECK(5种状态) | 'pending' | NO | 请求状态 |
| `confirmation_token` | text | - | - | YES | 确认令牌 |
| `grace_period_end` | timestamptz | - | - | YES | 宽限期结束时间 |
| `processed_at` | timestamptz | - | - | YES | 处理时间 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 请求时间 |

---

## 13. 模块十一：系统配置与字典表

### 13.1 system_config（系统配置表）

| 属性 | 说明 |
|------|------|
| **表名** | `system_config` |
| **用途** | 全局系统配置，key-value形式 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(config_key)` |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 配置唯一标识 |
| `config_key` | text | NOT NULL, UNIQUE | - | NO | 配置键名 |
| `config_value` | text | NOT NULL | - | NO | 配置值 |
| `description` | text | - | - | YES | 配置说明 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

**种子数据**：

| 配置键 | 值 | 说明 |
|--------|-----|------|
| stm_retention_days | 3 | 短期记忆保留天数 |
| consolidation_interval_hours | 6 | LTM整合最小间隔(小时) |
| proactive_rate_limit_minutes | 30 | 主动消息最小间隔(分钟) |
| free_trial_energy | 100 | 新用户试用能量额度 |
| free_trial_expiry_days | 7 | 试用过期天数 |
| intimacy_daily_decay | 0 | 每日亲密度衰减(0=不衰减) |
| mood_decay_hours | 2 | 情绪自动衰减间隔(小时) |
| max_stm_per_cleanup | 10000 | 每次清理最大删除行数 |
| payment_order_expiry_minutes | 30 | 支付订单过期时间(分钟) |
| companion_creation_energy_cost | 0 | 创建伴侣能量消耗(0=免费) |

---

### 13.2 crowdfunding_projects（众筹项目表）

| 属性 | 说明 |
|------|------|
| **表名** | `crowdfunding_projects` |
| **用途** | 筹资/支持系统项目 |
| **类型** | 公开只读配置表 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 项目唯一标识 |
| `feature_name` | text | NOT NULL | - | NO | 功能名称 |
| `description` | text | NOT NULL | - | NO | 项目描述 |
| `target_amount` | bigint | NOT NULL, CHECK(target_amount > 0) | - | NO | 目标金额(分) |
| `current_amount` | bigint | NOT NULL, CHECK(current_amount >= 0) | 0 | NO | 当前已筹金额(分) |
| `status` | text | NOT NULL, CHECK(draft, active, funded, cancelled) | 'active' | NO | 项目状态 |
| `cover_image_url` | text | - | - | YES | 封面图片 |
| `deadline` | timestamptz | - | - | YES | 截止日期 |
| `sort_order` | smallint | NOT NULL | 0 | NO | 排序顺序 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 创建时间 |
| `updated_at` | timestamptz | NOT NULL | now() | NO | 最后更新时间 |

---

### 13.3 crowdfunding_backers（众筹支持者表）

| 属性 | 说明 |
|------|------|
| **表名** | `crowdfunding_backers` |
| **用途** | 记录用户对众筹项目的支持 |
| **关联模块** | 众筹系统 |
| **主键** | `id` (uuid) |
| **唯一约束** | `UNIQUE(project_id, user_id)` -- 每个用户对每个项目只能支持一次 |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | - | NO | 记录唯一标识 |
| `project_id` | uuid | NOT NULL, FK→crowdfunding_projects(id) ON DELETE CASCADE | - | NO | 项目ID |
| `user_id` | uuid | NOT NULL, FK→profiles(id) ON DELETE CASCADE | - | NO | 用户ID |
| `amount` | bigint | NOT NULL, CHECK(amount > 0) | - | NO | 支持金额(分) |
| `message` | text | - | - | YES | 留言 |
| `is_anonymous` | boolean | NOT NULL | false | NO | 是否匿名 |
| `created_at` | timestamptz | NOT NULL | now() | NO | 支持时间 |

---

## 14. 归档表与视图

### 14.1 stm_messages_archive（STM归档表）

| 属性 | 说明 |
|------|------|
| **表名** | `stm_messages_archive` |
| **用途** | 归档超过保留期的STM消息，用于分析和审计 |
| **主键** | `id` (uuid) -- 保留原始ID |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK | - | NO | 原始消息ID |
| `companion_id` | uuid | NOT NULL | - | NO | 伴侣ID |
| `speaker` | text | NOT NULL, CHECK(user, companion) | - | NO | 发言者 |
| `content` | text | NOT NULL | - | NO | 消息内容 |
| `emotion` | text | - | '' | YES | 情绪标注 |
| `token_count` | int | - | 0 | YES | Token数 |
| `dialogue_id` | text | - | '' | YES | 对话ID |
| `archived_at` | timestamptz | NOT NULL | now() | NO | 归档时间 |
| `original_created_at` | timestamptz | NOT NULL | - | NO | 原始创建时间 |

---

### 14.2 calendar_events_archive（日历事件归档表）

| 属性 | 说明 |
|------|------|
| **表名** | `calendar_events_archive` |
| **用途** | 归档已删除或已完成的日历事件 |
| **主键** | `id` (uuid) |

**完整列定义**：

| 列名 | 数据类型 | 约束 | 默认值 | Nullable | 用途说明 |
|------|---------|------|--------|----------|---------|
| `id` | uuid | PK | - | NO | 原始事件ID |
| `companion_id` | uuid | NOT NULL | - | NO | 伴侣ID |
| `title` | text | NOT NULL | - | NO | 事件标题 |
| `description` | text | - | - | YES | 事件描述 |
| `event_date` | date | NOT NULL | - | NO | 事件日期 |
| `event_type` | text | NOT NULL | - | NO | 事件类型 |
| `related_memory_id` | uuid | - | - | YES | 关联记忆ID |
| `archived_at` | timestamptz | NOT NULL | now() | NO | 归档时间 |
| `original_created_at` | timestamptz | NOT NULL | - | NO | 原始创建时间 |

---

### 14.3 数据库视图

#### 14.3.1 user_dashboard（用户仪表盘视图）

聚合用户的所有核心数据，便于前端一次性获取：

```sql
SELECT
  p.id AS user_id,
  p.nickname,
  p.status AS user_status,
  p.language,
  p.timezone,
  ea.balance AS energy_balance,
  CASE WHEN ft.is_active AND (ft.expires_at IS NULL OR ft.expires_at > now())
       THEN ft.total_energy - ft.consumed_energy ELSE 0 END AS trial_energy_remaining,
  COALESCE(ir.score, 0) AS intimacy_score,
  COALESCE(ir.milestone_stage, 1) AS milestone_stage,
  md.name AS milestone_name,
  c.id AS companion_id,
  c.nickname AS companion_nickname,
  c.gender AS companion_gender,
  c.bf_openness,
  c.bf_conscientiousness,
  c.bf_extraversion,
  c.bf_agreeableness,
  c.bf_neuroticism,
  (SELECT jsonb_build_object('pleasure', pleasure, 'arousal', arousal, 'dominance', dominance, 'occ_label', occ_label)
   FROM mood_records WHERE companion_id = c.id ORDER BY created_at DESC LIMIT 1) AS latest_mood,
  (SELECT count(*) FROM anterior_memories WHERE user_id = p.id AND status = 'pending') AS pending_anterior_count,
  (SELECT count(*) FROM stm_messages WHERE user_id = p.id AND created_at > now() - interval '1 day') AS today_message_count,
  (SELECT count(*) FROM ltm_memories WHERE user_id = p.id) AS ltm_memory_count
FROM profiles p
LEFT JOIN energy_accounts ea ON ea.user_id = p.id
LEFT JOIN free_trial_allocations ft ON ft.user_id = p.id
LEFT JOIN companions c ON c.user_id = p.id
LEFT JOIN intimacy_records ir ON ir.user_id = p.id
LEFT JOIN milestone_definitions md ON md.id = COALESCE(ir.milestone_stage, 1);
```

#### 14.3.2 energy_balance_summary（能量余额汇总视图）

```sql
SELECT
  ea.user_id,
  p.nickname,
  ea.balance,
  ea.total_recharged,
  ea.total_consumed,
  COALESCE(ft.total_energy - ft.consumed_energy, 0) AS trial_remaining,
  ea.version,
  ea.created_at AS account_created_at
FROM energy_accounts ea
JOIN profiles p ON p.id = ea.user_id
LEFT JOIN free_trial_allocations ft ON ft.user_id = ea.user_id;
```

#### 14.3.3 companion_full_profile（伴侣完整档案视图）

```sql
SELECT c.*,
  ir.score AS intimacy_score,
  ir.milestone_stage,
  md.name AS milestone_name,
  md.description AS milestone_description,
  (SELECT jsonb_build_object('pleasure', pleasure, 'arousal', arousal, 'dominance', dominance,
    'occ_label', occ_label, 'intensity', intensity, 'context', context, 'recorded_at', created_at)
   FROM mood_records WHERE companion_id = c.id ORDER BY created_at DESC LIMIT 1) AS current_mood,
  (SELECT count(*) FROM stm_messages WHERE companion_id = c.id AND created_at > now() - interval '24 hours') AS stm_24h_count,
  (SELECT count(*) FROM ltm_memories WHERE companion_id = c.id) AS ltm_total_count,
  (SELECT count(*) FROM anterior_memories WHERE companion_id = c.id AND status = 'pending') AS anterior_pending_count
FROM companions c
LEFT JOIN intimacy_records ir ON ir.companion_id = c.id
LEFT JOIN milestone_definitions md ON md.id = ir.milestone_stage;
```

---

## 15. 数据库函数汇总

### 15.1 能量相关函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `recharge_energy` | p_order_id uuid, p_user_id uuid, p_energy_amount bigint | new_balance bigint, success boolean | 充值函数，幂等设计：同一order_id不会重复充值 |
| `consume_energy` | p_user_id uuid, p_energy_amount bigint, p_description text, p_reference_id text | success boolean, new_balance bigint, consumed bigint | 消费函数，原子扣减，余额不足返回success=false |
| `consume_trial_energy` | p_user_id uuid, p_energy_amount bigint, p_description text | success boolean, consumed_from_trial bigint, consumed_from_balance bigint, new_balance bigint | 优先消耗试用额度再消耗余额的复合消费函数 |
| `get_user_energy` | p_user_id uuid | balance bigint, trial_remaining bigint, total_available bigint | 获取用户当前总能量(余额+试用) |

### 15.2 亲密度相关函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `adjust_intimacy` | p_user_id uuid, p_companion_id uuid, p_delta smallint, p_reason text | old_score smallint, new_score smallint, milestone_stage smallint | 调整亲密度，自动边界检查0-100，自动记录历史，自动创建缺失记录 |

### 15.3 情绪相关函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `update_mood` | p_companion_id uuid, p_pleasure smallint, p_arousal smallint, p_dominance smallint, p_occ_label text, p_intensity smallint, p_context text | mood_id uuid | 创建新情绪记录 |
| `get_current_mood` | p_companion_id uuid | pleasure smallint, arousal smallint, dominance smallint, occ_label text, intensity smallint, context text, created_at timestamptz | 获取伴侣最新情绪 |

### 15.4 关系相关函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `dissolve_relationship` | p_user_id uuid | boolean | **关系解除**：清除STM+非永久LTM+取消待办+重置亲密度+删除伴侣+恢复用户状态。有递归防护 |

### 15.5 维护函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `cleanup_stm` | p_retention_days int DEFAULT 3 | deleted_rows int | 清理超过保留天数的STM消息，先归档后删除 |

### 15.6 查询函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `search_ltm_memories` | p_user_id uuid, p_keyword text, p_limit int | 记忆列表 | 按关键词搜索LTM记忆(ILIKE匹配) |
| `get_intimacy_history` | p_user_id uuid, p_start_date date, p_end_date date | 历史列表 | 获取指定日期范围的亲密度变化历史 |
| `validate_coupon` | p_code text | is_valid boolean, coupon_id uuid, discount_type text, discount_value bigint, message text | 验证优惠券有效性 |

### 15.7 辅助函数

| 函数名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `private.set_config` | key text, val text | void | 安全设置配置变量(仅限app.*命名空间) |
| `set_updated_at` | - | trigger | 通用updated_at自动更新触发器函数 |

---

## 16. 触发器汇总

### 16.1 自动更新时间触发器

应用于所有包含`updated_at`列的表：

| 触发器名 | 目标表 | 触发时机 | 说明 |
|---------|--------|---------|------|
| `trg_profiles_updated_at` | profiles | BEFORE UPDATE | 自动更新updated_at |
| `trg_companions_updated_at` | companions | BEFORE UPDATE | 自动更新updated_at |
| `trg_pricing_plans_updated_at` | pricing_plans | BEFORE UPDATE | 自动更新updated_at |
| `trg_crowdfunding_projects_updated_at` | crowdfunding_projects | BEFORE UPDATE | 自动更新updated_at |
| `trg_system_config_updated_at` | system_config | BEFORE UPDATE | 自动更新updated_at |
| `trg_drama_definitions_updated_at` | drama_definitions | BEFORE UPDATE | 自动更新updated_at |
| `trg_ltm_memories_updated_at` | ltm_memories | BEFORE UPDATE | 自动更新updated_at |
| `trg_anterior_memories_updated_at` | anterior_memories | BEFORE UPDATE | 自动更新updated_at |
| `trg_energy_accounts_updated_at` | energy_accounts | BEFORE UPDATE | 自动更新updated_at |
| `trg_free_trial_allocations_updated_at` | free_trial_allocations | BEFORE UPDATE | 自动更新updated_at |
| `trg_payment_orders_updated_at` | payment_orders | BEFORE UPDATE | 自动更新updated_at |
| `trg_refund_orders_updated_at` | refund_orders | BEFORE UPDATE | 自动更新updated_at |
| `trg_calendar_events_updated_at` | calendar_events | BEFORE UPDATE | 自动更新updated_at |
| `trg_drama_sessions_updated_at` | drama_sessions | BEFORE UPDATE | 自动更新updated_at |
| `trg_drama_progress_updated_at` | drama_progress | BEFORE UPDATE | 自动更新updated_at |
| `trg_discount_coupons_updated_at` | discount_coupons | BEFORE UPDATE | 自动更新updated_at |
| `trg_intimacy_records_updated_at` | intimacy_records | BEFORE UPDATE | 自动更新updated_at |
| `trigger_proactive_schedule_updated_at` | proactive_schedule | BEFORE UPDATE | 自动更新updated_at |

### 16.2 业务逻辑触发器

| 触发器名 | 目标表 | 触发时机 | 说明 |
|---------|--------|---------|------|
| `trg_profiles_after_insert` | profiles | AFTER INSERT | 新用户注册后：自动创建energy_accounts + free_trial_allocations |
| `trg_companions_after_insert` | companions | AFTER INSERT | 创建伴侣后：更新profile.status为'HAS_COMPANION' + 创建intimacy_records |
| `trg_intimacy_milestone_check` | intimacy_records | BEFORE UPDATE OF score | score更新时：自动根据milestone_definitions重新计算milestone_stage |
| `trg_payment_orders_status` | payment_orders | BEFORE UPDATE OF status | status变为'paid'时：自动调用recharge_energy充值 + 设置paid_at |
| `trg_crowdfunding_backers_change` | crowdfunding_backers | AFTER INSERT/DELETE/UPDATE | 支持者变化时：自动更新crowdfunding_projects.current_amount |
| `trg_anterior_memories_status` | anterior_memories | BEFORE UPDATE OF status | status变为'completed'时：自动归档关联的calendar_events |
| `trg_refund_orders_status` | refund_orders | BEFORE UPDATE OF status | status变为'success'时：自动扣除对应能量 |

---

## 17. RLS策略汇总

### 17.1 用户数据表（用户只能访问自己的数据）

| 表名 | SELECT策略 | INSERT策略 | UPDATE策略 | DELETE策略 |
|------|-----------|-----------|-----------|-----------|
| `profiles` | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | - |
| `companions` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `energy_accounts` | `auth.uid() = user_id` | system only | system only | - |
| `energy_transactions` | `auth.uid() = user_id` | system only | - | - |
| `free_trial_allocations` | `auth.uid() = user_id` | system only | system only | - |
| `payment_orders` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | - |
| `payment_callbacks` | 通过order_id关联 | - | - | - |
| `refund_orders` | 通过order_id关联 | - | - | - |
| `stm_messages` | 通过companion_id关联 | 通过companion_id关联 | - | 通过companion_id关联 |
| `ltm_memories` | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 |
| `anterior_memories` | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 |
| `intimacy_records` | 通过companion_id关联 | system only | 通过companion_id关联 | - |
| `intimacy_history` | 通过companion_id关联 | system only | - | - |
| `mood_records` | 通过companion_id关联 | system only | 通过companion_id关联 | 通过companion_id关联 |
| `calendar_events` | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 |
| `drama_sessions` | 通过companion_id关联 | 通过companion_id关联 | 通过companion_id关联 | - |
| `drama_messages` | 通过session_id关联 | 通过session_id关联 | - | - |
| `drama_progress` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | - |
| `gift_transactions` | `auth.uid() = user_id` | `auth.uid() = user_id` | - | - |
| `user_achievements` | `auth.uid() = user_id` | system only | `auth.uid() = user_id` | - |
| `companion_diaries` | 通过companion_id关联 | system only | 通过companion_id关联 | - |
| `notification_settings` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | - |
| `notification_history` | `auth.uid() = user_id` | - | - | - |
| `data_export_requests` | `auth.uid() = user_id` | `auth.uid() = user_id` | - | - |
| `data_deletion_requests` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | - |
| `consent_logs` | `auth.uid() = user_id` | `auth.uid() = user_id` | - | - |
| `proactive_schedule` | `auth.uid() = user_id` | - | - | - |

### 17.2 公共字典表（所有认证用户可读）

| 表名 | SELECT策略 |
|------|-----------|
| `milestone_definitions` | `true` (所有认证用户可读) |
| `pricing_plans` | `is_active = true` |
| `emotion_occs` | `true` |
| `drama_definitions` | `is_active = true` + 解锁条件检查 |
| `drama_categories` | `true` |
| `drama_tags` | `true` |
| `drama_tag_mappings` | `true` |
| `drama_ratings` | `true` |
| `drama_reviews` | `true` |
| `drama_templates` | `true` |
| `drama_template_variables` | `true` |
| `drama_endings` | `true` |
| `drama_branches` | `true` |
| `achievement_definitions` | `true` |
| `gift_catalog` | `true` |
| `system_config` | `true` |
| `crowdfunding_projects` | `true` |
| `crowdfunding_backers` | `auth.uid() = user_id OR true` |
| `discount_coupons` | `is_active = true AND 时间有效` |
| `privacy_policies` | `true` |

---

## 18. 索引策略

### 18.1 索引设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **FK列必索引** | 所有外键列必须建立索引 | `idx_stm_companion_id` |
| **RLS过滤列必索引** | RLS WHERE条件中使用的列 | `idx_companions_user_id` |
| **时间范围列必索引** | 用于时间范围查询的列 | `idx_stm_created_at` |
| **状态过滤用部分索引** | WHERE status = 'x' 使用部分索引 | `idx_ltm_is_permanent WHERE is_permanent = true` |
| **多列过滤用复合索引** | 常用组合条件使用复合索引 | `idx_stm_companion_created` |

### 18.2 按表索引清单

详见各表的**索引**小节。总计约70+个索引，覆盖所有表的查询场景。

---

## 19. 数据流说明

### 19.1 核心业务流程数据流

#### 19.1.1 用户注册流程

```
auth.users (Supabase Auth自动创建)
    │
    ▼ (触发器 AFTER INSERT)
profiles (用户资料)
    │
    ├──► energy_accounts (能量账户, balance=0)
    └──► free_trial_allocations (试用额度, total_energy=100, 7天过期)
```

#### 19.1.2 伴侣创建流程

```
companions (INSERT)
    │
    ├──► (触发器) profiles.status = 'HAS_COMPANION'
    │
    └──► (触发器) intimacy_records (score=0, milestone_stage=1)
```

#### 19.1.3 对话流程

```
用户发送消息 ──► stm_messages (INSERT, speaker='user')
    │
    ├──► 情绪检测 (DeepSeek API) ──► emotion_label 异步更新
    │
    ├──► 能量检查 ──► energy_accounts.balance >= 50?
    │   │
    │   ├──► 是: consume_energy() ──► energy_transactions (INSERT, txn_type='consume')
    │   └──► 否: 返回402余额不足
    │
    ├──► AI回复 (DeepSeek Streaming) ──► stm_messages (INSERT, speaker='companion')
    │
    ├──► 亲密度更新 ──► adjust_intimacy() ──► intimacy_history (INSERT)
    │
    ├──► Proactive Schedule更新 ──► proactive_schedule (UPSERT, next_trigger_at更新)
    │
    └──► (异步) 触发 consolidation Edge Function
```

#### 19.1.4 记忆整合(Consolidation)流程

```
pg_cron 每15分钟触发
    │
    ▼
consolidation Edge Function
    │
    ├──► 查询 stm_messages (最近1小时无新消息的对话)
    │
    ├──► DeepSeek AI分析对话内容
    │   │
    │   ├──► 提取结构化记忆 ──► ltm_memories (INSERT/UPSERT)
    │   │   ├── memory_type: fact/preference/event/emotion/relationship/goal
    │   │   ├── importance: 0.1-1.0
    │   │   └── is_permanent: true/false
    │   │
    │   ├──► 提取待办事项 ──► anterior_memories (INSERT)
    │   │   ├── trigger_type: time_based/event_based/milestone_based
    │   │   └── priority: 1-5
    │   │
    │   └──► 生成日记 ──► companion_diaries (INSERT)
    │       ├── 第一人称叙事
    │       ├── emotion_tag
    │       └── key_moments[]
    │
    └──► 更新 companion_consolidations (last_consolidated_at)
```

#### 19.1.5 主动消息(Proactive)流程

```
pg_cron 每分钟触发
    │
    ▼
proactive-scheduler Edge Function
    │
    ├──► 查询 proactive_schedule 
    │   WHERE next_trigger_at <= now() AND is_triggered = false
    │   LIMIT 10
    │
    ├──► 逐个处理:
    │   │
    │   ├──► 获取companion信息 + LTM记忆 + anterior待办 + 最近STM
    │   │
    │   ├──► 计算用户静默时长 ──► 调整消息语气
    │   │
    │   ├──► DeepSeek生成主动消息
    │   │
    │   ├──► 扣除能量(10) ──► energy_accounts / energy_transactions
    │   │
    │   ├──► 保存消息 ──► stm_messages (INSERT, speaker='companion')
    │   │
    │   └──► 更新 proactive_schedule 
    │       ├── next_trigger_at = 随机2分钟-24小时后(避开3-6am睡眠窗口)
    │       └── is_triggered = false
    │
    └──► 返回处理结果统计
```

#### 19.1.6 充值流程

```
用户选择套餐 ──► payment-create Edge Function
    │
    ├──► INSERT payment_orders (status='pending')
    │
    ├──► 调用Zpay API生成支付链接
    │
    └──► 返回 payment_url 给用户

用户完成支付 ──► Zpay服务器回调
    │
    ▼
payment-callback Edge Function
    │
    ├──► 验证签名
    │
    ├──► 验证订单存在且未支付
    │
    ├──► UPDATE payment_orders SET status='paid', paid_cents=xxx
    │   │
    │   └──► (触发器) recharge_energy() 
    │       ├── UPDATE energy_accounts (balance += energy_amount)
    │       └── INSERT energy_transactions (txn_type='recharge')
    │
    └──► 返回 'success' 给Zpay
```

#### 19.1.7 剧情空间流程

```
用户进入剧情空间 ──► drama-session Edge Function (action='start')
    │
    ├──► INSERT drama_sessions (status='active')
    │
    ├──► INSERT drama_progress (is_unlocked=true)
    │
    ├──► INSERT drama_messages (speaker='narrator', 开场白)
    │
    └──► 返回 session_id

用户在剧情中发消息 ──► drama-chat Edge Function
    │
    ├──► INSERT drama_messages (speaker='user')
    │
    ├──► 能量检查 (balance >= 30)
    │
    ├──► 构建剧情上下文prompt (scene_setting + drama_prompt + 历史消息)
    │
    ├──► DeepSeek Streaming生成回复
    │
    ├──► INSERT drama_messages (speaker='companion', AI回复)
    │
    ├──► 扣除能量(30) + 记录流水
    │
    └──► UPDATE drama_sessions (context_memory)
```

#### 19.1.8 关系解除流程

```
用户确认解除关系 ──► dissolve_relationship(user_id)
    │
    ├──► DELETE FROM stm_messages WHERE user_id = ?
    │
    ├──► DELETE FROM ltm_memories WHERE user_id = ? AND is_permanent = false
    │   (永久记忆保留，用于重逢场景)
    │
    ├──► UPDATE anterior_memories SET status='cancelled' WHERE user_id = ? AND status='pending'
    │
    ├──► UPDATE intimacy_records SET score=0, milestone_stage=1 WHERE user_id = ?
    │
    ├──► DELETE FROM companions WHERE user_id = ?
    │   │
    │   └──► (触发器，受session guard保护，不重复执行)
    │
    └──► UPDATE profiles SET status='NO_COMPANION' WHERE id = ?
```

---

## 20. 关键设计决策说明

### 20.1 三层记忆架构的设计考量

| 决策 | 说明 |
|------|------|
| **STM只保留3天** | 平衡存储成本和对话上下文需求；超过3天的对话由LTM以摘要形式保留 |
| **LTM由AI提取而非逐条归档** | AI Consolidation将对话提炼为结构化记忆(fact/preference/event/emotion/relationship/goal)，比原始消息更精炼 |
| **LTM的importance分级** | 0.1-1.0的分级使得系统可以根据重要性进行差异化处理（如低重要性记忆可遗忘） |
| **is_permanent标记** | 关键信息（如真实姓名、生日）标记为不可删除，即使关系解除也保留，为"重逢"场景铺垫 |
| **Anterior Memory独立表** | 将待办/提醒从LTM中分离，支持时间/事件/里程碑三种触发类型，优先级队列 |

### 20.2 Big Five人格模型的设计考量

| 决策 | 说明 |
|------|------|
| **OCEAN五维度各0-100** | 基于心理学Big Five模型，每个维度10级描述，直接影响AI system prompt的构建 |
| **默认值50(均衡)** | 未设置时取中间值，避免极端人格 |
| **直接影响AI回复** | chat-stream函数将五维度值翻译为10级描述文本，拼入system prompt |

### 20.3 亲密度五阶段体系

| 决策 | 说明 |
|------|------|
| **分数0-100，5阶段** | 参考恋爱养成游戏的阶段设计，每20分为一个阶段 |
| **milestone_definitions独立表** | 阶段阈值和功能解锁可配置，不硬编码 |
| **自动升级触发器** | score变化时自动重新计算stage，无需应用层处理 |
| **历史记录完整保存** | intimacy_history记录每次分数变化，old_score/new_score/change_reason |

### 20.4 能量经济体系

| 决策 | 说明 |
|------|------|
| **BIGINT类型，最小单位1** | 避免浮点数精度问题 |
| **乐观锁(version字段)** | energy_accounts高频并发更新使用乐观锁，避免行锁竞争 |
| **试用额度优先消耗** | 新用户先消耗免费额度，培养使用习惯后再引导充值 |
| **幂等充值** | recharge_energy()函数通过reference_id实现幂等，防止重复充值 |
| **各功能差异化定价** | 聊天50/条、剧情30/条、主动10/条，体现功能价值差异 |

### 20.5 RLS安全策略

| 决策 | 说明 |
|------|------|
| **所有用户数据表启用RLS** | 无例外，确保数据隔离 |
| **通过companion_id关联的间接RLS** | stm_messages/ltm_memories等表不直接存user_id，而是通过companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid())实现间接控制 |
| **system only的INSERT策略** | intimacy_records/mood_records等由触发器或SECURITY DEFINER函数插入的数据，INSERT策略设为system only |
| **字典表公开只读** | milestone_definitions/pricing_plans等配置表允许所有认证用户SELECT |

### 20.6 主动消息调度设计

| 决策 | 说明 |
|------|------|
| **pg_cron每分钟轮询** | 精度到分钟级，满足"随时可能发消息"的需求 |
| **next_trigger_at + is_triggered双字段** | next_trigger_at决定何时触发，is_triggered防止同一分钟内重复触发 |
| **2分钟-24小时随机间隔** | 避免消息过于规律显得机械，同时避开用户睡眠窗口(3am-6am) |
| **时间感知语气调整** | 根据用户静默时长(<0.5h/0.5-2h/2-6h/6-12h/12-24h/>24h)调整6档语气 |

### 20.7 数据库扩展规划(MVP预留)

| 预留字段/表 | 未来用途 |
|------------|---------|
| `profiles.live2d_enabled` | Live2D虚拟形象 |
| `profiles.voice_enabled` | 语音合成/语音识别 |
| `profiles.pet_enabled` | 宠物系统 |
| `companions.live2d_model_path` | Live2D模型路径 |
| `companions.voice_id` | 语音ID |
| `companions.pet_name/pet_type` | 宠物系统 |
| `drama_templates` / `drama_template_variables` | 剧情模板系统，用户可自定义剧情 |
| `drama_session_intimacy` | 剧情内独立好感度，不影响主亲密度 |
| `notification_*` 系列表 | 推送通知系统 |
| `privacy_*` / `consent_logs` / `data_*_requests` | GDPR合规 |

---

## 附录A：数据库对象统计

| 类别 | 数量 |
|------|------|
| 业务表 | 35+ |
| 归档表 | 2 |
| 视图 | 3 |
| 数据库函数 | 12+ |
| 触发器 | 20+ |
| RLS策略 | 50+ |
| 索引 | 70+ |
| 种子数据脚本 | 8组 |

## 附录B：参考文档

| 文档 | 说明 |
|------|------|
| [Supabase Auth文档](https://supabase.com/docs/guides/auth) | 认证系统 |
| [Supabase RLS文档](https://supabase.com/docs/guides/database/postgres/row-level-security) | 行级安全 |
| [PostgreSQL触发器](https://www.postgresql.org/docs/current/triggers.html) | 触发器语法 |
| [Big Five人格模型](https://en.wikipedia.org/wiki/Big_Five_personality_traits) | OCEAN模型参考 |
| [OCC情绪模型](https://en.wikipedia.org/wiki/OCC_model) | 情绪计算参考 |

---

> **文档结束**  
> 本文档由Platonic技术团队维护，如有变更请及时更新版本号。
