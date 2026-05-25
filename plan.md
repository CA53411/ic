# 项目交接计划

## 目标
1. 生成超详细的项目交接文档（数据库表/列、Edge Functions、前端组件、架构图）
2. 修复 Plaza 和 Customize 的列名不匹配问题
3. 完整推送到 GitHub CA53411/ic 仓库

## Stage 1: 信息收集（并行）
- 读取所有 Edge Function 源码
- 读取所有前端页面和组件
- 读取数据库 migration/schema
- 读取配置文件

## Stage 2: 文档编写（并行）
- 子代理1: 数据库Schema文档
- 子代理2: Edge Functions文档
- 子代理3: 前端架构文档
- 子代理4: 项目概览和部署文档

## Stage 3: 代码修复
- 修复 Plaza.tsx（移除language列，.single()→.maybeSingle()）
- 修复 Customize.tsx（移除不存在的列，.single()→.maybeSingle()）
- 重新构建前端

## Stage 4: GitHub推送
- 初始化git仓库
- 完整提交（前端+后端+文档）
- 推送到CA53411/ic仓库
