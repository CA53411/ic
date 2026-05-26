# Corolas | Platonic — AI Coding Agent Guide

> 本文档供 AI 编程助手阅读。如果你正在维护或扩展本项目，请先通读此文档。
> 项目主要文档语言为中文，代码注释混合中英文。

---

## 1. 项目概述

**Corolas | Platonic** 是一款 AI 虚拟伴侣 Web 应用。用户可以在 Plaza（伴侣广场）选择或自定义 AI 伴侣，通过 Chat 进行情感对话，在 Drama Space 体验沉浸式剧情，并通过亲密度系统见证与伴侣关系的成长。

- **项目域名**: https://platonic.corolas.top
- **项目邮箱**: corolar@corolas.top
- **GitHub 仓库**: https://github.com/CA53411/ic
- **总代码量**: 30,000+ 行（前端 + Edge Functions）

### 核心功能模块

| 模块 | 说明 | 对应页面/函数 |
|------|------|--------------|
| **Plaza** | 浏览和选择 AI 伴侣 | `Plaza.tsx` + `companion_presets` 表 |
| **Customize** | 从零创建个性化伴侣 | `Customize.tsx` + `companions` 表 |
| **Chat** | SSE 流式情感对话 | `Chat.tsx` + `chat-stream` Edge Function |
| **Dashboard** | 主控面板（Big Five 雷达图、亲密度、能量） | `Dashboard.tsx` |
| **Memory** | 三层记忆体系（日历视图） | `Memory.tsx` + `consolidation` Edge Function |
| **Drama** | 沉浸式剧本体验 | `Drama.tsx` + `DramaSpace.tsx` + `drama-chat` |
| **Energy** | 应用内货币化消费体系 | `Payment.tsx` + `energy` Edge Function |
| **Payment** | 能量充值（ZPay 集成） | `payment-create` + `payment-callback` |
| **Achievement** | 用户成就系统 | `achievement-check` Edge Function |
| **Proactive** | 伴侣主动发起对话 | `proactive` + `proactive-scheduler` |

---

## 2. 技术栈

### 前端

| 技术 | 版本/说明 |
|------|----------|
| React | 19.2.0 |
| TypeScript | ~5.9.3 |
| Vite | 7.2.4 |
| Tailwind CSS | 3.4.19 |
| shadcn/ui | new-york 风格，52+ 个组件 |
| React Router | 7.x（使用 `HashRouter`） |
| Framer Motion | 动画库 |
| Supabase JS Client | 认证 + 数据库 + Edge Functions |
| Zod | 表单校验 |
| React Hook Form | 表单管理 |
| date-fns | 日期处理 |
| sonner | Toast 通知 |

### 后端

| 技术 | 说明 |
|------|------|
| Supabase Platform | 托管 PostgreSQL 15 + Auth + Edge Functions |
| Edge Functions | 13 个，Deno Runtime |
| AI 模型 | DeepSeek Chat API (`deepseek-v4-flash`) |
| 支付网关 | ZPay (zpayz.cn) |
| 定时调度 | pg_cron (PostgreSQL 扩展) |

### 数据库

- PostgreSQL 15+（Supabase 托管）
- 47+ 张数据表
- 全表启用 RLS（Row Level Security）
- UUID 主键策略（`gen_random_uuid()`）

---

## 3. 目录结构

