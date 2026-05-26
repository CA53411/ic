# Corolas | Platonic - 前端架构详细文档

> 文档版本: v1.0  
> 最后更新: 2026年1月  
> 技术栈: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion

---

## 目录

1. [项目概览](#1-项目概览)
2. [路由体系](#2-路由体系)
3. [页面组件详细说明](#3-页面组件详细说明)
4. [Context 系统](#4-context-系统)
5. [组件库](#5-组件库)
6. [样式体系](#6-样式体系)
7. [状态管理](#7-状态管理)
8. [构建和部署](#8-构建和部署)

---

## 1. 项目概览

### 1.1 产品定位

**Corolas | Platonic** 是一款面向全球用户的 AI 虚拟伴侣 Web 应用。用户可以在平台上创建、定制专属的 AI 伴侣，进行沉浸式对话、剧情互动、记忆管理等深度交互。产品以"温暖陪伴"为核心价值主张，主打情感陪伴场景。

### 1.2 目标用户

- 主要受众：18-35 岁年轻人群，独居或寻求情感陪伴
- 语言覆盖：中文、英文、日文、韩文（四语言完整支持）
- 使用场景：日常对话、剧情体验、情感记录、虚拟养成

### 1.3 核心功能模块

| 模块 | 功能描述 | 对应页面 |
|------|----------|----------|
| 伴侣系统 | 创建、定制、管理 AI 伴侣 | Customize, Plaza |
| 聊天系统 | 实时对话、流式消息、情绪感知 | Chat |
| 记忆系统 | 日历视图、里程碑、日记、长期记忆 | Memory |
| 剧情系统 | 剧本浏览、剧情空间、角色扮演 | Drama, DramaSpace |
| 支付系统 | 能量充值（按次计费）、交易记录 | Payment |
| 成就系统 | 用户行为成就追踪 | Achievement |
| 众筹系统 | 新功能众筹支持 | Crowdfunding |
| 用户系统 | 多语言、多时区、主题切换、账号管理 | Settings |

### 1.4 前端技术选型理由

| 技术 | 选型理由 |
|------|----------|
| **React 18** | 成熟生态、Hooks 模式、Concurrent Features 支持 |
| **TypeScript** | 强类型约束、接口文档即代码、IDE 智能提示 |
| **Vite** | 极速冷启动、HMR、esbuild 预构建、rollup 打包 |
| **Tailwind CSS** | 原子化样式、设计系统一致性、暗色模式原生支持 |
| **shadcn/ui** | 可复用 UI 组件基座、Radix UI 可访问性、可定制 |
| **Framer Motion** | 声明式动画、手势支持、AnimatePresence 路由动画 |
| **React Router v6** | 声明式路由、嵌套路由、loader/action 模式 |
| **Supabase JS Client** | 实时数据库、认证、Edge Functions、存储一站式 |
| **Lucide React** | 轻量级图标库、TypeScript 类型完整、树摇优化 |
| **date-fns** | 日期处理国际化、函数式 API、体积小 |
| **sonner** | Toast 通知、简洁 API、暗色/亮色自动适配 |

---

## 2. 路由体系

### 2.1 路由总览

路由定义位于 `src/App.tsx`，使用 `react-router-dom` v6 的 `BrowserRouter` + `Routes` + `Route` 模式，共 **14 个路由**。

### 2.2 路由定义表

| 路径 | 页面组件 | 路由类型 | 侧边栏 | 说明 |
|------|----------|----------|--------|------|
| `/` | Home | PublicRoute | 隐藏 | Landing Page 首页 |
| `/auth` | Auth | PublicRoute | 隐藏 | 登录/注册页 |
| `/dashboard` | Dashboard | ProtectedRoute | 显示 | 用户主控面板 |
| `/plaza` | Plaza | PublicRoute | 显示 | 伴侣广场（浏览模板） |
| `/customize` | Customize | ProtectedRoute | 显示 | 自定义创建伴侣 |
| `/chat` | Chat | CompanionRoute | 显示 | 聊天界面 |
| `/memory` | Memory | CompanionRoute | 显示 | 记忆日历系统 |
| `/drama` | Drama | PublicRoute | 显示 | 剧情广场 |
| `/drama-space/:sessionId` | DramaSpace | ProtectedRoute | 隐藏 | 剧情空间（沉浸式） |
| `/settings` | Settings | ProtectedRoute | 显示 | 用户设置 |
| `/payment` | Payment | ProtectedRoute | 显示 | 能量充值 |
| `/crowdfunding` | Crowdfunding | PublicRoute | 显示 | 众筹中心 |
| `/achievement` | Achievement | ProtectedRoute | 显示 | 成就系统 |

### 2.3 三种路由守卫类型

#### PublicRoute（公开路由）
- **特征**: 无需登录即可访问
- **适用页面**: Home, Auth, Plaza, Drama, Crowdfunding
- **行为**: 已登录用户可正常浏览，不强制跳转

#### ProtectedRoute（受保护路由）
- **特征**: 需要登录，但不需要有伴侣
- **守卫逻辑**: 检查 `isAuthenticated` 状态，未登录则重定向到 `/auth`
- **适用页面**: Dashboard, Settings, Payment, Customize, Achievement, DramaSpace

#### CompanionRoute（伴侣路由）
- **特征**: 需要登录 + 已创建伴侣
- **守卫逻辑**: 检查 `isAuthenticated && hasCompanion`，未创建伴侣则显示引导页
- **适用页面**: Chat, Memory
- **引导策略**: Chat 页面显示"创建伴侣"引导卡片；Dashboard 显示"去广场"按钮

### 2.4 路由守卫实现

路由守卫通过 `useAuth` Hook 获取认证状态，在页面组件内部实现条件渲染：

```typescript
// 守卫逻辑伪代码
const { isAuthenticated, hasCompanion } = useAuth();

// PublicRoute - 无守卫
if (publicRoute) return <Page />;

// ProtectedRoute
if (!isAuthenticated) return <Redirect to="/auth" />;

// CompanionRoute
if (!isAuthenticated) return <Redirect to="/auth" />;
if (!hasCompanion) return <NoCompanionPrompt />;
```

### 2.5 侧边栏路由控制

`Layout.tsx` 中通过 `sidebarRoutes` 数组控制侧边栏的显示：

```typescript
const sidebarRoutes = [
  '/dashboard', '/plaza', '/chat', '/memory', '/drama',
  '/settings', '/payment', '/crowdfunding', '/customize',
];
```

- 匹配逻辑: `location.pathname.startsWith(route)`
- 匹配成功: 渲染 `Navbar` 侧边栏，主内容区添加 `ml-[220px]` 左偏移
- `/drama-space/:sessionId` 为沉浸式全屏模式，不显示侧边栏

---

## 3. 页面组件详细说明

> 以下按文件路径逐一说明每个页面组件的完整实现细节。

---

### 3.1 Home 页面（Landing Page）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Home.tsx` |
| **路由路径** | `/` |
| **路由类型** | PublicRoute |
| **侧边栏** | 隐藏 |
| **功能描述** | 产品 Landing Page，展示产品特性、引导注册登录 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `activeTab` | `'hero' \| 'features' \| 'emotions' \| 'companion'` | `'hero'` | 特性展示标签页切换 |
| `activeMood` | `number` | `0` | 情绪演示当前索引 |
| `isVisible` | `boolean` | `false` | 控制滚动动画可见性 |
| `scrolled` | `boolean` | `false` | 导航栏是否已滚动收缩 |

#### Hooks 使用

| Hook | 来源 | 用途 |
|------|------|------|
| `useNavigate` | react-router-dom | 路由跳转 |
| `useI18n` | `@/i18n/I18nContext` | 国际化翻译 |
| `useEffect` | React | 滚动监听、入场动画时序控制 |

#### 关键函数

| 函数名 | 参数 | 返回值 | 功能描述 |
|--------|------|--------|----------|
| `navigateToAuth` | `mode: 'login' \| 'register'` | `void` | 带状态跳转到认证页 |

#### UI 结构

```
Home Page
├── Fullscreen Hero Section (100vh)
│   ├── Animated Background Orbs (CSS floating animation)
│   ├── Navigation Bar (fixed top, scroll-responsive)
│   ├── Hero Text Block
│   │   ├── Animated Title (gradient text)
│   │   ├── Subtitle with typewriter effect
│   │   └── CTA Button Group (Create / Login)
│   └── Scroll Indicator (bottom)
├── Features Showcase Section
│   ├── Tab Navigation (4 tabs)
│   └── Tab Content Panels
├── Emotion Demo Section
│   ├── Emotion Card Stack (interactive)
│   └── Emotion Navigation Dots
├── Companion Preview Section
│   └── Feature Grid Cards
└── Footer CTA Section
    └── Final conversion buttons
```

#### 数据流

- 纯静态展示页面，无后端数据获取
- 所有文案通过 `useI18n().t()` 国际化
- 动画使用 Framer Motion `motion.div` + `initial/animate/transition`

---

### 3.2 Auth 页面（登录/注册）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Auth.tsx` |
| **路由路径** | `/auth` |
| **路由类型** | PublicRoute |
| **侧边栏** | 隐藏 |
| **功能描述** | 用户登录与注册，支持邮箱+密码方式 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `isLogin` | `boolean` | `true` | 切换登录/注册模式 |
| `email` | `string` | `''` | 邮箱输入 |
| `password` | `string` | `''` | 密码输入 |
| `username` | `string` | `''` | 用户名输入（注册模式） |
| `loading` | `boolean` | `false` | 提交中状态 |
| `error` | `string` | `''` | 错误提示信息 |

#### Props 定义

通过 `useLocation().state` 接收跳转来源：

| 属性 | 类型 | 说明 |
|------|------|------|
| `mode` | `'login' \| 'register'` | 初始模式 |
| `from` | `string` | 登录成功后跳转的目标路径 |

#### Hooks 使用

| Hook | 用途 |
|------|------|
| `useAuth` | 获取登录状态（已登录则自动跳转） |
| `useNavigate` | 路由跳转 |
| `useLocation` | 读取 state 参数 |

#### 关键函数

| 函数名 | 参数 | 返回值 | 功能描述 |
|--------|------|--------|----------|
| `handleSubmit` | `e: FormEvent` | `Promise<void>` | 表单提交，根据 `isLogin` 调用登录或注册 API |
| `handleLogin` | 无 | `Promise<void>` | 调用 `supabase.auth.signInWithPassword()` |
| `handleRegister` | 无 | `Promise<void>` | 调用 `supabase.auth.signUp()`，成功后自动创建 profile |

#### 登录流程

```
用户提交表单
  → supabase.auth.signInWithPassword({ email, password })
  → AuthContext 监听 SIGNED_IN 事件
  → 获取 companion 状态
  → 跳转至 /dashboard（或 from 指定页面）
```

#### 注册流程

```
用户提交表单
  → supabase.auth.signUp({ email, password })
  → 插入 profiles 表（username, language, timezone）
  → 跳转至 /plaza 引导创建伴侣
```

---

### 3.3 Dashboard 页面（主控面板）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Dashboard.tsx` |
| **路由路径** | `/dashboard` |
| **路由类型** | ProtectedRoute |
| **侧边栏** | 显示 |
| **功能描述** | 用户个人中心，展示伴侣信息、能量余额、亲密度、最近交易 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `companion` | `CompanionDetail \| null` | `null` | 伴侣详细信息 |
| `energy` | `number` | `0` | 能量余额 |
| `mood` | `string` | `''` | 当前情绪标签 |
| `moodDesc` | `string` | `''` | 情绪描述 |
| `recentMessages` | `MessagePreview[]` | `[]` | 最近聊天预览 |
| `milestones` | `Milestone[]` | `[]` | 亲密度里程碑列表 |
| `currentStage` | `number` | `1` | 当前亲密度阶段 |
| `transactions` | `Transaction[]` | `[]` | 最近交易记录 |
| `loading` | `boolean` | `true` | 全局加载状态 |

#### 内部组件

| 组件名 | 说明 |
|--------|------|
| `DashboardSkeleton` | 加载骨架屏（5 个 pulse 动画卡片） |

#### Hooks 使用

| Hook | 用途 |
|------|------|
| `useAuth` | 获取用户 ID、伴侣状态 |
| `useNavigate` | 页面跳转 |
| `useI18n` | 国际化 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadDashboard()` | 并行加载伴侣详情、能量、里程碑、交易、最近消息 |
| `loadCompanionDetail(userId)` | 查询 companions + profiles 表 |
| `loadEnergy(userId)` | 查询 energy_accounts 表余额 |
| `loadMilestones()` | 查询 intimacy_milestones 表 |
| `loadRecentTransactions()` | 查询 energy_transactions 表最近 5 条 |
| `loadRecentMessages()` | 查询 chat_messages 表最近 3 条 |
| `getCurrentStage()` | 根据 milestone 数组计算当前阶段 |
| `getEmotionTag()` | 从聊天消息中提取 AI 情绪标签 |

#### 数据流

```
页面挂载
  → loadDashboard() 并行发起 5 个查询
    ├── companions + profiles → companion state
    ├── energy_accounts → energy state
    ├── intimacy_milestones → milestones / currentStage
    ├── energy_transactions → transactions
    └── chat_messages → recentMessages / mood
  → 所有数据就绪 → loading = false
```

#### UI 结构

```
Dashboard
├── Top Bar (标题 + 当前阶段徽章)
├── Content Grid (2-column)
│   ├── Left Column
│   │   ├── Companion Profile Card
│   │   │   ├── 头像 + 昵称 + 情绪状态
│   │   │   ├── 背景故事
│   │   │   └── 操作按钮 (Chat / 设置)
│   │   ├── Recent Messages Card (最近 3 条)
│   │   └── Energy Balance Card (余额 + 进度条)
│   └── Right Column
│       ├── Milestones Timeline (亲密度旅程)
│       └── Recent Transactions (最近消费)
└── 无伴侣状态 → 引导去 Plaza
```

---

### 3.4 Plaza 页面（伴侣广场）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Plaza.tsx` |
| **路由路径** | `/plaza` |
| **路由类型** | PublicRoute |
| **侧边栏** | 显示 |
| **功能描述** | 浏览伴侣模板卡片，选择模板后跳转 Customize 创建伴侣 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `templates` | `CompanionTemplate[]` | `[]` | 伴侣模板列表 |
| `loading` | `boolean` | `true` | 加载状态 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadTemplates()` | 从 `companion_templates` 表查询所有公开模板 |
| `handleCreate()` | 未登录跳转 `/auth`，已登录跳转 `/customize` |
| `handleUseTemplate(template)` | 将模板数据存入 localStorage，跳转 `/customize?template=...` |

#### UI 结构

```
Plaza
├── Top Bar (标题 + 创建按钮)
├── Template Grid (responsive: 1-4 columns)
│   └── TemplateCard (×N)
│       ├── Cover Image (with hover zoom)
│       ├── Name + Description
│       ├── Tags (rounded badges)
│       └── "Use Template" Button
└── Empty State (no templates)
```

---

### 3.5 Customize 页面（自定义伴侣）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Customize.tsx` |
| **路由路径** | `/customize` |
| **路由类型** | ProtectedRoute |
| **侧边栏** | 显示 |
| **功能描述** | 两步向导式创建个性化伴侣：性格定制 → 故事设定 → 完成 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `step` | `1 \| 2 \| 3` | `1` | 当前步骤 |
| `nickname` | `string` | `''` | 昵称 |
| `bio` | `string` | `''` | 个性签名 |
| `background` | `string` | `''` | 背景故事 |
| `pet` | `string` | `''` | 宠物名称 |
| `selectedImage` | `number` | `0` | 选中头像索引 |
| `personalityExtra` | `number` | `50` | 外向性 (0-100) |
| `personalityAgree` | `number` | `50` | 宜人性 (0-100) |
| `personalityCon` | `number` | `50` | 尽责性 (0-100) |
| `personalityNeuro` | `number` | `50` | 神经质 (0-100) |
| `personalityOpen` | `number` | `50` | 开放性 (0-100) |
| `creating` | `boolean` | `false` | 创建中状态 |
| `showPrompt` | `boolean` | `false` | 显示性格提示弹窗 |

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `PersonalitySlider` | `label, leftLabel, rightLabel, value, onChange` | 性格维度滑块 |
| `StepIndicator` | `currentStep` | 步骤指示器（1-2-3 圆点连线） |
| `PromptModal` | `onClose` | 性格选择灵感提示弹窗 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `handleNext()` | 验证当前步骤，推进到下一步 |
| `handleCreate()` | 组装伴侣数据，调用 Supabase 插入 companions 表，更新 profile，跳转 dashboard |
| `getPersonalityType()` | 根据五大维度生成性格类型标签 |

#### 创建流程

```
Step 1: 性格定制
  ├── 五大性格维度滑块 (Big Five Model)
  ├── 实时性格标签预览
  └── Next →

Step 2: 故事设定
  ├── 昵称输入
  ├── 个性签名
  ├── 背景故事 (多行文本)
  ├── 宠物名称
  └── Next →

Step 3: 完成
  ├── 伴侣卡片预览
  └── Create →
       → POST /companions
       → UPDATE profiles.current_companion_id
       → redirect /dashboard
```

---

### 3.6 Chat 页面（聊天界面）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Chat.tsx` |
| **路由路径** | `/chat` |
| **路由类型** | CompanionRoute |
| **侧边栏** | 显示 |
| **功能描述** | 核心聊天功能，支持实时对话、流式响应、侧边信息面板 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `messages` | `UIMessage[]` | `[]` | 消息列表 |
| `inputValue` | `string` | `''` | 输入框内容 |
| `isStreaming` | `boolean` | `false` | AI 响应流中 |
| `companion` | `CompanionChat \| null` | `null` | 伴侣信息（昵称、头像、状态） |
| `companionState` | `CompanionState \| null` | `null` | 伴侣实时状态 |
| `mood` | `string` | `''` | 当前情绪标签 |
| `emotionTag` | `string` | `''` | 最后一条情绪标记 |
| `showInfo` | `boolean` | `true` | 侧边信息面板显示 |
| `dailySummary` | `string` | `''` | 每日 AI 总结 |
| `isLoading` | `boolean` | `true` | 初始加载状态 |
| `showEmoji` | `boolean` | `false` | 表情选择器 |

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `ChatMessage` | `message: UIMessage, isStreaming: boolean` | 单条消息气泡 |
| `EmptyChat` | `companionName, onSuggestion` | 空聊天引导 |
| `ChatSkeleton` | 无 | 聊天加载骨架屏 |
| `TypingIndicator` | 无 | AI 输入中动画 |

#### Hooks 使用

| Hook | 用途 |
|------|------|
| `useAuth` | 获取用户认证状态 |
| `useNavigate` | 路由跳转 |
| `useI18n` | 国际化 |

#### 关键函数

| 函数名 | 参数 | 返回值 | 功能描述 |
|--------|------|--------|----------|
| `loadChat()` | 无 | `Promise<void>` | 加载伴侣信息 + 历史消息 + 状态 |
| `handleSend()` | 无 | `Promise<void>` | 发送消息，调用 Edge Function 获取流式响应 |
| `scrollToBottom()` | 无 | `void` | 滚动到消息底部 |
| `handleQuickReply()` | `text: string` | `void` | 快捷回复发送 |
| `refreshCompanionState()` | 无 | `Promise<void>` | 刷新伴侣实时状态 |

#### 发送消息流程

```
用户输入 + 点击发送
  → 乐观更新：消息列表追加用户消息
  → 调用 Edge Function: fetchEdgeFunction('chat-stream', { message, session_id })
  → 返回 ReadableStream
  → 逐字读取 Stream chunks
  → 实时更新 AI 回复消息（id = 'streaming'）
  → Stream 结束 → 刷新完整消息列表
  → 获取 AI 情绪标签 → 更新情绪状态
  → 刷新伴侣实时状态
```

#### UI 结构

```
Chat Page
├── Top Bar
│   ├── Back Button
│   ├── Companion Info (avatar + nickname + status dot)
│   └── Info Toggle Button
├── Messages Container (flex-1, overflow-y-auto)
│   ├── EmptyChat (when no messages)
│   ├── MessageBubble[] (user messages, right-aligned)
│   ├── MessageBubble[] (AI messages, left-aligned, streaming support)
│   └── TypingIndicator (when isStreaming)
├── Input Area
│   ├── Emoji Toggle
│   ├── Text Input (auto-resize textarea)
│   └── Send Button
└── Info Panel (collapsible, right side)
    ├── Companion Profile Card
    ├── Current Mood Display
    ├── Relationship Stats
    └── Daily Summary
```

---

### 3.7 Memory 页面（记忆系统）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Memory.tsx` |
| **路由路径** | `/memory` |
| **路由类型** | CompanionRoute |
| **侧边栏** | 显示 |
| **功能描述** | 日历视图展示伴侣记忆，包括里程碑、待办、长期记忆、AI 日记 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `currentMonth` | `Date` | `new Date(2026, 0, 1)` | 日历当前月份 |
| `selectedDate` | `Date \| null` | `null` | 选中的日期 |
| `memories` | `Record<string, MemoryItem[]>` | `{}` | 按日期分组的记忆数据 |
| `loading` | `boolean` | `true` | 加载状态 |

#### 类型定义

```typescript
interface MemoryItem {
  id: string;
  type: 'milestone' | 'anterior' | 'ltm' | 'diary';
  title: string;
  description: string;
  time?: string;
  keyMoments?: string[];       // 日记特有
  reflection?: string;          // 日记特有
  tomorrowHopes?: string;       // 日记特有
  emotionTag?: string;          // 日记特有
}

interface DiaryRow {
  id: string;
  companion_id: string;
  diary_date: string;
  title: string | null;
  content: string;
  emotion_tag: string | null;
  sentiment_score: number | null;
  key_moments: string[] | null;
  reflection: string | null;
  tomorrow_hopes: string | null;
}
```

#### 内部组件

| 组件名 | 说明 |
|--------|------|
| `LoginPrompt` | 未登录用户提示 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadMemories()` | 并行查询 companion_diaries + ltm_memories + anterior_memories，按日期分组 |
| `goToPrevMonth()` | 月份减一 |
| `goToNextMonth()` | 月份加一 |
| `goToToday()` | 回到今天 |
| `handleDateClick(date)` | 选中日期，打开详情抽屉 |
| `getDotTypes(memories)` | 获取当天记忆类型集合 |

#### 数据源

| 数据表 | 记忆类型 | 说明 |
|--------|----------|------|
| `companion_diaries` | `diary` | AI 每日对话总结日记 |
| `ltm_memories` | `ltm` | 长期记忆（事实/偏好/事件/情感） |
| `anterior_memories` | `anterior` | 待办提醒 |

#### UI 结构

```
Memory Page
├── Top Bar (标题 + 月份导航)
│   ├── Prev/Next Month Button
│   ├── Month Display (yyyy年M月)
│   └── "回到今天" Button
├── Login Prompt (未认证用户)
├── Calendar Grid (7 columns, Monday start)
│   ├── Day Headers (一 二 三 四 五 六 日)
│   └── Day Cell[]
│       ├── Day Number
│       ├── Memory Dot Indicators (彩色小圆点)
│       └── Milestone Label
└── Detail Drawer (AnimatePresence)
    ├── Date Header
    ├── "在对话中回顾" Button
    └── Memory Cards[]
        ├── Milestone Card (金色边框)
        ├── Anterior Card (紫色)
        ├── LTM Card (粉色)
        └── AI Diary Card (紫色边框 + 子模块)
```

#### 动画变体

```typescript
const gridVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.02 } },
  exit: { opacity: 0, scale: 0.98 },
};

const cellVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

const sidebarVariants = {
  hidden: { x: 400, opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: 400, opacity: 0 },
};
```

---

### 3.8 Drama 页面（剧情广场）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Drama.tsx` |
| **路由路径** | `/drama` |
| **路由类型** | PublicRoute |
| **侧边栏** | 显示 |
| **功能描述** | 浏览剧本卡片、查看我的剧情记录、进入剧情空间 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `activeView` | `'plaza' \| 'my'` | `'plaza'` | 视图切换（广场/我的） |
| `activeFilter` | `string` | `'全部'` | 筛选标签 |
| `dramas` | `DramaItem[]` | `[]` | 剧本列表 |
| `sessions` | `MyStorySession[]` | `[]` | 我的剧情会话 |
| `loading` | `boolean` | `true` | 剧本加载状态 |
| `sessionsLoading` | `boolean` | `false` | 会话加载状态 |

#### 类型定义

```typescript
interface DramaItem {
  id: string;
  name: string;
  description: string;
  cover_image_path: string | null;
  scene_setting: string | null;
  rating: number;
  ratingCount: string;
  genre: string;
  tags: string[];
  isUnlocked: boolean;
  unlockCondition: string;
  difficulty: '简单' | '中等' | '困难';
}

interface MyStorySession {
  id: string;
  drama_id: string;
  drama_name: string;
  drama_cover: string;
  message_count: number;
  status: 'active' | 'not_started';
  started_at: string;
}
```

#### 筛选标签

```typescript
const filterTabs = ['全部', '热门', '浪漫', '悬疑', '日常', '奇幻'];
```

#### 内部组件

| 组件名 | 说明 |
|--------|------|
| `DramaCoverImage` | 剧本封面图（带 fallback 处理） |
| `AuthBanner` | 未登录用户提示条 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadDramas()` | 从 `drama_definitions` 表查询所有激活剧本 |
| `loadSessions()` | 查询 drama_sessions + drama_definitions + drama_messages 统计 |
| `handleEnterDrama(dramaId, sessionId?)` | 进入剧情：已有会话直接跳转，无会话创建新会话 |
| `handleRestart(dramaId)` | 重新开始剧情（确认弹窗 → 删除旧会话 → 新建） |

#### 进入剧情流程

```
点击"进入剧情"
  → 检查登录状态（未登录提示）
  → 检查现有 session
    ├── 有 → 直接跳转 /drama-space/:sessionId
    └── 无 → 调用 Edge Function drama-session (action: start)
         → 成功后跳转 /drama-space/:sessionId
```

---

### 3.9 DramaSpace 页面（剧情空间）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/DramaSpace.tsx` |
| **路由路径** | `/drama-space/:sessionId` |
| **路由类型** | ProtectedRoute |
| **侧边栏** | 隐藏（全屏沉浸式） |
| **功能描述** | 独立剧情空间，用户与伴侣在剧本场景中角色扮演对话 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `loading` | `boolean` | `true` | 初始加载 |
| `error` | `string` | `''` | 错误信息 |
| `drama` | `DramaInfo \| null` | `null` | 剧本信息 |
| `companion` | `CompanionInfo \| null` | `null` | 伴侣信息 |
| `session` | `SessionInfo \| null` | `null` | 会话信息 |
| `messages` | `DramaMessage[]` | `[]` | 消息列表 |
| `inputValue` | `string` | `''` | 输入框内容 |
| `isStreaming` | `boolean` | `false` | 流式响应中 |
| `showSceneIntro` | `boolean` | `true` | 场景介绍遮罩显示 |
| `energy` | `number` | `0` | 当前能量 |
| `isPaused` | `boolean` | `false` | 剧情暂停 |
| `typingDots` | `boolean` | `false` | 输入中动画 |

#### 类型定义

```typescript
interface DramaMessage {
  id: string;
  session_id: string;
  speaker: 'user' | 'companion' | 'narrator';
  content: string;
  created_at: string;
}

interface DramaInfo {
  id: string;
  name: string;
  description: string;
  scene_setting: string;
  cover_image_path: string | null;
  drama_prompt: string;
}

interface CompanionInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  gender: string;
}

interface SessionInfo {
  id: string;
  status: string;
  started_at: string;
}
```

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `DramaMessageBubble` | `message, companion` | 剧情消息气泡（三种角色样式） |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadSession()` | 加载剧本、伴侣、会话、消息、能量 |
| `handleSend()` | 发送消息，流式读取 AI 响应 |
| `handleComplete()` | 结束剧情，返回剧情广场 |
| `handleRestart()` | 重新开始当前剧情 |
| `handleKeyDown(e)` | Enter 发送 / Shift+Enter 换行 |
| `formatContent(content)` | 格式化消息内容（加粗、斜体） |

#### 发送消息流程（流式）

```
用户发送消息
  → 乐观添加用户消息到 messages
  → POST /drama-chat { session_id, message }
  → 获取 ReadableStream
  → while 读取 chunks:
    ├── data: "text" → 追加到 replyText
    ├── 实时更新 messages (id='streaming')
    └── data: "[DONE]" → 结束
  → 刷新完整消息列表
  → 扣除能量 (30/条)
```

#### UI 结构

```
DramaSpace (全屏, h-screen, 暗色主题)
├── Decorative Background Orbs (CSS blur)
├── Scene Introduction Overlay (5s 自动消失)
│   ├── Particles Animation
│   ├── Drama Name
│   ├── Scene Setting
│   └── Description
├── Top Bar (fixed, backdrop-blur)
│   ├── Back Button
│   ├── Drama Name + Scene Setting
│   ├── Message Count + Energy + Pause/Restart/End Buttons
├── Messages Area (scrollable)
│   ├── Narrator Messages (居中, 紫色背景)
│   ├── User Messages (右侧, 粉紫渐变)
│   └── Companion Messages (左侧, 头像 + 昵称)
├── Pause Overlay (when isPaused)
└── Input Bar (fixed bottom)
    ├── Textarea (auto-resize)
    └── Send Button (gradient, Wand2 icon)
```

---

### 3.10 Settings 页面（设置）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Settings.tsx` |
| **路由路径** | `/settings` |
| **路由类型** | ProtectedRoute |
| **侧边栏** | 显示 |
| **功能描述** | 用户设置中心：账号信息、语言、时区、主题、通知、帮助、隐私、伴侣管理 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `language` | `Language` | `'en'` | 当前语言 |
| `timezone` | `string` | `'Asia/Shanghai'` | 当前时区 |
| `savedTimezone` | `boolean` | `false` | 时区保存成功提示 |
| `selectedTheme` | `string` | `'Pink'` | 选中的主题外观 |
| `accentColor` | `string` | `'Default Pink'` | 强调色 |
| `savedLanguage` | `boolean` | `false` | 语言保存成功提示 |
| `email` | `string` | `''` | 用户邮箱 |
| `username` | `string` | `''` | 用户名 |
| `registeredAt` | `string` | `''` | 注册日期 |
| `companionName` | `string` | `''` | 伴侣昵称 |
| `companionId` | `string \| null` | `null` | 伴侣 ID |
| `avatar` | `string` | `'/default-avatar.jpg'` | 头像 URL |
| `loading` | `boolean` | `true` | 加载状态 |
| `theme` | `Theme` | `loadSavedTheme()` | 当前主题模式 |
| `notifEnergy` | `boolean` | `true` | 能量不足通知开关 |
| `notifDaily` | `boolean` | `true` | 每日摘要通知开关 |
| `showReleaseModal` | `boolean` | `false` | 释放伴侣确认弹窗 |
| `releasing` | `boolean` | `false` | 释放中状态 |
| `helpContent` | `string` | `DEFAULT_HELP_CONTENT` | 帮助内容 |
| `privacyContent` | `string` | `DEFAULT_PRIVACY_POLICY` | 隐私政策内容 |
| `termsContent` | `string` | `DEFAULT_TERMS_OF_SERVICE` | 服务条款内容 |

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `ToggleSwitch` | `enabled, onChange` | 开关切换组件 |
| `NotificationToggle` | `label, description, enabled, onChange` | 通知设置行 |
| `SectionCard` | `children, delay?` | 设置卡片容器（带动画） |
| `CollapsibleSection` | `title, icon, children, defaultOpen?` | 可折叠区块 |
| `TextContent` | `content` | 预格式化文本展示 |

#### 常量定义

```typescript
const LANGUAGES: LanguageOption[] = [
  { code: 'zh', label: '中文', tag: '简体' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語', tag: 'Japanese' },
  { code: 'ko', label: '한국어', tag: 'Korean' },
];

const TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)', region: '中国' },
  // ... 共 19 个时区选项
];

const THEME_OPTIONS = [
  { value: 'light' as Theme, label: 'Light', icon: <Sun /> },
  { value: 'dark' as Theme, label: 'Dark', icon: <Moon /> },
  { value: 'auto' as Theme, label: 'Auto', icon: <Monitor /> },
];

const ACCENT_COLORS = [
  { name: 'Default Pink', class: 'bg-pink-400', hex: '#FF69B4' },
  { name: 'Rose Gold', class: 'bg-rose-gold', hex: '#E8A0BF' },
  { name: 'Lavender', class: 'bg-purple-memory', hex: '#C8A8E9' },
  { name: 'Coral', class: 'bg-[#FF8A80]', hex: '#FF8A80' },
  { name: 'Mint', class: 'bg-[#80CBC4]', hex: '#80CBC4' },
];
```

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadUserData()` | 加载用户信息 + 伴侣信息 |
| `handleLanguageChange(lang)` | 切换语言，更新 Context 和 localStorage |
| `handleLanguageSave()` | 保存语言偏好到 profiles 表 |
| `handleTimezoneChange(tz)` | 切换时区 |
| `handleTimezoneSave()` | 保存时区到 profiles 表 |
| `handleThemeChange(theme)` | 切换主题（light/dark/auto），应用并持久化 |
| `handleReleaseCompanion()` | 删除伴侣数据，跳转 customize |
| `handleLogout()` | 退出登录，刷新页面 |

#### UI 结构

```
Settings Page
├── Top Bar (标题)
├── Section Card: Account Information
│   ├── Avatar + Username + Email
│   └── Account Fields (用户名/邮箱/注册时间/伴侣)
├── Section Card: Language Settings
│   ├── 4 语言单选列表
│   └── Save Button
├── Section Card: Timezone Settings
│   ├── 19 时区单选列表
│   └── Save Button
├── Section Card: Theme Settings
│   ├── 3-state Theme Selection (Light/Dark/Auto)
│   ├── Theme Swatches (Pink/Rose/Purple)
│   └── Accent Color Selection
├── Section Card: Notifications
│   ├── Low Energy Alert Toggle
│   └── Daily Summary Toggle
├── Section Card: Help Center
│   ├── Collapsible User Guide
│   └── Contact Email
├── Section Card: Privacy Policy
├── Section Card: Terms of Service
├── Section Card: Companion Management (Danger Zone)
│   ├── Companion Info Card
│   └── Release Companion Button
├── Logout Button
└── Release Companion Confirmation Modal
```

---

### 3.11 Payment 页面（支付/能量充值）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Payment.tsx` |
| **路由路径** | `/payment` |
| **路由类型** | ProtectedRoute |
| **侧边栏** | 显示 |
| **功能描述** | 能量余额展示、充值套餐选择、支付宝支付、交易记录 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `selectedPlan` | `string \| null` | `null` | 选中的套餐 ID |
| `showQrModal` | `boolean` | `false` | 支付二维码弹窗 |
| `paymentStatus` | `'waiting' \| 'success'` | `'waiting'` | 支付状态 |
| `qrKey` | `number` | `0` | 二维码刷新 key |
| `qrCodeUrl` | `string \| null` | `null` | 二维码图片 URL |
| `energy` | `number` | `0` | 当前能量余额 |
| `transactions` | `Transaction[]` | `[]` | 交易记录 |
| `plans` | `RechargePlan[]` | `[]` | 充值套餐列表 |
| `paying` | `boolean` | `false` | 支付中状态 |

#### 类型定义

```typescript
interface RechargePlan {
  id: string;
  name: string;
  description: string | null;
  energy_amount: number;
  price_cents: number;
  currency: string;
  sort_order: number;
  is_active: boolean | null;
}

interface Transaction {
  id: string;
  date: string;
  plan: string;
  amount: string;
  status: 'completed' | 'pending';
}
```

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `AnimatedNumber` | `target, duration?` | 数字滚动动画组件 |
| `CountdownTimer` | `seconds, onExpire?` | 支付倒计时 (5:00→0:00) |
| `LoginPrompt` | 无 | 未登录提示 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadEnergyData()` | 加载套餐列表 + 能量余额 + 交易记录 |
| `handlePlanSelect(planId)` | 选择套餐 |
| `handlePayClick()` | 创建支付订单，跳转支付宝 |
| `handlePayment(planId)` | 调用 payment-create Edge Function |
| `handleCloseModal()` | 关闭支付弹窗 |
| `handleRefreshQr()` | 刷新二维码 |

#### 支付流程

```
选择套餐 → 点击支付
  → fetchEdgeFunction('payment-create', { plan_id })
  → 获取支付链接 (pay_url)
  → 跳转支付宝完成支付
  → 支付成功回调 → 刷新能量余额
```

---

### 3.12 Crowdfunding 页面（众筹中心）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Crowdfunding.tsx` |
| **路由路径** | `/crowdfunding` |
| **路由类型** | PublicRoute |
| **侧边栏** | 显示 |
| **功能描述** | 展示功能众筹项目，支持项目预览和跳转支持 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `projects` | `CrowdfundingProject[]` | `[]` | 众筹项目列表 |
| `loading` | `boolean` | `true` | 加载状态 |
| `error` | `string \| null` | `null` | 错误信息 |

#### 类型定义

```typescript
interface CrowdfundingProject {
  id: string;
  feature_name: string;
  description: string;
  cover_image_url: string | null;
  target_amount: number;
  current_amount: number;
  status: string;
  sort_order: number;
  created_at: string;
}
```

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `ProjectCard` | `project, index` | 项目卡片 |
| `ProjectSkeleton` | `index` | 骨架屏 |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadProjects()` | 从 crowdfunding_projects 表加载活跃项目 |
| `getDefaultProjects()` | DB 失败时的默认项目数据 |

#### 项目卡片

```
ProjectCard
├── Cover Image (16:10 ratio, gradient overlay)
├── Content
│   ├── Feature Name
│   ├── Description
│   ├── Progress Bar (current/target)
│   ├── Stats (Target amount)
│   └── Support Button
```

---

### 3.13 Achievement 页面（成就系统）

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/pages/Achievement.tsx` |
| **路由路径** | `/achievement` |
| **路由类型** | ProtectedRoute |
| **侧边栏** | 显示 |
| **功能描述** | 用户行为成就追踪与展示 |

#### State 定义

| State 名称 | 类型 | 初始值 | 用途 |
|------------|------|--------|------|
| `achievements` | `AchievementItem[]` | `[]` | 成就列表 |
| `loading` | `boolean` | `true` | 加载状态 |
| `filter` | `'all' \| 'unlocked' \| 'locked'` | `'all'` | 筛选条件 |

#### 类型定义

```typescript
interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  total: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}
```

#### 图标映射

```typescript
const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy, star: Star, zap: Zap, target: Target,
  heart: Heart, message: MessageCircle, calendar: Calendar, book: BookOpen,
};
```

#### 成就列表（内置）

| ID | 标题 | 触发条件 |
|----|------|----------|
| first-chat | 初次邂逅 | 发送 1 条消息 |
| chat-10 | 畅聊达人 | 发送 10 条消息 |
| chat-100 | 千言万语 | 发送 100 条消息 |
| first-diary | 记忆收藏家 | 拥有 1 篇日记 |
| first-drama | 剧情探索者 | 首次参与剧情 |
| login-7 | 七日之约 | 连续 7 天登录 |

#### 内部组件

| 组件名 | Props | 说明 |
|--------|-------|------|
| `AchievementCard` | `achievement, index` | 成就卡片（进度条 + 锁定状态） |

#### 关键函数

| 函数名 | 功能描述 |
|--------|----------|
| `loadAchievements()` | 查询 chat_messages / companion_diaries / drama_progress 统计，计算成就解锁状态 |

---

## 4. Context 系统

### 4.1 AuthContext — 全局认证状态

**文件路径**: `src/context/AuthContext.tsx`

#### 状态定义

| 状态 | 类型 | 说明 |
|------|------|------|
| `user` | `User \| null` | Supabase 用户对象 |
| `companion` | `Companion \| null` | 伴侣完整数据 |
| `isLoading` | `boolean` | 初始认证检查中 |

#### 导出值 (AuthContextType)

| 属性 | 类型 | 说明 |
|------|------|------|
| `isAuthenticated` | `boolean` | `user !== null` |
| `user` | `User \| null` | 当前用户 |
| `companion` | `Companion \| null` | 伴侣对象 |
| `hasCompanion` | `boolean` | `companion !== null` |
| `isLoading` | `boolean` | 初始加载状态 |
| `logout` | `() => Promise<void>` | 退出登录 |
| `refreshCompanion` | `() => Promise<void>` | 刷新伴侣数据 |

#### 生命周期

```
AuthProvider Mount
  → checkSession()
    → supabase.auth.getSession()
    → 有 session → setUser + fetchCompanion()
    → 无 session → setUser(null)
  → onAuthStateChange 订阅
    → SIGNED_IN → fetchCompanion()
    → SIGNED_OUT → setCompanion(null)
    → TOKEN_REFRESHED → fetchCompanion()
```

#### Companion 数据获取

```typescript
const fetchCompanion = async (userId: string) => {
  const { data } = await supabase
    .from('companions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  // 映射到 Companion 类型
};
```

#### 使用方式

```typescript
const { isAuthenticated, user, hasCompanion, logout } = useAuth();
```

---

### 4.2 ThemeContext — 主题管理

**文件路径**: `src/context/ThemeContext.tsx`

#### 支持的三种主题模式

| 模式 | 值 | 说明 |
|------|-----|------|
| Light | `'light'` | 强制亮色 |
| Dark | `'dark'` | 强制暗色 |
| Auto | `'auto'` | 跟随系统偏好 |

#### 导出值

| 属性 | 类型 | 说明 |
|------|------|------|
| `theme` | `Theme` | 当前主题设置 |
| `effectiveTheme` | `'light' \| 'dark'` | 解析后的实际主题 |
| `setTheme` | `(t: Theme) => void` | 设置主题 |
| `cycleTheme` | `() => void` | 循环切换: light→dark→auto→light |

#### 持久化

- 存储键: `localStorage.theme`
- 同步机制: `StorageEvent` 跨标签页同步
- 系统监听: `matchMedia('prefers-color-scheme: dark')` 变化

#### 应用机制

```typescript
// applyTheme 逻辑
theme === 'dark'   → document.documentElement.classList.add('dark')
theme === 'light'  → document.documentElement.classList.remove('dark')
theme === 'auto'   → 根据系统偏好设置/移除 dark class
```

---

### 4.3 I18nContext — 国际化管理

**文件路径**: `src/i18n/I18nContext.tsx`

#### 支持语言

| 代码 | 语言 | 翻译键数 |
|------|------|----------|
| `en` | English (默认) | ~120 |
| `zh` | 中文 | ~120 |
| `ja` | 日本語 | ~120 |
| `ko` | 한국어 | ~120 |

#### 导出值

| 属性 | 类型 | 说明 |
|------|------|------|
| `lang` | `Language` | 当前语言代码 |
| `setLang` | `(l: Language) => void` | 切换语言 |
| `t` | `(key: string) => string` | 翻译函数 |

#### 翻译查找规则

```typescript
const t = (key: string) => {
  return translations[lang][key]        // 当前语言
      ?? translations['en'][key]         // 回退英文
      ?? key;                            // 回退 key 本身
};
```

#### 持久化

- 存储键: `localStorage.language`
- HTML lang 属性: `document.documentElement.lang = lang`
- 跨标签同步: `StorageEvent` 监听

---

## 5. 组件库

### 5.1 shadcn/ui 组件清单

项目基于 shadcn/ui 构建，共包含 **52 个** UI 组件，位于 `src/components/ui/` 目录。

| 类别 | 组件 |
|------|------|
| **基础** | button, input, textarea, label, badge, select, checkbox, radio-group, switch, slider, toggle, toggle-group |
| **布局** | card, separator, aspect-ratio, resizable, scroll-area, sidebar |
| **展示** | avatar, skeleton, table, chart, carousel, accordion, collapsible, hover-card, tooltip |
| **导航** | tabs, breadcrumb, pagination, navigation-menu, menubar, command |
| **反馈** | alert, dialog, alert-dialog, drawer, sheet, progress, spinner, sonner, empty |
| **表单** | form, calendar, input-otp, field, item |
| **浮层** | popover, dropdown-menu, context-menu |
| **其他** | button-group, input-group, kbd |

### 5.2 自定义共享组件

#### Layout.tsx — 根布局组件

| 属性 | 说明 |
|------|------|
| **Props** | `children: React.ReactNode` |
| **功能** | 管理侧边栏可见性、Toast 通知主题、暗色模式 |
| **侧边栏控制** | 通过 `sidebarRoutes` 数组匹配当前路由 |
| **Toast 主题** | 根据 `effectiveTheme` 动态设置 toast 样式 |
| **布局计算** | `showSidebar ? 'ml-[220px]' : ''` |

#### Navbar.tsx — 侧边栏导航

| 属性 | 说明 |
|------|------|
| **Props** | `isAuthenticated, user, hasCompanion, onLogout` |
| **尺寸** | 固定 220px 宽度，全高 |
| **功能** | 动态导航项、3 态主题切换、4 语言下拉选择、用户信息、登出 |
| **动态导航** | 认证用户: Dashboard/Chat/Memory/Drama/Payment/Settings/Crowdfunding  |
| | 未认证用户: Home/Login |
| | 有伴侣显示 Dashboard，无伴侣显示 Plaza |
| **主题切换** | 点击循环: light → dark → auto |
| **语言下拉** | 4 语言下拉菜单，AnimatePresence 动画 |

#### Footer.tsx — 页脚组件

| 属性 | 说明 |
|------|------|
| **使用位置** | Landing Page (Home.tsx) |
| **内容** | 品牌信息、产品链接、资源链接、联系方式、社交媒体图标 |

---

## 6. 样式体系

### 6.1 Tailwind CSS 配置

**文件路径**: `tailwind.config.js`

#### 暗色模式

```javascript
darkMode: ["class"],  // 通过 class 策略控制
```

#### 自定义颜色

| Token | 色值 | 用途 |
|-------|------|------|
| `pink-50` | `#FFF5F7` | 页面背景 |
| `pink-100` | `#FFE4EC` | 卡片边框 |
| `pink-200` | `#FFB6C1` | 强调色 |
| `pink-400` | `#FF69B4` | 主色/CTA |
| `pink-500` | `#E850A0` | 按钮激活 |
| `plum-900` | `#2D1B2E` | 主文字色 |
| `plum-800` | `#6B5B6E` | 次要文字 |
| `plum-700` | `#A093A5` | 辅助文字 |
| `rose-gold` | `#E8A0BF` | 玫瑰金强调 |
| `gold` | `#D4A574` | 能量/支付图标 |
| `purple-memory` | `#C8A8E9` | 记忆/待办标识 |
| `sidebar-bg` | `#1A1025` | 侧边栏背景 |
| `sidebar-hover` | `#2A1A3A` | 侧边栏悬停 |
| `sidebar-active` | `#3D2652` | 侧边栏激活 |

#### 自定义字体

| Token | 字体 | 用途 |
|-------|------|------|
| `font-display` | ZCOOL QingKe HuangYou | 标题展示 |
| `font-body` | Nunito | 正文/按钮 |
| `font-number` | DM Sans | 数字展示 |

#### 自定义阴影

| Token | 值 |
|-------|-----|
| `shadow-sm` | `0 1px 3px rgba(45,27,46,0.06)` |
| `shadow-md` | `0 4px 16px rgba(45,27,46,0.08)` |
| `shadow-lg` | `0 8px 32px rgba(45,27,46,0.12)` |
| `shadow-glow` | `0 0 24px rgba(255,182,193,0.25)` |
| `shadow-sidebar` | `4px 0 24px rgba(26,16,37,0.15)` |

#### 自定义动画

| 动画名 | 描述 |
|--------|------|
| `breathing` | 8s 呼吸渐变动画 |
| `float-orb` | 12s 浮动球体动画 |
| `pulse-glow` | 2s 发光脉冲动画 |
| `ring-pulse` | 1.5s 环形扩散动画 |

### 6.2 全局 CSS 变量

**文件路径**: `src/index.css`

关键 CSS 变量（shadcn/ui 标准）：

```css
:root {
  --radius: 0.625rem;
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  /* ... */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### 6.3 暗色/亮色模式切换机制

1. **主题设置** → `ThemeContext.setTheme(theme)`
2. **持久化** → `localStorage.setItem('theme', theme)`
3. **应用** → `applyTheme(theme)` 设置/移除 `dark` class
4. **Tailwind 响应** → `darkMode: ["class"]` 匹配 `.dark` 前缀
5. **组件响应** → 使用 `dark:` 前缀的 Tailwind 类自动切换
6. **系统监听** → auto 模式下监听 `prefers-color-scheme` 变化

---

## 7. 状态管理

### 7.1 全局状态（React Context）

| Context | 管理状态 | 持久化 |
|---------|----------|--------|
| `AuthContext` | 用户认证、伴侣数据 | Supabase Session |
| `ThemeContext` | 主题模式 (light/dark/auto) | localStorage.theme |
| `I18nContext` | 语言设置 (en/zh/ja/ko) | localStorage.language |

### 7.2 本地状态（useState）

每个页面组件独立管理自己的 UI 状态：

| 页面 | 主要本地状态 |
|------|-------------|
| Home | `activeTab`, `activeMood`, `scrolled` |
| Auth | `isLogin`, `email`, `password`, `username`, `loading`, `error` |
| Dashboard | `companion`, `energy`, `mood`, `milestones`, `transactions` |
| Chat | `messages`, `inputValue`, `isStreaming`, `companion`, `showInfo` |
| Memory | `currentMonth`, `selectedDate`, `memories` |
| Drama | `activeView`, `activeFilter`, `dramas`, `sessions` |
| DramaSpace | `messages`, `inputValue`, `isStreaming`, `showSceneIntro`, `energy`, `isPaused` |
| Settings | `language`, `timezone`, `theme`, `notifEnergy`, `notifDaily` |
| Payment | `selectedPlan`, `showQrModal`, `energy`, `transactions`, `plans` |
| Crowdfunding | `projects`, `loading` |
| Achievement | `achievements`, `filter` |

### 7.3 数据获取策略

| 策略 | 实现方式 | 适用场景 |
|------|----------|----------|
| **页面挂载加载** | `useEffect(() => { loadData() }, [])` | 大部分页面初始化 |
| **并行查询** | `Promise.all([query1, query2, ...])` | Dashboard 并行加载多个数据源 |
| **流式响应** | `ReadableStream` + `getReader()` | Chat / DramaSpace AI 对话 |
| **实时订阅** | `supabase.auth.onAuthStateChange()` | 认证状态同步 |
| **乐观更新** | 先更新 UI 再发请求 | Chat 消息发送 |
| **条件加载** | `if (!isAuthenticated) return` | 未登录用户显示引导 |

### 7.4 数据表映射

| 前端页面 | 主要 Supabase 数据表 |
|----------|---------------------|
| Dashboard | `companions`, `profiles`, `energy_accounts`, `intimacy_milestones`, `energy_transactions`, `chat_messages` |
| Plaza | `companion_templates` |
| Customize | `companions`, `profiles` |
| Chat | `companions`, `chat_messages`, `companion_states` |
| Memory | `companion_diaries`, `ltm_memories`, `anterior_memories` |
| Drama | `drama_definitions`, `drama_sessions`, `drama_messages` |
| Settings | `profiles`, `companions` |
| Payment | `energy_accounts`, `energy_transactions`, `pricing_plans` |
| Crowdfunding | `crowdfunding_projects` |
| Achievement | `chat_messages`, `companion_diaries`, `drama_progress` |

---

## 8. 构建和部署

### 8.1 Vite 配置

**文件路径**: `vite.config.ts`

```typescript
export default defineConfig({
  base: './',                    // 相对路径部署
  plugins: [inspectAttr(), react()],
  server: { port: 3000 },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },  // @/ 指向 src/
  },
});
```

### 8.2 构建命令

```bash
# 开发模式
npm run dev        # vite --port 3000

# 生产构建
npm run build      # vite build (输出到 dist/)

# 预览
npm run preview    # vite preview
```

### 8.3 部署方式

- **构建输出**: `dist/` 目录（静态 HTML/CSS/JS）
- **基础路径**: `./`（支持子目录部署）
- **托管方案**: 静态托管（Vercel / Netlify / Cloudflare Pages / Nginx）
- **环境变量**:
  - `VITE_SUPABASE_URL` — Supabase 项目 URL
  - `VITE_SUPABASE_PUBLISHABLE_KEY` — 客户端 API Key

### 8.4 依赖清单

| 依赖 | 版本 | 用途 |
|------|------|------|
| `react` | ^18.3.1 | UI 框架 |
| `react-dom` | ^18.3.1 | DOM 渲染 |
| `react-router-dom` | ^7.6.1 | 客户端路由 |
| `framer-motion` | ^12.11.0 | 动画库 |
| `@supabase/supabase-js` | ^2.49.1 | 后端 SDK |
| `tailwindcss` | ^3.4.1 | 原子化 CSS |
| `lucide-react` | ^0.344.0 | 图标库 |
| `sonner` | ^2.0.3 | Toast 通知 |
| `date-fns` | ^4.1.0 | 日期处理 |
| `clsx` | ^2.1.1 | 条件类名 |
| `tailwind-merge` | ^3.0.2 | Tailwind 类名合并 |
| `tailwindcss-animate` | ^1.0.7 | Tailwind 动画扩展 |

---

## 附录 A：文件完整清单

```
src/
├── App.tsx                          # 根组件，14 条路由定义
├── main.tsx                         # 入口（React 18 createRoot）
├── index.css                        # 全局样式 + Tailwind 指令
├── types/
│   └── index.ts                     # 全局 TypeScript 类型
├── pages/
│   ├── Home.tsx                     # Landing Page
│   ├── Auth.tsx                     # 登录/注册
│   ├── Dashboard.tsx                # 主控面板
│   ├── Plaza.tsx                    # 伴侣广场
│   ├── Customize.tsx                # 自定义伴侣
│   ├── Chat.tsx                     # 聊天界面
│   ├── Memory.tsx                   # 记忆系统
│   ├── Drama.tsx                    # 剧情广场
│   ├── DramaSpace.tsx               # 剧情空间
│   ├── Settings.tsx                 # 设置
│   ├── Payment.tsx                  # 支付/能量充值
│   ├── Crowdfunding.tsx             # 众筹中心
│   └── Achievement.tsx              # 成就系统
├── components/
│   ├── Layout.tsx                   # 根布局（侧边栏控制）
│   ├── Navbar.tsx                   # 侧边栏导航
│   ├── Footer.tsx                   # 页脚
│   └── ui/                          # shadcn/ui 组件 (52 个)
├── hooks/
│   ├── useAuth.ts                   # 认证 Hook（备用）
│   └── use-mobile.ts                # 移动端检测
├── context/
│   ├── AuthContext.tsx              # 认证状态 Context
│   └── ThemeContext.tsx             # 主题状态 Context
├── i18n/
│   ├── I18nContext.tsx              # 国际化 Context
│   └── translations.ts              # 四语言翻译 (120+ 键/语言)
└── lib/
    ├── supabase.ts                  # Supabase 客户端 + 工具函数
    ├── theme.ts                     # 主题工具函数
    └── utils.ts                     # 通用工具 (cn 函数)
```

## 附录 B：Edge Functions 调用清单

| Function | 页面 | 用途 |
|----------|------|------|
| `chat-stream` | Chat | 发送消息，获取流式 AI 响应 |
| `drama-chat` | DramaSpace | 剧情对话，流式响应 |
| `drama-session` | Drama, DramaSpace | 创建/获取/重启剧情会话 |
| `payment-create` | Payment | 创建支付订单 |

---

> 本文档为 Corolas | Platonic 前端架构完整技术文档，涵盖从项目概览到每个组件的详细实现。开发团队应以此文档为参考标准进行开发、维护和扩展。
