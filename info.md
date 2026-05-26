# Platonic AI 虚拟伴侣 — 产品需求资料

## 产品定位
AI虚拟伴侣Web应用，提供个性化AI伴侣对话、记忆系统、好感度成长、剧情空间等深度情感交互体验。

## 技术栈
- 前端：Vercel + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Vite
- 后端：Supabase Edge Function (Deno)
- 数据库：Supabase PostgreSQL + RLS Policies
- AI模型：DeepSeek-V4-Flash (1M上下文, SSE Streaming)
- 支付：Zpay (支付宝)
- 存储：Supabase Storage

## 核心功能模块

### 1. 注册/登录
- Supabase Auth 邮箱注册/登录
- 邮箱验证
- 密码安全性验证

### 2. 控制台（伴侣空间）布局
- 侧栏导航
- 右边分屏（类似手机大小，上2/3预留Live2D，下1/3预留宠物）
- 右上角Profile（邮箱、电量余额）

### 3. Dashboard面板
- 伴侣Big Five五边形指数可视化（大图表）
- Milestone进度条
- 电量余额
- 最近24小时情绪波动
- 去广场认识伴侣/创建伴侣入口

### 4. 伴侣系统
- 广场Plaza（浏览可选伴侣）
- 自定义Customize（创建个性化伴侣）
- 昵称、性别、年龄、生日、背景
- 主要语言：中/英/日/韩
- Big Five人格设定（O/C/E/A/N各0-100，10级动态描述）

### 5. 对话系统
- SSE Streaming流式输出
- 被动对话（用户主动）+ 主动对话（AI主动）
- 聊天背景粉红呼吸氛围感
- 消息滑动窗口
- 下方发送框固定

### 6. 记忆系统
- Short Term Memory（对话上下文，保留3天）
- Long Term Memory（Consolidation生成，重要性0.1-1.0）
- Anterior Memory（待办/未来事项队列）
- 日历显示（7×5，Anterior Memory + LTM + Milestone日期）

### 7. 好感度/Milestone系统
- 初见乍欢(0-20) → 渐入佳境(21-40) → 暗生情愫(41-60) → 情投意合(61-80) → 心有灵犀(81-100)
- 情绪系统（短期Mood + 长期Affection）

### 8. 高级剧情空间
- 剧情广场（像小说软件展示不同剧情）
- 独立剧情空间，不影响正常对话
- 剧情封面在Supabase Storage
- 限制：暗生情愫阶段(41+)可进入

### 9. 充电/支付系统
- 1RMB = 100电量
- 充值套餐：¥1(100), ¥5(500+100), ¥10(1000+500), ¥50(5000+1000), ¥100(10000+3000), ¥300(30000+8000)
- Zpay → 支付宝

### 10. 筹资系统
- 展示后续阶段计划（Live2D/宠物/TTS）
- 目标量和当前筹资量
- 进度条形式
- 允许超额筹资

### 11. 设置
- 我的余额（显示余额+前往支付中心）
- 外观（语言显示 中/英/日/韩）

### 12. 安全
- RLS + Policies

## 视觉风格
- **粉红呼吸氛围感**：前端对话框聊天背景实现
- 温暖、治愈、浪漫的情感化设计
- 柔和的粉色调为主色
- 卡片式布局，圆角设计
- 细腻的动画过渡效果
- 暗色侧栏 + 明亮内容区

## 页面列表
1. 登录/注册页 (Auth)
2. Dashboard首页 (控制台)
3. 广场Plaza (浏览伴侣)
4. 伴侣创建/设置页 (Customize)
5. 对话页 (Chat)
6. 甜蜜记忆/日历页 (Memory)
7. 恋爱图谱页 (Romance Graph)
8. 高级剧情空间 (Drama Space)
9. 剧情广场 (Drama Plaza)
10. 支付中心 (Payment)
11. 设置页 (Settings)
12. Platonic介绍/筹资页 (About/Crowdfunding)