```
├── app/                          # 前端应用 (React + Vite)
│   ├── src/
│   │   ├── App.tsx               # 根组件 + 路由定义（14 条路由）
│   │   ├── main.tsx              # 应用入口（HashRouter）
│   │   ├── pages/                # 13 个页面组件
│   │   │   ├── Home.tsx          # 首页 Landing Page
│   │   │   ├── Auth.tsx          # 登录/注册
│   │   │   ├── Dashboard.tsx     # 主控面板
│   │   │   ├── Plaza.tsx         # 伴侣广场
│   │   │   ├── Customize.tsx     # 自定义伴侣
│   │   │   ├── Chat.tsx          # 聊天界面
│   │   │   ├── Drama.tsx         # 剧情广场
│   │   │   ├── DramaSpace.tsx    # 剧情空间（沉浸式全屏）
│   │   │   ├── Settings.tsx      # 设置页面
│   │   │   ├── Memory.tsx        # 记忆系统
│   │   │   ├── Payment.tsx       # 支付页面
│   │   │   ├── Crowdfunding.tsx  # 众筹页面
│   │   │   └── Achievement.tsx   # 成就页面
│   │   ├── components/           # 共享组件
│   │   │   ├── Layout.tsx        # 布局（控制侧边栏显示）
│   │   │   ├── Navbar.tsx        # 侧边导航栏
│   │   │   ├── Footer.tsx        # 页脚
│   │   │   └── ui/               # 52 个 shadcn/ui 组件
│   │   ├── context/              # React Context
│   │   │   ├── AuthContext.tsx   # 认证状态（isAuthenticated, hasCompanion）
│   │   │   └── ThemeContext.tsx  # 主题管理（Light/Dark/Auto）
│   │   ├── i18n/                 # 国际化
│   │   │   ├── I18nContext.tsx   # i18n 上下文
│   │   │   └── translations.ts   # 4 语言翻译（zh/en/ja/ko）
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── useAuth.ts        # 认证 Hook
│   │   │   └── use-mobile.ts     # 移动端检测
│   │   ├── lib/                  # 工具库
│   │   │   ├── supabase.ts       # Supabase 客户端 + Edge Function 调用封装
│   │   │   ├── theme.ts          # 主题工具
│   │   │   └── utils.ts          # 通用工具函数（cn 等）
│   │   └── types/                # TypeScript 类型定义
│   ├── public/                   # 静态资源
│   ├── package.json
│   ├── vite.config.ts            # base: './', alias: @ -> ./src
│   ├── tailwind.config.js        # 自定义颜色/字体/动画
│   ├── tsconfig.app.json         # 前端 TS 配置（strict: true）
│   └── eslint.config.js          # ESLint 配置
│
├── backend/                      # 后端 Edge Functions
│   └── supabase/
│       ├── functions/            # 13 个 Edge Functions
│       │   ├── chat-stream/      # SSE 流式对话（核心）
│       │   ├── drama-chat/       # SSE 剧情对话
│       │   ├── drama-session/    # 剧情会话管理（5 种 action）
│       │   ├── energy/           # 能量账户查询与消费（乐观锁）
│       │   ├── payment-create/   # 创建 ZPay 支付订单
│       │   ├── payment-callback/ # ZPay 支付回调处理
│       │   ├── achievement-check/# 成就检测引擎
│       │   ├── consolidation/    # 记忆整合（STM → LTM → Anterior）
│       │   ├── milestone-adjust/ # 亲密度每日调整
│       │   ├── proactive/        # 主动消息生成
│       │   ├── proactive-scheduler/ # pg_cron 定时调度
│       │   ├── seed-data/        # 数据库种子数据初始化
│       │   ├── setup-proactive/  # 初始化 pg_cron 定时任务
│       │   └── _shared/          # 共享模块
│       │       ├── cors.ts       # CORS 配置
│       │       ├── deepseek.ts   # DeepSeek API 封装（streamChat / chatJSON）
│       │       ├── supabase.ts   # Supabase 客户端 + 数据库操作封装
│       │       └── zpay.ts       # ZPay 支付签名/验签
│       ├── migrations/           # 数据库迁移文件
│       └── types/                # 后端类型定义
│
├── PROJECT_DOCS/                 # 项目交接文档（5700+ 行）
│   ├── 00-project-overview.md    # 项目总览
│   ├── 01-database-schema.md     # 数据库 Schema 文档（2419 行）
│   ├── 02-edge-functions.md      # Edge Functions 文档（1619 行）
│   └── 03-frontend-architecture.md # 前端架构文档（1675 行）
│
├── design/                       # 功能设计文档（按模块拆分）
├── schema.sql                    # 完整数据库 DDL（3313 行）
├── schema_fixed.sql              # 修复后的 Schema
├── DEPLOY.md                     # 部署指南
└── plan*.md / system_architecture*.md  # 各类规划文档
```

---

## 4. 构建与开发命令

### 前端（`app/` 目录）

```bash
cd app

# 开发服务器（端口 3000）
npm run dev

# 生产构建（tsc -b && vite build，输出到 dist/）
npm run build

# 代码检查
npm run lint

# 预览生产构建
npm run preview
```

### 后端 Edge Functions

Edge Functions 通过 Supabase Management API 或 Supabase CLI 部署。项目不使用 `supabase functions deploy` 本地 CLI 工作流，而是直接通过 API 部署（DELETE + POST 方式，PATCH 不更新代码）：

