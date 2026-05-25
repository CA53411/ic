# Proactive 全面修复与增强计划

## 架构设计

### 1. 调度模型（无需前端开关）
- `proactive_schedule` 表记录每个用户的下次触发时间
- chat-stream 用户发消息时 → upsert schedule（计算 2min-24h 随机间隔，避开 3-6am）
- pg_cron 每分钟调用 `proactive-scheduler` → 检查到期 → 调用 `proactive` → 保存消息到 stm_messages

### 2. 时间感知对话
- chat-stream STM prompt 中每条消息添加时间戳
- 计算用户最后消息到当前的时间间隔
- 伴侣能感知"用户已多久没回复"

### 3. Proactive 态度梯度
- 正常等待 → 温暖问候
- 较长时间未回复 → 轻微担心/关心
- 很久未回复 → 更明显的思念

## 实施步骤
1. 创建 `proactive_schedule` 表
2. 重写 `proactive` Edge Function（修复所有 bug）
3. 创建 `proactive-scheduler` Edge Function
4. 修改 `chat-stream`（STM 时间戳 + schedule 更新）
5. 设置 pg_cron 定时任务
6. 部署
