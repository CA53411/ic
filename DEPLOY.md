# Platonic AI — 部署指南

## 1. Supabase 数据库部署

### 1.1 创建项目
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 新建项目（或使用现有项目）
3. 记录 Project URL 和 Service Role Key

### 1.2 执行数据库Schema
1. 进入项目的 SQL Editor
2. 打开 `schema.sql` 文件（约120KB）
3. 完整复制粘贴执行
4. 确认所有表创建成功（51个表）

### 1.3 配置pg_cron定时任务
在 SQL Editor 中执行：
```sql
-- 启用pg_cron扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 添加定时任务（根据schema.sql中的定义）
-- Consolidation: 每天凌晨2点
-- Milestone Adjust: 每天凌晨3点
-- STM Cleanup: 每天凌晨4点
```

## 2. Edge Functions 部署

### 方式A：Supabase Dashboard（推荐）
1. 进入项目 → Edge Functions → 新建 Function
2. 逐个创建以下7个函数：

| 函数名 | 路径 | 环境变量 |
|--------|------|---------|
| chat-stream | /chat-stream | DEEPSEEK_API_KEY |
| payment-create | /payment/create | ZPAY_PID, ZPAY_KEY |
| payment-callback | /payment/callback | ZPAY_PID, ZPAY_KEY |
| consolidation | /consolidation | DEEPSEEK_API_KEY |
| milestone-adjust | /milestone/adjust | DEEPSEEK_API_KEY |
| energy | /energy | 无额外 |
| proactive | /proactive | DEEPSEEK_API_KEY |

3. 每个函数的代码在 `supabase/functions/<name>/index.ts`
4. 共享模块 `_shared/*.ts` 需要复制到每个函数的 `../_shared/` 路径

### 方式B：Supabase CLI
```bash
# 1. 安装CLI
npm install -g supabase

# 2. 登录
supabase login

# 3. 链接项目
supabase link --project-ref <your-project-ref>

# 4. 复制函数代码到项目
mkdir -p supabase/functions
cp -r backend/supabase/functions/* supabase/functions/

# 5. 部署所有函数
supabase functions deploy chat-stream
supabase functions deploy payment-create
supabase functions deploy payment-callback
supabase functions deploy consolidation
supabase functions deploy milestone-adjust
supabase functions deploy energy
supabase functions deploy proactive
```

## 3. 环境变量配置

### Supabase Edge Functions 环境变量
在 Supabase Dashboard → Edge Functions → 环境变量 中添加：

```
DEEPSEEK_API_KEY=sk-6d03729471f54287a64b43b757a29b05
ZPAY_PID=<你的Zpay商户ID>
ZPAY_KEY=<你的Zpay密钥>
```

### Vercel 前端环境变量
在 Vercel Dashboard → Project → Settings → Environment Variables 中添加：

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

## 4. Zpay 支付配置

### 4.1 Zpay商户设置
1. 登录 [Zpay商户中心](https://zpayz.cn)
2. 获取 PID 和 KEY
3. 设置回调地址：`https://<your-project>.supabase.co/functions/v1/payment-callback`

### 4.2 测试支付
1. 使用Zpay沙箱环境测试
2. 确认回调能正确更新电量余额

## 5. 验证部署

### 5.1 数据库验证
```sql
-- 检查表数量
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 应该返回 51

-- 检查RLS Policies
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- 应该返回 105
```

### 5.2 Edge Functions验证
```bash
# 测试对话流式API
curl -X POST https://<your-project>.supabase.co/functions/v1/chat-stream \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'

# 测试电量查询
curl https://<your-project>.supabase.co/functions/v1/energy \
  -H "Authorization: Bearer <jwt-token>"
```

## 6. 前端更新

### 6.1 更新环境变量后重新部署
```bash
# Vercel自动从GitHub拉取最新代码并构建
# 确保环境变量已配置
```

### 6.2 替换Mock API为真实API
前端代码中需要修改以下文件，将mock数据替换为真实API调用：
- `src/lib/supabase.ts` — 确认Supabase客户端配置
- `src/pages/Chat.tsx` — 连接/chat-stream Edge Function
- `src/pages/Payment.tsx` — 连接/payment/create Edge Function
- `src/pages/Dashboard.tsx` — 连接/energy Edge Function查询电量

## 7. 生产环境检查清单

- [ ] 数据库Schema已执行（51个表）
- [ ] RLS Policies已启用（105个策略）
- [ ] 7个Edge Functions已部署
- [ ] 环境变量已配置（DEEPSEEK_API_KEY, ZPAY_PID, ZPAY_KEY）
- [ ] 前端环境变量已配置（VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY）
- [ ] Zpay回调地址已设置
- [ ] pg_cron定时任务已启用
- [ ] 数据库种子数据已插入（Milestone定义、情绪标签等）
- [ ] 前端API端点已更新为生产环境

## 文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| 数据库Schema | `/mnt/agents/output/schema.sql` | 完整DDL |
| Edge Functions | `/mnt/agents/output/backend/supabase/functions/` | 7个函数+4共享模块 |
| 前端代码 | `/mnt/agents/output/app/` | React+Vite项目 |
| 架构文档 | `/mnt/agents/output/platonic_architecture.md` | 完整架构方案 |
| Prompt设计 | `/mnt/agents/output/prompts.md` | 5个Prompt详细设计 |
| 部署指南 | `/mnt/agents/output/DEPLOY.md` | 本文件 |
