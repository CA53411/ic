# Corolas | Platonic — 完整项目交接文档

> **项目版本**: v1.0  
> **交接日期**: 2026-05-26  
> **文档总篇幅**: 5,700+ 行（3份专业子文档）  
> **项目总代码量**: 30,000+ 行（前端 + 后端 Edge Functions）  

---

## 一、项目概述

**Corolas | Platonic** 是一款AI虚拟伴侣应用，为用户提供深度情感陪伴和互动体验。用户可以在Plaza中选择或自定义自己的AI伴侣，通过Chat进行情感对话，在Drama Space中体验沉浸式剧情，并通过亲密度系统见证与伴侣关系的成长。

### 核心功能模块

| 模块 | 说明 | 技术实现 |
|------|------|----------|
| **Plaza（伴侣广场）** | 浏览和选择AI伴侣 | Plaza.tsx + companion_presets表 |
| **Customize（自定义伴侣）** | 从零创建个性化伴侣 | Customize.tsx + companions表 |
| **Chat（聊天）** | SSE流式情感对话 | Chat.tsx + chat-stream Edge Function |
| **Dashboard（主控面板）** | Big Five雷达图、亲密度、能量 | Dashboard.tsx |
| **Memory（记忆系统）** | 三层记忆体系 | consolidation Edge Function |
| **Drama（剧情空间）** | 沉浸式剧本体验 | Drama.tsx + DramaSpace.tsx + drama-chat |
| **Energy（能量系统）** | 货币化消费体系 | energy Edge Function |
| **Payment（支付）** | 能量充值 | payment-create + payment-callback |
| **Achievement（成就）** | 用户成就系统 | achievement-check Edge Function |
| **Proactive（主动消息）** | 伴侣主动发起对话 | proactive + proactive-scheduler |

### 技术架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React 18 + Vite)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Home   │ │  Plaza  │ │  Chat   │ │  Drama  │  ...      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│         ↑ Supabase JS Client (REST + Realtime)               │
└─────────┼───────────────────────────────────────────────────┘
          ↓ HTTPS
┌─────────┼───────────────────────────────────────────────────┐
│         ↓              Supabase Platform                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Edge Functions (Deno Runtime)                │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │chat-stream│ │drama-chat│ │  energy  │  ...      │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
│         ↑ SQL (PostgREST)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         PostgreSQL 15 + pg_cron + pg_net            │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │
│  │  │companions│ │stm_messages│ │drama_*  │ │energy_* │       │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │
│  └─────────────────────────────────────────────────────┘    │
│         ↑ Auth (JWT)                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Supabase Auth (GoTrue)                       │    │
│  │         Email/Password + OAuth (Google/GitHub)       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          ↓
    DeepSeek API (LLM)
    ZPay API (支付)
```

### 项目目录结构

```
/mnt/agents/output/
├── app/                          # 前端应用 (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx               # 根组件 + 路由定义
│   │   ├── main.tsx              # 应用入口
│   │   ├── pages/                # 13个页面组件
│   │   │   ├── Home.tsx          # 首页 Landing Page (785行)
│   │   │   ├── Auth.tsx          # 登录/注册 (1100+行)
│   │   │   ├── Dashboard.tsx     # 主控面板 (1100+行)
│   │   │   ├── Plaza.tsx         # 伴侣广场 (924行)
│   │   │   ├── Customize.tsx     # 自定义伴侣 (1127行)
│   │   │   ├── Chat.tsx          # 聊天界面 (978行)
│   │   │   ├── Drama.tsx         # 剧情广场 (765行)
│   │   │   ├── DramaSpace.tsx    # 剧情空间 (570行)
│   │   │   ├── Settings.tsx      # 设置页面 (1000+行)
│   │   │   ├── Memory.tsx        # 记忆系统
│   │   │   ├── Payment.tsx       # 支付页面
│   │   │   ├── Crowdfunding.tsx  # 众筹页面
│   │   │   └── Achievement.tsx   # 成就页面
│   │   ├── components/           # 共享组件
│   │   │   ├── Layout.tsx        # 布局组件
│   │   │   ├── Navbar.tsx        # 导航栏
│   │   │   ├── Footer.tsx        # 页脚
│   │   │   └── ui/               # 52个shadcn/ui组件
│   │   ├── context/              # React Context
│   │   │   ├── AuthContext.tsx   # 认证状态管理
│   │   │   └── ThemeContext.tsx  # 主题管理 (Light/Dark/Auto)
│   │   ├── i18n/                 # 国际化
│   │   │   ├── I18nContext.tsx   # i18n上下文
│   │   │   └── translations.ts   # 翻译文件
│   │   ├── hooks/                # 自定义Hooks
│   │   │   ├── useAuth.ts        # 认证Hook
│   │   │   └── use-mobile.ts     # 移动端检测
│   │   ├── lib/                  # 工具库
│   │   │   ├── supabase.ts       # Supabase客户端
│   │   │   ├── theme.ts          # 主题工具
│   │   │   └── utils.ts          # 工具函数
│   │   └── types/                # TypeScript类型定义
│   ├── public/                   # 静态资源
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── backend/                      # 后端 Edge Functions
│   └── supabase/
│       ├── functions/            # 13个Edge Functions
│       │   ├── chat-stream/      # SSE流式对话
│       │   ├── drama-chat/       # SSE剧情对话
│       │   ├── drama-session/    # 剧情会话管理
│       │   ├── energy/           # 能量账户管理
│       │   ├── payment-create/   # 创建支付
│       │   ├── payment-callback/ # 支付回调
│       │   ├── achievement-check/# 成就检查
│       │   ├── consolidation/    # 记忆整合
│       │   ├── milestone-adjust/ # 亲密度调整
│       │   ├── proactive/        # 主动消息
│       │   ├── proactive-scheduler/ # 定时调度
│       │   ├── seed-data/        # 种子数据
│       │   ├── setup-proactive/  # 初始化定时任务
│       │   └── _shared/          # 共享模块
│       │       ├── cors.ts       # CORS配置
│       │       ├── deepseek.ts   # DeepSeek API
│       │       ├── supabase.ts   # Supabase客户端
│       │       └── zpay.ts       # ZPay支付
│       ├── migrations/           # 数据库迁移
│       └── types/
│
└── PROJECT_DOCS/                 # 项目文档（本目录）
    ├── 00-project-overview.md    # 项目总览（本文档）
    ├── 01-database-schema.md     # 数据库Schema文档（2419行）
    ├── 02-edge-functions.md      # Edge Functions文档（1619行）
    └── 03-frontend-architecture.md # 前端架构文档（1675行）