```bash
# 示例：通过 Management API 部署
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/functions/{name}" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN"

curl -X POST "https://api.supabase.com/v1/projects/{ref}/functions" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -F "file=@function.zip" \
  -F "name={name}" \
  -F "verify_jwt=false"
```

**注意**: `_shared/` 模块需要复制到每个函数的 `../_shared/` 路径下，Supabase Edge Functions 不支持跨函数共享导入。

---

## 5. 代码风格与约定

### TypeScript

- 前端 `tsconfig.app.json`: `strict: true`，使用 ES2022 + DOM 类型
- 后端 `tsconfig.json`: `strict: false`，`module: Node16`，`moduleResolution: Node16`
- 前端路径别名: `@/` 映射到 `./src/*`
- 后端无路径别名，使用相对路径

### React

- 使用 Functional Components + Hooks
- 状态管理以 React Context 为主（AuthContext, ThemeContext, I18nContext），无 Redux/Zustand
- 路由使用 `react-router-dom` v7 的 `HashRouter`（非 BrowserRouter）
- 动画使用 Framer Motion

### Supabase 查询约定（极其重要）

**`.single()` → `.maybeSingle()` 迁移已全员执行。** PostgREST 的 `.single()` 在返回 0 行或多行时会抛出错误。所有生产代码已统一使用 `.maybeSingle()`，并通过数组索引 `data?.[0]` 安全取值。

```typescript
// ✅ 正确
const { data } = await supabase.from('companions').select('*').eq('user_id', userId).maybeSingle()
const companion = data?.[0]

// ❌ 错误 — 会导致运行时崩溃
const { data } = await supabase.from('companions').select('*').eq('user_id', userId).single()
```

### 命名与文件组织

- 页面组件: `PascalCase.tsx`，位于 `src/pages/`
- UI 组件: `kebab-case.tsx`，位于 `src/components/ui/`
- Hooks: `camelCase.ts`，以 `use` 开头
- Edge Functions: 目录名 `kebab-case/`，入口 `index.ts`
- 数据库表名: `snake_case`，复数形式（如 `stm_messages`, `energy_accounts`）

### 样式

- 使用 Tailwind CSS 原子类
- 暗色模式通过 `dark:` 前缀实现
- 自定义颜色/字体在 `tailwind.config.js` 中定义
- shadcn/ui 组件基于 Radix UI，使用 CSS Variables（`hsl(var(--primary))`）

---

## 6. 测试策略

**当前项目没有自动化测试套件**（无 Jest/Vitest/Playwright 配置）。测试依赖人工验证。

如果需要添加测试，建议优先覆盖：
- Edge Functions 中的乐观锁并发逻辑（`energy`, `payment-callback`）
- 支付回调的幂等性处理
- 前端关键页面渲染（Auth, Chat, Payment）

---

## 7. 安全注意事项

### RLS（Row Level Security）

所有用户数据表均启用 RLS。策略基于 `auth.uid()` 进行用户级隔离。Edge Functions 内部使用 `SUPABASE_SERVICE_ROLE_KEY` 绕过 RLS 执行跨用户操作（如 `consolidation`）。

### JWT 验证模式

由于 Supabase Edge Functions 的 JWT 自动验证会拦截 OPTIONS 预检请求，部分函数采用 **`verify_jwt = false` + 函数内部手动 JWT 验证** 的模式：

| 函数 | verify_jwt | 验证方式 |
|------|-----------|---------|
| chat-stream | false | 手动 `supabase.auth.getUser(jwt)` |
| drama-chat | false | 手动 JWT |
| drama-session | false | 手动 JWT |
| payment-callback | false | 无 JWT（ZPay 服务器调用）+ MD5 签名验证 |
| consolidation | false | service_key / pg_cron 调用 |
| proactive-scheduler | false | pg_cron 调用 |
| seed-data | false | 初始化时调用 |
| setup-proactive | false | 初始化时调用 |

### 乐观锁并发保护

能量消费使用版本号乐观锁：
1. 先读取 `balance` 和 `version`
2. `UPDATE` 时 `WHERE version = 读取值`
3. 检查 `affected_rows`，为 0 则返回并发冲突

### 支付安全

- ZPay 回调使用 MD5 签名验证
- `payment_orders` 表有 `idempotency_key` 确保幂等性
- 已支付订单直接返回 `success`，防止重复充值

---

## 8. 部署流程

### 前端

- **平台**: Vercel
- **构建命令**: `npm run build`
- **输出目录**: `dist`
- **环境变量**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- 注意: `src/lib/supabase.ts` 中 hardcode 了生产环境的 URL 和 Key 作为 fallback

