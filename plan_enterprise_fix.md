# 企业级全面升级修复计划

## Phase 1: CRITICAL 修复（功能阻塞性）
1. 修复 chat-stream: 移除 stm_messages 查询中的 is_deleted 过滤
2. 修复 proactive-scheduler: 触发后设置下次时间、添加认证、修复执行顺序
3. 修复 consolidation: 修复所有 insert 列名不匹配
4. 修复 milestone-adjust: 修复 intimacy_records 列名
5. 修复 seed-data: 修复所有列名不匹配、移除安全漏洞
6. 修复 payment-callback: 移除手动能量更新（避免双重充值）

## Phase 2: HIGH 修复（严重影响）
7. 创建 achievement-check Edge Function（完全缺失）
8. 修复 energy: 添加乐观锁并发保护
9. 所有 Edge Functions 添加完善认证
10. 前端: 修复 Achievement.tsx 表名错误
11. 前端: 补全 i18n 翻译

## Phase 3: 企业级增强
12. chat-stream: 添加亲密度更新逻辑
13. chat-stream: 添加 LTM 记忆提取
14. 添加消息已读状态
15. 添加 WebSocket 实时推送
16. 添加消息删除/编辑功能
17. 添加伴侣在线状态

## Phase 4: 部署
18. 部署所有 Edge Functions
19. 部署前端
20. 验证