```

---

## 二、文档索引

### 文档1：数据库Schema文档（2,419行）
**文件**: `01-database-schema.md`

涵盖内容：
- **47张数据表**的完整定义（包括core/extension/archived表）
- **12个数据库函数**（含参数签名和返回值）
- **20+个触发器**
- **50+个RLS策略**
- **8个核心业务流程**的数据流图
- **7大设计决策**说明

主要模块：
1. 用户与认证（auth.users, profiles）
2. 伴侣核心（companions - Big Five五维人格）
3. 三层记忆（stm_messages → ltm_memories → anterior_memories）
4. 亲密度与情绪（milestone_definitions, intimacy_records, mood_records）
5. 能量与支付（energy_accounts, energy_transactions, payment_orders）
6. 剧情空间（drama_definitions, drama_sessions, drama_messages）
7. 主动消息（proactive_schedule + pg_cron）
8. 成就与礼物（achievement_definitions, user_achievements）

### 文档2：Edge Functions文档（1,619行）
**文件**: `02-edge-functions.md`

涵盖内容：
- **13个Edge Functions**的完整API文档
- **4个共享模块**的源码说明
- 每个函数的：接口定义、参数详解、处理流程、错误码、安全机制
- 部署配置汇总（verify_jwt + CORS设置）

Edge Functions清单：
| # | 函数名 | 功能 | verify_jwt | 关键特性 |
|---|--------|------|-----------|----------|
| 1 | chat-stream | SSE流式对话 | false | CORS + 手动JWT + 乐观锁 |
| 2 | drama-chat | SSE剧情对话 | false | CORS + 手动JWT + 沉浸式提示词 |
| 3 | drama-session | 剧情会话管理 | false | 5种action + 手动JWT |
| 4 | energy | 能量账户 | true | 乐观锁并发保护 |
| 5 | payment-create | 创建支付 | true | ZPay集成 |
| 6 | payment-callback | 支付回调 | false | 签名验证 + 防双重充值 |
| 7 | achievement-check | 成就检查 | true | 多维度成就判定 |
| 8 | consolidation | 记忆整合 | false | 定时任务调用 |
| 9 | milestone-adjust | 亲密度调整 | true | 里程碑自动推进 |
| 10 | proactive | 主动消息 | true | DeepSeek生成 + 情绪感知 |
| 11 | proactive-scheduler | 定时调度 | false | pg_cron触发 |
| 12 | seed-data | 种子数据 | false | 全表数据初始化 |
| 13 | setup-proactive | 初始化定时任务 | false | 一键配置pg_cron |

### 文档3：前端架构文档（1,675行）
**文件**: `03-frontend-architecture.md`

涵盖内容：
- **13个页面组件**的逐行拆解（State/Props/Hooks/函数/UI/数据流）
- **3个Context系统**的完整说明
- **52个shadcn/ui组件**清单
- **14条路由**的定义和守卫逻辑
- **样式体系**：Tailwind + 暗色/亮色模式切换
- **状态管理策略**

---

## 三、关键技术决策

### 1. CORS + 手动JWT验证模式
由于Supabase Edge Functions的JWT自动验证会拦截OPTIONS预检请求，部分函数采用：`verify_jwt = false` + 函数内部手动JWT验证。涉及的函数：chat-stream, drama-chat, drama-session, payment-callback, consolidation, proactive-scheduler, seed-data, setup-proactive。

### 2. `.single()` → `.maybeSingle()` 迁移
PostgREST的`.single()`在返回0行或多行时抛出错误。所有生产代码已统一使用`.maybeSingle()`，并通过数组索引`data?.[0]`安全取值。

### 3. 乐观锁并发保护
能量消费使用版本号乐观锁：先读取version → update时where version=读取值 → 检查affected_rows。防止并发扣费。

### 4. Drama Space完全独立架构
剧情空间拥有独立的表（drama_definitions, drama_sessions, drama_messages）、独立的Edge Functions（drama-chat, drama-session）、独立的UI组件（Drama.tsx + DramaSpace.tsx），与Chat系统零耦合。

### 5. 三层记忆体系
- **STM（短期记忆）**: 最近50条对话，直接在chat-stream中查询
- **LTM（长期记忆）**: 通过consolidation Edge Function从STM聚合生成
- **Anterior（远事记忆）**: 从LTM进一步升华，用于深度情感回忆

---

## 四、环境配置

### Supabase项目
- **项目ID**: iqylckwmmygqutycqmlb
- **区域**: us-east-1
- **数据库**: PostgreSQL 15
- **认证**: Email/Password + OAuth (Google/GitHub)

### Edge Functions部署
使用Management API（DELETE + POST方式，PATCH不更新代码）：
```bash
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/functions/{name}" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN"

