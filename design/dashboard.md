# Dashboard Page (dashboard.md)

The main console and home screen of the Platonic AI app. A rich, information-dense dashboard with the Big Five personality radar chart, milestone progress, energy balance, mood chart, and quick-action buttons. The right side features a phone-size preview panel with Live2D and pet placeholders.

| Property | Value |
|----------|-------|
| Route | `/dashboard` |
| Sections | 6 content areas |
| Purpose | Main hub — overview of companion status, personality, progress, and quick actions |

---

## Page Layout

Standard app layout with sidebar navigation + content area + preview panel.

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │        Main Content Area         │ Preview Panel  │
│ 220px   │        flex-1                    │ 320px          │
│         │                                  │                │
│ Logo    │  ┌────────────────────────────┐  │ ┌────────────┐ │
│ Nav     │  │ Top Bar (56px)             │  │ │ Live2D     │ │
│ Items   │  └────────────────────────────┘  │ │ (phone     │ │
│         │                                  │ │  preview)  │ │
│ User    │  ┌──────────┐  ┌──────────────┐  │ │            │ │
│ Profile │  │ Big Five │  │ Milestone    │  │ │  ~55%      │ │
│         │  │ Radar    │  │ Progress     │  │ │  height    │ │
│         │  │ Chart    │  │ Card         │  │ └────────────┘ │
│         │  │          │  │              │  │ ┌────────────┐ │
│         │  └──────────┘  └──────────────┘  │ │ Pet        │ │
│         │                                  │ │ (phone     │ │
│         │  ┌──────────┐  ┌──────────────┐  │ │  preview)  │ │
│         │  │ Energy   │  │ 24h Mood     │  │ │            │ │
│         │  │ Balance  │  │ Mini Chart   │  │ │  ~45%      │ │
│         │  │ Card     │  │              │  │ │  height    │ │
│         │  └──────────┘  └──────────────┘  │ └────────────┘ │
│         │                                  │                │
│         │  ┌──────────────────────────────┐│                │
│         │  │ Quick Action Buttons         ││                │
│         │  └──────────────────────────────┘│                │
│         │                                  │                │
└─────────┴──────────────────────────────────┴────────────────┘
```

- **Sidebar**: Fixed 220px, full height, `sidebar-bg`
- **Top Bar**: 56px, within main content area
- **Main Content**: flex-1, padding 24px, scrollable
- **Preview Panel**: Fixed 320px, full height, `pink-50` background, border-left 1px `pink-100`
- **Gap between cards**: 20px
- **Content max-width**: None (fills available space)

---

## Section 1: Top Bar

### Elements
- **Left**: "控制台" page title in `h2` token
- **Right**: 
  - Notification bell icon (`Bell`), 20px, `text-secondary`, with small red dot (8px) when unread
  - User avatar (32px circle) + dropdown chevron

### Animations
- Title fade in from left, 300ms
- Right icons fade in from right, 100ms delay

---

## Section 2: Big Five Radar Chart (Large Card)

### Overview
The centerpiece of the dashboard. A large, interactive SVG pentagon radar chart showing the companion's Big Five personality dimensions. This is the largest card and demands visual attention.

### Layout
- Card spans ~55% of main content width (left column)
- Height: ~420px
- Card: `Card Component` with padding 28px

### Elements

#### Element: "Card Header"
- Title: "人格画像" in `h3`, with `Sparkles` icon (16px, `pink-400`)
- Right: companion name "小樱" in `body-sm`, `pink-500`, with small avatar (24px)
- Subtitle: "基于 Big Five 人格模型" in `body-sm`, `text-muted`

#### Element: "Radar Chart" (SVG)
- Size: ~320px × 320px, centered in card
- Pentagon shape with 5 axes:
  - Top: 开放性 (Openness) — 78/100
  - Top-right: 尽责性 (Conscientiousness) — 62/100
  - Bottom-right: 外向性 (Extraversion) — 85/100
  - Bottom-left: 宜人性 (Agreeableness) — 91/100
  - Top-left: 神经质 (Neuroticism) — 45/100
- Grid lines: 5 concentric pentagons (20%, 40%, 60%, 80%, 100%), 1px `pink-100`
- Axis lines: 1px `pink-100`, extending from center to vertex
- Data polygon: filled with `pink-200` at 25% opacity, stroke `pink-400` at 2.5px with rounded joins
- Data points: 8px circles at each vertex, `pink-400` fill, white 2px border
- Labels: positioned outside each vertex, `label` font (12px), `text-secondary`
- Score numbers: inside each axis segment near the data point, `number-sm` font, `pink-500`
- Center dot: 4px, `pink-300`

#### Element: "Trait Legend" (below chart)
- Horizontal row of 5 mini indicators
- Each: 4px × 24px colored bar (gradient from `pink-200` to `pink-400`) + trait name in `body-sm`
- Colors vary slightly per trait for visual distinction

#### Element: "Personality Summary"
- Below legend: one-line description
- Content: "小樱是一位开朗、友善且富有创造力的伴侣。她热情外向，善于倾听，总能带给你温暖与欢乐。" in `body-sm`, `text-secondary`, italic
- Border-left: 3px `rose-gold`, padding-left 12px

### Animations
- **Card entrance**: Slide up 30px + fade in, 500ms
- **Radar chart**: Grid lines fade in first (300ms), then data polygon animates — vertices grow from center outward to their positions, 1200ms, ease-smooth, staggered 100ms per vertex
- **Data points**: Pop in (scale 0→1 with bounce) 200ms after their vertex reaches position
- **Score numbers**: Count up from 0 to actual value, 800ms, synced with vertex animation
- **Hover on data point**: Tooltip appears showing trait name + score + brief description, 150ms fade

---

## Section 3: Milestone Progress Card

### Overview
Displays the 5-stage relationship milestone progression. Shows current stage, progress to next, and a visual stage indicator.

### Layout
- Right column, same height as radar chart card
- Card: `Card Component`, padding 28px

### Elements

#### Element: "Card Header"
- Title: "好感度旅程" in `h3`, with `Heart` icon (16px, `rose-gold`)
- Current stage badge: "阶段 3/5" pill badge, `gold` variant

#### Element: "Current Stage"
- Stage name: "默契相伴" in `h2`, `text-primary`
- Stage subtitle: "Silent Understanding" in `body-sm`, `text-muted`, italic
- Description: "你们开始产生默契。不需要太多言语，她就能理解你的情绪波动。" in `body-sm`, `text-secondary`
- Margin-top: 16px

#### Element: "Progress Bar"
- Large progress bar: height 12px, `radius-full`
- Track: `pink-50` background
- Fill: `accent-gradient`, width 55% (current progress)
- Above bar: "55% — 距离下一阶段还需 45 点好感度" in `body-sm`, `text-secondary`
- Animation: fill width animates from 0→55% on load, 1000ms, ease-smooth

#### Element: "Stage Timeline" (vertical mini)
- 5 small horizontal stage indicators stacked vertically
- Each: stage number circle (24px) + stage name in `body-sm`
- Completed stages (1-2): `gold` circle with `Check` icon
- Current stage (3): `pink-400` circle, pulsing ring animation (2s infinite)
- Future stages (4-5): `pink-100` circle, gray text
- Connecting vertical line: 2px, `pink-100`, behind the circles

#### Element: "Recent Milestone"
- Bottom of card: "最近达成：渐生情愫 — 2024.12.15" in `label` font, `gold` color
- Small trophy icon (`Star`) beside it

### Animations
- **Card entrance**: Slide up 30px + fade in, 500ms, 100ms delay after radar
- **Progress bar**: Width 0→55%, 1200ms, ease-smooth, 300ms after card visible
- **Stage circles**: Stagger scale-in, 80ms stagger, completed ones first
- **Current stage pulse**: Starts after all elements loaded, subtle `shadow-glow` ring pulse 2s infinite

---

## Section 4: Energy Balance Card

### Overview
Shows the user's current "energy" (电量) balance — the in-app currency for conversations and features. Prominent, visually striking display.

### Layout
- Left column, below radar card
- Width: ~55% (same as radar card)
- Card: `Card Component`, padding 24px

### Elements

#### Element: "Card Header"
- Title: "电量余额" in `h3`, with `Zap` icon (16px, `gold`)
- Help tooltip: small `?` circle, hover shows "电量用于与伴侣对话和解锁功能"

#### Element: "Balance Display"
- Large number: "1,280" in `number` token (42px), `text-primary`
- Unit: "⚡" (bolt icon) beside number, `gold` color, 24px
- Label: "剩余电量" in `body-sm`, `text-muted`
- Number has subtle counting animation on load (counts up from 0)

#### Element: "Usage Bar"
- Thin horizontal bar showing usage rate
- "今日已用 45%" label above
- Bar: 4px height, `pink-50` track, `accent-gradient` fill at 45%

#### Element: "Quick Recharge Button"
- "立即充值" — small `primary` button, compact size
- Links to `/payment` page
- Margin-top: 12px

### Animations
- **Card entrance**: Slide up 30px + fade, 500ms
- **Balance number**: Counts up from 0 to 1280, 1500ms, ease-smooth
- **Usage bar**: Width 0→45%, 800ms, 400ms delay
- **Button**: Fade in 300ms after number completes

---

## Section 5: 24-Hour Mood Mini Chart

### Overview
A small line/sparkline chart showing the companion's emotional fluctuation over the past 24 hours. Cute, compact, and informative.

### Layout
- Right column, below milestone card
- Same width as milestone card
- Card: `Card Component`, padding 24px

### Elements

#### Element: "Card Header"
- Title: "情绪波动" in `h3`, with `TrendingUp` icon (16px, `pink-400`)
- Current mood indicator: small dot + "开心 😊" in `body-sm`

#### Element: "Sparkline Chart" (SVG/Canvas)
- Size: fills card width, ~140px height
- Area chart with smooth curves
- Y-axis: 5 emotion levels (悲伤, 平静, 开心, 兴奋, 狂喜) — labels on left, `body-sm`, `text-muted`
- X-axis: time labels (00:00, 06:00, 12:00, 18:00, 24:00) — bottom, `body-sm`, `text-muted`
- Line: 2px `pink-400`, smooth curve (Catmull-Rom or cubic bezier)
- Area fill: `pink-100` at 40% opacity below the line
- Data points: small 4px circles at each hour mark, `pink-400`
- Current time marker: vertical dashed line at current hour, `rose-gold`, 1px
- Grid: faint horizontal lines at each level, 1px `pink-50`

#### Element: "Mood Summary"
- "平均心情：开心" in `body-sm`, `text-secondary`
- "最高：兴奋 (14:00)" and "最低：平静 (03:00)" in `body-sm`, `text-muted`

### Animations
- **Card entrance**: Slide up 30px + fade, 500ms, 100ms delay
- **Chart line**: SVG path draw animation (stroke-dashoffset), left to right, 1500ms
- **Area fill**: Fades in 300ms after line completes
- **Data points**: Pop in (scale 0→1), staggered 30ms each along the line

---

## Section 6: Quick Action Buttons

### Overview
Two prominent CTA buttons at the bottom of the dashboard for the two main actions: browse the plaza or create a companion.

### Layout
- Full width of main content, below the two card rows
- Horizontal layout: two equal-width buttons side by side, gap 20px

### Elements

#### Element: "Plaza Button"
- Large card-style button
- Background: `card-gradient`, border 1px `pink-100`, radius `radius-lg`
- Content:
  - Icon: `Users` in `pink-400`, 32px, inside 56px soft pink circle
  - Title: "去广场认识伴侣" in `h3`
  - Description: "浏览各种性格的AI伴侣，找到最懂你的那个" in `body-sm`, `text-secondary`
  - Arrow: `ChevronRight` icon, `pink-400`
- Hover: `shadow-lg` + `translateY(-2px)` + icon circle bg darkens slightly, 200ms
- Links to `/plaza`

#### Element: "Create Button"
- Large card-style button
- Background: `accent-gradient`, border none, radius `radius-lg`
- Content:
  - Icon: `Plus` in white, 32px, inside 56px white/transparent circle
  - Title: "创建个人伴侣" in `h3`, white
  - Description: "从零开始定制专属伴侣，定义她的性格与故事" in `body-sm`, white at 80%
  - Arrow: `ChevronRight` icon, white
- Hover: brightness(1.08) + `shadow-glow` intensified, 150ms
- Links to `/customize`

### Animations
- **Container**: Slide up 20px + fade, 500ms
- **Buttons**: Stagger 100ms between the two
- **Hover effects**: As described above, with slight icon `scale(1.05)`

---

## Preview Panel (Right Sidebar)

### Overview
A fixed-width panel on the right side showing phone-size previews of the Live2D companion and virtual pet. This is a persistent panel across app pages.

### Layout
- Width: 320px, full viewport height
- Background: `pink-50`
- Border-left: 1px `pink-100`
- Padding: 20px
- Two stacked sections

### Section A: Live2D Preview

#### Container
- Phone-shaped frame: 280px × 420px, centered
- Border: 12px solid `sidebar-bg`, radius 32px (phone bezel look)
- Inner screen: white bg with `breathing-gradient` subtle
- Shadow: `shadow-lg`

#### Content
- **Live2D Placeholder**: Since Live2D isn't built yet, show:
  - Soft pink gradient background
  - Companion avatar (`companion-1.jpg`) centered, 160px, rounded 16px
  - Subtle floating animation (translateY ±5px, 3s infinite)
  - Name tag below: "小樱" in `h4`, with small heart pulse icon
  - Status: "在线 💚" in `body-sm`, `text-muted`
  - Decorative: small sparkle particles floating around avatar (3-4 dots, slow float)

#### Status Bar (phone-style)
- Top of inner screen: time + battery icon mockup, `body-sm`, `text-muted`

### Section B: Pet Preview

#### Container
- Same phone frame style, below LiveD with 16px gap
- Height: ~280px

#### Content
- **Pet Placeholder**: 
  - Soft warm background gradient
  - Cute virtual pet illustration (placeholder circle with paw icon)
  - Pet name: "小咪" in `h4`
  - Status bar: Hunger/Energy/Mood — 3 mini horizontal bars
  - Each bar: 4px height, labeled with emoji (🍖/⚡/😊)

### Animations
- **Panel entrance**: Slide in from right 30px + fade, 500ms, 300ms delay
- **Phone frames**: Scale 0.95→1 + fade, 400ms, 200ms stagger between the two
- **Avatar float**: Continuous gentle float, 3s infinite ease-in-out
- **Sparkles**: Continuous slow float, staggered delays
