# Platonic AI 全面质量优化计划

## 目标：以Consolidation质量为标准，全线完善

## Phase 1: 后端Edge Functions审计（并行8个子代理）

### 1.1 chat-stream — SSE流式对话
- [x] 时区感知
- [x] NOT NULL列修复
- [x] JWT验证
- [x] 能量扣减
- [ ] 情绪标签自动检测（新增）
- [ ] 对话上下文token管理
- [ ] 错误恢复机制

### 1.2 payment-create — Zpay订单
- [x] NOT NULL列修复
- [x] DB驱动plans
- [x] CryptoJS.MD5签名
- [x] 回调URL
- [ ] 订单幂等性增强

### 1.3 payment-callback — 支付回调
- [x] 签名验证
- [x] energy更新
- [x] NOT NULL列修复
- [x] idempotency_key去重
- [ ] 回调重试保护

### 1.4 energy — 能量查询/消费
- [x] energy_transactions修复
- [x] GET字段名修正
- [ ] 能量不足优雅降级

### 1.5 proactive — 主动消息
- [x] 时区支持
- [x] NOT NULL列修复
- [x] JWT认证
- [x] 能量检查
- [ ] 基于anterior_tasks生成（而非硬编码prompt）
- [ ] 读取consolidation数据增强主动性

### 1.6 consolidation — ✅ 已完成最强版

### 1.7 milestone-adjust — 亲密度调整
- [x] 列名修复
- [x] pg_cron触发
- [ ] 基于LTM记忆的亲密度变化
- [ ] 里程碑事件触发

### 1.8 seed-data — 数据初始化
- [x] NOT NULL列修复
- [x] 列名修正
- [ ] 创建companion时自动初始化能量账户

## Phase 2: 数据库完善
- [ ] 添加indexes优化查询
- [ ] 添加RLS策略完整性检查
- [ ] 添加companion时自动触发初始化函数

## Phase 3: 前端优化
- [ ] Chat.tsx — 实时情绪标签显示
- [ ] Chat.tsx — LTM记忆引用显示
- [ ] Dashboard.tsx — 亲密度里程碑可视化
- [ ] Dashboard.tsx — 伴侣状态面板
- [ ] Memory.tsx — ✅ 已完成
- [ ] Settings.tsx — 增强设置

## Phase 4: 构建部署
- [ ] DELETE+POST重新部署所有8个函数
- [ ] 前端构建+部署
