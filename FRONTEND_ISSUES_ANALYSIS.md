# Platonic AI — 全面问题分析与修复计划

## 一、数据库列名不匹配（导致400错误）

| 表 | 前端查询的列 | 数据库实际列 | 修复方案 |
|----|------------|------------|---------|
| companion_diaries | user_id, title, memory_type | companion_id(无user_id), content, emotion_tag | 改查companion_id关联，改列名 |
| milestone_definitions | stage_number | id(smallint) | 改用id排序，插入数据 |
| energy_transactions | plan_name, user_id | description, account_id(无user_id) | 改用description，通过account_id关联 |
| anterior_memories | scheduled_time | planned_at | 改列名 |

## 二、缺失数据

| 表 | 状态 | 修复 |
|----|------|------|
| milestone_definitions | 空表，无数据 | 插入5阶段数据 |
| crowdfunding_projects | 空表，无数据 | 插入3个计划（Live2D/宠物/TTS） |
| companion_diaries | 有结构无数据 | 为测试伴侣插入日记 |

## 三、前端预设/mock数据清理清单

| 文件 | 清理内容 |
|------|---------|
| Plaza.tsx | mockCompanions数组（保留结构作为fallback） |
| Dashboard.tsx | bigFiveData/stages硬编码常量 |
| Chat.tsx | companionName硬编码 |
| Crowdfunding.tsx | 硬编码计划数据改为DB查询 |
| Payment.tsx | 硬编码充值方案改为pricing_plans查询 |
| Drama.tsx | 硬编码剧情改为drama_definitions查询 |

## 四、侧栏重构要求

1. 移除所有滑动hover效果，全部展开显示
2. Help/Privacy/Terms按钮移除，移入Settings页
3. 添加主题设置toggle（亮色/暗色/自动）
4. Plaza和Dashboard互斥：有伴侣=显示Dashboard，无伴侣=显示Plaza
5. 保留：Home(未登录)、Login/Logout、Dark Mode、Language

## 五、Crowdfunding修正

只显示3个核心计划：
1. Live2D互动形象
2. 虚拟宠物系统
3. TTS语音合成

移除"硬件终端"相关展示。

## 六、Chat布局修复

确保消息区域不被侧边栏遮挡，正确应用ml-[220px]偏移。

## 七、CORS修复

Edge Functions需要正确处理OPTIONS预检请求，返回200+正确headers。

## 八、付款改为跳转

无法实现站内扫码，改为跳转支付宝支付页面。

## 九、Customize完全实现

3步向导：基本信息→Big Five sliders→背景故事，完整Supabase插入。