### 后端

1. 在 Supabase SQL Editor 中执行 `schema.sql`（或 `schema_fixed.sql`）
2. 部署 13 个 Edge Functions（含 `_shared` 模块）
3. 配置 Edge Functions 环境变量（见下方）
4. 执行 `setup-proactive` 初始化 pg_cron 定时任务
5. 执行 `seed-data` 初始化字典表数据（里程碑定义、OCC 情绪标签、定价套餐等）
6. 在 ZPay 商户后台设置回调地址

### 环境变量清单

**Supabase Edge Functions**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `ZPAY_PID`
- `ZPAY_KEY`
- `SCHEDULER_SECRET`

**Vercel 前端**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 9. 关键架构决策

1. **CORS + 手动 JWT**: 部分 Edge Functions 禁用自动 JWT 验证以避免 OPTIONS 请求被拦截。
2. **`.maybeSingle()` 全员迁移**: 避免 `.single()` 在 0 行返回时抛出异常导致前端崩溃。
3. **乐观锁**: `energy_accounts` 和 `payment_orders` 使用 `version` 字段防止并发冲突。
4. **Drama Space 完全独立**: 拥有独立的表、Edge Functions、UI 组件，与 Chat 系统零耦合。
5. **三层记忆体系**: STM（短期记忆，保留 3 天）→ LTM（长期记忆，AI Consolidation 提取）→ Anterior（远事记忆/待办事项）。
6. **HashRouter**: 前端使用 HashRouter 而非 BrowserRouter，兼容静态托管部署。

---

## 10. 已知问题与注意事项

| 问题 | 状态 | 说明 |
|------|------|------|
| `.single()` 残留 | ⚠️ 待确认 | Chat.tsx 第 288 行曾被指出仍使用 `.single()`，需核实 |
| OAuth 登录 | ❌ 禁用 | Google/GitHub OAuth 未配置，当前仅支持邮箱+密码 |
| Live2D / Pet | 🚧 占位 | 为 MVP 预留 UI，功能未实现 |
| companion_presets 数据 | ⚠️ 待填充 | 伴侣广场模板数据可能需要手动初始化 |
| 测试覆盖 | ❌ 无 | 项目无单元测试/集成测试/E2E 测试 |

### 修改代码时的常见陷阱

- **不要在前端代码中使用 `.single()`** 查询 Supabase，始终使用 `.maybeSingle()` + `data?.[0]`
- **Edge Functions 中不要重复读取 `req.body`**，`req.json()` 只能调用一次
- **修改数据库 Schema 后**，需同步更新 `schema.sql` 和 `PROJECT_DOCS/01-database-schema.md`
- **`_shared/` 模块变更后**，需要重新部署所有依赖该模块的 Edge Functions（因为每个函数独立打包）

---

## 11. 外部依赖与 API

| 服务 | 用途 | 端点/说明 |
|------|------|----------|
| DeepSeek API | AI 对话/情绪检测/记忆整合 | `https://api.deepseek.com/v1/chat/completions`，模型 `deepseek-v4-flash` |
| ZPay | 支付网关 | `https://zpayz.cn/submit.php`，MD5 签名 |
| Supabase | 数据库 + Auth + Edge Functions | 项目 ID: `iqylckwmmygqutycqmlb`，区域 `us-east-1` |

---

## 12. 文档索引

如需深入了解某个模块，请参考以下文档：

| 文档 | 路径 | 内容 |
|------|------|------|
| 项目总览 | `PROJECT_DOCS/00-project-overview.md` | 架构图、模块说明、已知问题 |
| 数据库 Schema | `PROJECT_DOCS/01-database-schema.md` | 47+ 表、12 个函数、20+ 触发器、50+ RLS 策略 |
| Edge Functions | `PROJECT_DOCS/02-edge-functions.md` | 13 个函数的 API 定义、参数、错误码、安全机制 |
| 前端架构 | `PROJECT_DOCS/03-frontend-architecture.md` | 13 个页面的逐行拆解、Context 系统、组件清单 |
| 部署指南 | `DEPLOY.md` | 逐步部署命令、环境变量、验证清单 |
| 数据库 DDL | `schema.sql` / `schema_fixed.sql` | 完整建表脚本 |
| 功能设计 | `design/*.md` | 按模块拆分的设计文档（auth/chat/payment 等） |
