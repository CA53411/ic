# Drama Space 剧情空间 — 完整实现计划

## 架构设计

### 核心理念
- 每个剧本 = 一个完全独立的虚拟世界
- Drama Space 与 Chat 完全隔离（独立消息表、独立界面、独立会话）
- 进入剧情后，伴侣会沉浸在剧本场景中，忘记自己是AI

### 数据流
```
Drama 广场 → 选择剧本 → 创建 drama_session → 进入 Drama Space
                                                    ↓
                                            drama_messages（独立存储）
                                                    ↓
                                              drama-chat Edge Function
                                                    ↓
                                            剧情结束 → 保存 drama_progress
```

### 数据库表（已存在）
| 表 | 用途 |
|----|------|
| drama_definitions | 剧本定义（名称、场景、提示词、封面图） |
| drama_sessions | 用户进入的剧情会话 |
| drama_progress | 用户对每个剧情的解锁/完成状态 |
| drama_messages | 剧情空间内的消息（与 stm_messages 完全隔离） |

### Edge Functions（新建）
| 函数 | 用途 |
|------|------|
| drama-chat | SSE 流式剧情对话（类似 chat-stream 但完全独立） |
| drama-session | 创建/获取/管理剧情会话 |

### 前端页面
| 页面 | 用途 |
|------|------|
| Drama.tsx（改造） | 剧本广场（列表+解锁状态+封面图） |
| DramaSpace.tsx（新建） | 独立的剧情空间界面（场景介绍+对话+剧情控制） |
| App.tsx（修改） | 添加 /drama-space/:sessionId 路由 |

### 剧情流程
1. 用户进入 Drama 广场 → 浏览可用剧本
2. 点击"开始体验" → drama-session 创建会话 → 跳转到 Drama Space
3. Drama Space 顶部显示：剧本封面、场景设定、剧情背景
4. 对话区域显示场景描述和角色介绍
5. 用户和伴侣在场景下进行角色扮演对话
6. 每条消息都存储在 drama_messages 表
7. 剧情结束时，伴侣自动回到现实，用户可以重新开始

## 实现步骤
1. 创建 drama-chat Edge Function
2. 创建 drama-session Edge Function
3. 改造 Drama.tsx（剧本广场）
4. 新建 DramaSpace.tsx（独立剧情空间界面）
5. 修改 App.tsx 路由
6. 部署