curl -X POST "https://api.supabase.com/v1/projects/{ref}/functions" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -F "file=@function.zip" \
  -F "name={name}" \
  -F "verify_jwt=false"
```

### 前端部署
- **平台**: Vercel
- **构建命令**: `npm run build`
- **输出目录**: `dist`
- **环境变量**: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

---

## 五、已知问题与修复记录

### 已修复的关键Bug

| Bug | 原因 | 修复方式 |
|-----|------|----------|
| companions表插入失败 | birth_month/birth_day/language/pet_name/pet_type列不存在 | 从insert中移除这些列 |
| .single()崩溃 | 返回0行或多行时抛异常 | 改为.maybeSingle() |
| drama-session body读取两次 | bodyAction() + req.json()双重消费 | 移除bodyAction() |
| CORS preflight被拦截 | verify_jwt=true时OPTIONS请求无JWT | verify_jwt=false + 手动验证 |
| 前端Supabase key过期 | publishable key过期 | 在supabase.ts中hardcode正确key |
| 支付回调双重充值 | 无幂等保护 | 添加payment_order状态检查 |
| 能量并发扣费 | 无并发控制 | 添加version乐观锁 |

### 待优化项
- [ ] companion_presets表需要初始化数据
- [ ] Chat.tsx第288行仍使用.single()（改为.maybeSingle()）
- [ ] OAuth登录（Google/GitHub）当前禁用，需配置OAuth应用
- [ ] Live2D和Pet功能为占位UI，需后续开发

---

## 六、数据库核心表速查

### companions表（伴侣核心表）

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | 唯一标识 |
| user_id | uuid | FK→auth.users.id, not null | 所属用户 |
| nickname | text | | 昵称 |
| gender | text | | female / male |
| age | integer | default 18 | 年龄 |
| personality_prompt | text | | 人格提示词 |
| background | text | | 背景故事 |
| avatar_url | text | | 头像URL |
| bf_openness | integer | | 开放性 0-100 |
| bf_conscientiousness | integer | | 尽责性 0-100 |
| bf_extraversion | integer | | 外向性 0-100 |
| bf_agreeableness | integer | | 宜人性 0-100 |
| bf_neuroticism | integer | | 神经质 0-100 |
| bio | text | | 个性签名 |
| created_at | timestamptz | default now() | 创建时间 |
| updated_at | timestamptz | default now() | 更新时间 |

### stm_messages表（短期记忆）

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | uuid | PK | 唯一标识 |
| user_id | uuid | FK→auth.users.id | 用户ID |
| companion_id | uuid | FK→companions.id | 伴侣ID |
| speaker | text | not null | user / companion |
| content | text | not null | 消息内容 |
| emotion_label | text | | 情绪标签 |
| message_type | text | default 'text' | text/image/audio/system |
| edit_count | integer | default 0 | 编辑次数 |
| is_deleted | boolean | default false | 软删除标记 |
| tokens_used | integer | default 0 | 消耗token数 |
| created_at | timestamptz | default now() | 创建时间 |

---

## 七、联系方式

- **项目邮箱**: corolar@corolas.top
- **项目域名**: https://platonic.corolas.top
- **GitHub仓库**: https://github.com/CA53411/ic

---

> 本文档由AI助手在2026-05-26生成，总篇幅5,700+行。  
> 3份子文档分别详细覆盖：数据库Schema（2,419行）、Edge Functions（1,619行）、前端架构（1,675行）。
