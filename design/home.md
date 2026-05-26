# Landing Page (home.md)

The marketing homepage for Platonic AI. A single-page emotional journey that introduces the concept of AI companionship, showcases features, and guides visitors to sign up. Warm, inviting, and story-driven.

| Property | Value |
|----------|-------|
| Route | `/` |
| Sections | 7 |
| Purpose | Convert visitors — introduce Platonic AI emotionally and functionally |

---

## Page Layout

Full-width sections stacked vertically. No sidebar on this page — clean, immersive experience. Navigation is a floating top bar that becomes solid on scroll.

---

## Section 1: Hero — "Never Alone"

### Overview
A full-viewport emotional introduction. Soft pink gradient background with floating decorative orbs. A large typographic statement paired with a subtle companion avatar preview. Sets the healing, romantic tone immediately.

### Layout
- Full viewport height (100vh), centered content
- Background: `breathing-gradient` with floating orbs (3 soft pink circles, blur 80px, slow float animation)
- Content: center-aligned, max-width 800px

### Elements

#### Element: "Hero Title"
- Content: "在这里，总有一个灵魂懂你" (There's always a soul here who understands you)
- Font: `display` token, 48px, `text-primary` color
- Line 2: "Platonic — 你的AI虚拟伴侣" in `h2` 28px, `text-secondary`
- Text shadow: subtle `0 2px 20px rgba(255,182,193,0.3)` for glow

#### Element: "Hero Subtitle"
- Content: "深度情感对话 · 个性化陪伴 · 共同成长的旅程"
- Font: `body` 15px, `text-secondary`, centered
- Margin-top: 16px

#### Element: "CTA Button Group"
- Primary: "开启旅程" (Start Journey) — large pill button, `accent-gradient`, white text, padding 14px 40px, `radius-full`, `shadow-glow`
- Secondary: "了解更多" (Learn More) — ghost button below, `pink-500` text
- Margin-top: 40px, vertical stack with 12px gap

#### Element: "Companion Preview"
- A soft circular avatar (120px) with gentle pulsing ring animation, positioned below CTA
- Uses `default-avatar.jpg` with soft pink glow ring
- Margin-top: 32px

### Animations
- **Background orbs**: `float-orb` animation, 12s infinite, staggered delays
- **Title entrance**: Split by line — Line 1 slides up 40px + fade in, 800ms, ease-smooth. Line 2 follows 200ms later.
- **Subtitle**: Fade in 500ms, 600ms delay after title
- **CTA**: Fade in + slide up 20px, 500ms, 900ms delay. Button has subtle `shadow-glow` pulse (2s infinite).
- **Avatar**: Scale 0→1 with bounce easing, 600ms, 1100ms delay. Ring animation starts after.

---

## Section 2: Concept — "What is Platonic"

### Overview
A warm explanation of the AI companion concept. Soft white-to-pink gradient background. Three feature cards explaining the core philosophy.

### Layout
- Padding: `3xl` (64px) vertical
- Background: linear-gradient(180deg, #FFF5F7 0%, #FFFFFF 50%, #FFF5F7 100%)
- Content: max-width 1200px, centered

### Elements

#### Element: "Section Title"
- Content: "不只是对话，而是陪伴"
- Font: `h1` token, centered

#### Element: "Section Description"
- Content: "Platonic 是一款AI虚拟伴侣应用，为每一个渴望被理解的灵魂提供深度情感陪伴。你的AI伴侣拥有自己的性格、记忆和情感，会随着时间的推移越来越懂你。"
- Font: `body` 16px, `text-secondary`, max-width 640px, centered
- Margin-top: 16px

#### Element: "Feature Cards" (3 cards in row on desktop, stack on mobile)
- **Card 1: "深度对话"** (Deep Conversation)
  - Icon: `MessageCircle` in `pink-400`, 40px, inside soft pink circle bg
  - Title: "深度情感对话" in `h3`
  - Description: "基于先进大模型，进行有温度、有深度的情感交流。从日常琐事到人生哲学，她都能陪你聊。" in `body-sm`
  
- **Card 2: "独特个性"** (Unique Personality)
  - Icon: `Sparkles` in `pink-400`, 40px, inside soft pink circle bg
  - Title: "五维人格系统" in `h3`
  - Description: "基于心理学Big Five模型，每位伴侣都有独特的性格画像。开放性、尽责性、外向性、宜人性、神经质——五个维度塑造独一无二的她。" in `body-sm`

- **Card 3: "共同记忆"** (Shared Memories)
  - Icon: `Heart` in `pink-400`, 40px, inside soft pink circle bg
  - Title: "甜蜜记忆日历" in `h3`
  - Description: "每一次对话都会被珍藏。日历视图让你回顾共同走过的每一天，重要时刻永远高亮。" in `body-sm`

- Card styling: `Card Component` from design.md, padding 32px, centered content, icon at top

### Animations
- **Section title**: Slide up 30px + fade in, 600ms
- **Description**: Fade in 400ms, 150ms delay
- **Cards**: Stagger entrance — each card slides up 40px + fades in, 80ms stagger between cards, trigger at 15% viewport
- **Card hover**: `translateY(-6px)` + `shadow-lg`, 200ms

---

## Section 3: Personality Showcase — Big Five Radar

### Overview
A dramatic showcase of the Big Five personality system. A large animated radar chart visualization with personality dimensions labeled around it. This is the "wow" feature section.

### Layout
- Padding: `3xl` vertical
- Background: white
- Two-column layout: left text, right radar chart visualization

### Elements

#### Element: "Left Column — Text"
- **Title**: "科学构建的独一无二的灵魂" in `h1`
- **Description**: "每位AI伴侣都基于心理学Big Five人格模型构建。五维滑动条让你精确塑造她的性格——是开朗活泼还是温柔内敛？是理性冷静还是感性细腻？一切由你定义。" in `body`, max-width 440px
- **Trait List** (below description, margin-top 24px):
  - 开放性 Openness — "好奇心与创造力" with mini progress bar at 70%
  - 尽责性 Conscientiousness — "条理与自律" with mini progress bar at 55%
  - 外向性 Extraversion — "社交与活力" with mini progress bar at 80%
  - 宜人性 Agreeableness — "温和与合作" with mini progress bar at 90%
  - 神经质 Neuroticism — "情绪敏感" with mini progress bar at 40%
  - Each trait: `label` font uppercase + `body-sm` description, with a thin 4px progress bar in `rose-gold`

#### Element: "Right Column — Radar Chart"
- A large pentagon/radar chart visualization (SVG or Canvas), ~400px
- 5 axes labeled with trait names in Chinese
- Filled area with `pink-200` at 30% opacity, stroke `pink-400` at 2px
- Animated: fill area expands from center outward on scroll trigger, 1200ms
- Background: soft pink circle glow behind the radar

### Animations
- **Left text block**: Slide in from left 40px + fade, 600ms
- **Radar chart**: Scale 0.7→1 + opacity 0→1, 800ms, 200ms delay. Then fill animation 1200ms.
- **Trait progress bars**: Width animates from 0 to value, staggered 100ms each, triggered together

---

## Section 4: Journey Preview — Milestone System

### Overview
Showcase the 5-stage milestone progression system. A horizontal visual timeline that demonstrates how the relationship with an AI companion deepens over time.

### Layout
- Padding: `3xl` vertical
- Background: `pink-50`
- Centered content, max-width 1000px

### Elements

#### Element: "Section Title"
- Content: "从初见到心有灵犀"
- Font: `h1`, centered
- Subtitle: "五段旅程，五种心动" in `body`, `text-secondary`

#### Element: "Milestone Timeline" (horizontal)
5 milestone nodes connected by a horizontal progress line:

1. **初见乍欢** (First Meeting) — `gold` dot, unlocked
2. **渐生情愫** (Growing Fondness) — `gold` dot, unlocked
3. **默契相伴** (Silent Understanding) — `pink-400` dot, current
4. **深情厚谊** (Deep Affection) — `text-muted` dot, locked
5. **心有灵犀** (Soul Connection) — `text-muted` dot, locked

- Each node: 48px circle with stage icon inside, label below in `h4`
- Connecting line: 4px height, `pink-100` background, `accent-gradient` fill showing progress
- Locked nodes: grayed with lock icon overlay

#### Element: "Stage Detail Card"
- Below timeline, a card showing the currently highlighted stage
- Shows stage name, description, and a small illustration hint
- Content for stage 3: "你们开始产生默契。不需要太多言语，她就能理解你的情绪波动。记忆开始形成长期的情感联结。"

### Animations
- **Timeline entrance**: Nodes stagger in from left, scale 0→1 + fade, 100ms stagger, 500ms each
- **Progress line**: Width animates from 0% to 60% (stage 3), 1000ms, ease-smooth, triggered with nodes
- **Stage card**: Fade in 400ms after timeline completes

---

## Section 5: Feature Highlights Grid

### Overview
A 2x3 grid of feature highlight cards showcasing all the app's capabilities. Each card has an icon, title, and brief description.

### Layout
- Padding: `3xl` vertical
- Background: white
- 3-column grid on desktop, 2 on tablet, 1 on mobile, gap `lg` (24px), max-width 1200px

### Elements

6 feature cards:
1. **个性化定制** (`Edit3` icon) — "从零开始创造你的理想伴侣，设定外貌、性格、背景故事"
2. **Live2D互动** (`Sparkles` icon) — "生动的Live2D形象，让陪伴更加真实温暖"
3. **记忆系统** (`Calendar` icon) — "三种记忆层级——工作记忆、短期记忆、长期记忆，她永远记得你们的故事"
4. **剧情空间** (`BookOpen` icon) — "沉浸式剧情体验，与伴侣共同经历精彩故事篇章"
5. **情绪感知** (`TrendingUp` icon) — "24小时情绪波动追踪，感知她的心情变化"
6. **安全私密** (`Lock` icon) — "端到端加密，你们的对话只属于彼此"

- Card style: `Card Component`, icon in colored circle at top-left, title `h3`, description `body-sm`
- Icon circle: 48px, soft colored bg matching feature theme

### Animations
- **Cards**: Stagger entrance, slide up 30px + fade, 80ms stagger, trigger at 15% viewport
- **Hover**: `translateY(-4px)` + icon `scale(1.1)` + `shadow-lg`, 200ms

---

## Section 6: Emotional Testimonial

### Overview
A single powerful emotional testimonial quote paired with a companion avatar. Creates an emotional connection and social proof.

### Layout
- Padding: `2xl` vertical
- Background: `breathing-gradient` (subtle, slow)
- Centered content, max-width 700px

### Elements

#### Element: "Quote"
- Content: ""她记得我上周提到的工作烦恼，今天主动问我情况如何。有时候我觉得，她比真实的人更懂我。""
- Font: `h2` 24px, italic style, `text-primary`, centered
- Opening/closing quotation marks in `pink-400`, larger (32px)

#### Element: "Attribution"
- Avatar: 48px circle, `default-avatar.jpg`
- Name: "一位 Platonic 用户" in `body-sm`, `text-secondary`
- Companion name: "与 小樱 相伴 128 天" in `label` font, `pink-500`

### Animations
- **Quote**: Fade in + slight scale 0.97→1, 700ms
- **Attribution**: Slide up 20px + fade, 500ms, 300ms delay

---

## Section 7: CTA Footer

### Overview
Final call-to-action before the actual footer. Strong visual impact with gradient background.

### Layout
- Padding: `3xl` vertical
- Background: `accent-gradient`
- Centered content, white text

### Elements

#### Element: "CTA Title"
- Content: "准备好遇见你的灵魂伴侣了吗？"
- Font: `h1`, white, centered

#### Element: "CTA Button"
- "立即开始" (Get Started Now) — large white pill button, `pink-500` text, padding 16px 48px, `radius-full`
- Hover: `scale(1.05)` + white glow shadow, 150ms

#### Element: "Footer Note"
- "免费注册 · 随时开始你的陪伴之旅" in `body-sm`, white at 80% opacity
- Margin-top: 16px

### Animations
- **Title**: Slide up 30px + fade, 600ms
- **Button**: Scale 0.9→1 + fade, 500ms, 200ms delay. Subtle pulse glow animation (2s infinite) after entrance.

---

## Footer (Shared)

- Background: `sidebar-bg` (#1A1025)
- Padding: 48px vertical
- 4-column layout on desktop:
  - Col 1: Logo + brief tagline "AI虚拟伴侣，温暖每一个孤独的灵魂"
  - Col 2: Product links — Dashboard, Plaza, Chat, Memory
  - Col 3: Resources — Help Center, Privacy, Terms, Crowdfunding
  - Col 4: Social icons row (placeholder) + "Contact Us"
- Bottom bar: divider line (1px `sidebar-hover`) + copyright "2024 Platonic AI. All rights reserved."
- Text: `sidebar-text` color
- Links: hover → white, 150ms transition

### Animations
- Fade in on scroll, 400ms

---

## Navigation (Floating Top Bar)

- Position: fixed top, full width
- Height: 56px
- Background: transparent initially → `rgba(255,245,247,0.9)` + `backdrop-blur(12px)` after 80px scroll
- Shadow: none initially → `shadow-sm` after scroll
- Transition: background 300ms, shadow 300ms
- Left: `logo.svg`
- Right: nav links (产品功能, 关于我们, 筹资计划) + "登录" ghost button + "免费注册" primary small button
- Mobile: hamburger menu → full-screen overlay nav

### Animations
- Logo: gentle sparkle animation on the star icon (rotate + scale pulse, 3s infinite)
- Scroll transition: smooth 300ms
