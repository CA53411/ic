# Crowdfunding Page (crowdfunding.md)

The Platonic fundraising page where users can contribute to fund major feature development: Live2D avatar system, virtual pet system, and TTS (Text-to-Speech) voice synthesis. Features an inspiring hero, three funding plan cards with progress tracking, and a supporter contribution record.

| Property | Value |
|----------|-------|
| Route | `/crowdfunding` |
| Sections | 6 |
| Purpose | Community funding for major feature development |

---

## Page Layout

Full-width landing page (no sidebar). This is a public-facing page that can be accessed from within the app and shared externally.

```
┌──────────────────────────────────────────────────────────────┐
│ Floating Nav (transparent → solid on scroll)                 │
├──────────────────────────────────────────────────────────────┤
│ Hero Section (100vh)                                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Why Crowdfund Section                                        │
├──────────────────────────────────────────────────────────────┤
│ Three Funding Plan Cards                                     │
├──────────────────────────────────────────────────────────────┤
│ Overall Progress Section                                     │
├──────────────────────────────────────────────────────────────┤
│ Supporter Wall                                               │
├──────────────────────────────────────────────────────────────┤
│ CTA Footer                                                   │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Section 1: Floating Navigation

- Same as landing page nav but with "返回应用" (Back to App) link
- Position: fixed, full width
- Height: 56px
- Background: transparent → solid `rgba(255,245,247,0.9)` + `backdrop-blur(12px)` after 80px scroll
- Left: `logo.svg`
- Right: "关于" / "筹资计划" / "返回应用" (ghost button, links to `/dashboard`)

### Animations
- Scroll transition: 300ms
- Logo sparkle: 3s infinite

---

## Section 2: Hero — "一起创造未来"

### Overview
An inspiring full-viewport hero with the crowdfunding banner image, overlaid text, and a prominent total-funds-raised display.

### Layout
- Full viewport height (100vh)
- Background: `crowdfunding-hero.jpg` covering full area, with gradient overlay
- Gradient overlay: `linear-gradient(180deg, rgba(26,16,37,0.3) 0%, rgba(26,16,37,0.7) 100%)`
- Content: centered, max-width 800px

### Elements

#### Element: "Hero Label"
- "Platonic 筹资计划" pill badge, `accent-gradient`, white text
- Margin-bottom: 20px

#### Element: "Hero Title"
- Content: "一起创造有温度的AI陪伴"
- Font: `display` token, 48px, white
- Line-height: 1.15
- Text shadow: `0 2px 30px rgba(0,0,0,0.3)`

#### Element: "Hero Subtitle"
- Content: "你的每一分支持，都将让 Platonic 变得更加生动、温暖、真实。帮助我们实现 Live2D 形象、虚拟宠物和语音合成三大愿景。"
- Font: `body` 16px, white at 85%, max-width 560px, centered
- Margin-top: 16px

#### Element: "Total Raised Display"
- Large number: "¥47,280" in `number` token (52px), white, bold
- Label: "已筹集 / ¥100,000 目标" in `body`, white at 70%
- Progress bar below: 12px height, `radius-full`, white at 20% track, `accent-gradient` fill at 47%
- "187 位支持者" in `body-sm`, white at 60%, below bar
- Margin-top: 32px

#### Element: "Scroll Indicator"
- `ChevronDown` icon, white at 50%, 24px
- Gentle bounce animation at bottom-center (translateY 0→8px, 1.5s infinite)

### Animations
- **Background**: subtle `scale(1.05)` to `scale(1)` slow zoom on load, 10s
- **Label**: fade in, 400ms
- **Title**: slide up 40px + fade, 800ms, ease-smooth
- **Subtitle**: fade in 500ms, 400ms delay
- **Total raised**: Number counts up from 0, 2000ms. Progress bar fills 0→47%, 1500ms, 500ms delay.
- **Scroll indicator**: fades in last, gentle bounce starts after 2s

---

## Section 3: Why Crowdfund

### Overview
A brief, persuasive explanation of why Platonic needs community funding. Three benefit cards.

### Layout
- Padding: `3xl` (64px) vertical
- Background: white
- Content: max-width 1000px, centered

### Elements

#### Element: "Section Title"
- "为什么选择筹资？" in `h1`, centered

#### Element: "Description"
- "Platonic 相信，最好的AI陪伴需要最先进的交互技术。Live2D 让伴侣有了生动的表情，虚拟宠物增添了日常乐趣，TTS 语音让对话有了真实的温度。这些技术需要大量研发资源，而你的支持将加速这一切的到来。" in `body`, `text-secondary`, max-width 640px, centered

#### Element: "Benefit Cards" (3 in row)
- **Card 1: "社区驱动"** (`Users` icon, 36px, `pink-400`)
  - "由用户社区共同决定产品方向，确保每一个功能都是真正被需要的"
- **Card 2: "透明进度"** (`TrendingUp` icon, 36px, `rose-gold`)
  - "实时更新的开发进度和资金使用情况，每一笔支出都公开透明"
- **Card 3: "早鸟福利"** (`Gift` icon, 36px, `gold`)
  - "支持者将优先体验新功能，并获得专属标识和奖励"

- Card style: `Card Component`, padding 28px, icon in soft colored circle at top

### Animations
- Title: slide up 30px + fade, 600ms
- Description: fade in 400ms, 150ms delay
- Cards: stagger in, slide up 30px + fade, 100ms stagger

---

## Section 4: Funding Plan Cards

### Overview
Three large, detailed cards — one for each major feature being funded. Each card has a preview image, detailed description, funding progress, and a contribution CTA.

### Layout
- Padding: `3xl` vertical
- Background: `pink-50`
- Title: "三大筹资计划" in `h1`, centered, margin-bottom 40px
- 3 cards in a row on desktop (stack on mobile), gap 28px, max-width 1200px

### Plan Card Design

Each card is a rich, tall card:
- **Container**: `Card Component`, padding 0, overflow hidden
- **Width**: Equal thirds, ~360px each
- **Height**: ~560px
- **Border radius**: `radius-xl` (24px)

#### Card Header — Preview Image (top 35%)
- Preview image: `live2d-preview.jpg` / `pet-preview.jpg` / `tts-preview.jpg`
- Object-fit: cover, full width, 200px height
- Gradient overlay at bottom: `linear-gradient(transparent, white)`

#### Card Body (bottom 65%)
- **Padding**: 24px

**Plan Title & Description:**
- Title: e.g., "Live2D 形象系统" in `h2`
- Description: detailed paragraph about the feature
  - Live2D: "让你的AI伴侣拥有生动的2D动画形象。她会眨眼、微笑、害羞，每一个表情都栩栩如生。支持自定义外观和多种服装。"
  - Pet: "一只可爱的虚拟宠物将陪伴在你们身边。它会成长、互动、表达情绪，成为你们共同的家人。"
  - TTS: "先进的语音合成技术，让你的伴侣拥有独特而自然的声线。甜美、成熟、清亮——选择你喜欢的声音。"

**Feature List:**
- 3-4 bullet points with `Check` icons
- Font: `body-sm`, `text-secondary`
- Each item: green `Check` (16px) + feature description

**Funding Progress:**
- "已筹集: ¥18,500 / ¥35,000" in `body-sm`
- Progress bar: 8px, `pink-50` track, plan-specific color fill
- "53%" percentage in `number-sm`, right-aligned
- "120 位支持者" in `body-sm`, `text-muted`

**Contribute Button:**
- Full-width `primary` button: "支持此计划"
- Below: "或自定义金额 ¥__" input field, compact

### Plan-Specific Colors
| Plan | Accent Color | Progress Fill |
|------|-------------|---------------|
| Live2D | `pink-400` | `accent-gradient` |
| Pet | `rose-gold` | `rose-gold` gradient |
| TTS | `purple-memory` | `purple-memory` gradient |

### Individual Plan Data

**Plan 1: Live2D 形象系统**
- Preview: `live2d-preview.jpg`
- Goal: ¥35,000
- Raised: ¥18,500
- Supporters: 120
- Features: 生动的表情动画 / 自定义外观 / 多种情绪状态 / 服装系统

**Plan 2: 虚拟宠物系统**
- Preview: `pet-preview.jpg`
- Goal: ¥25,000
- Raised: ¥15,200
- Supporters: 85
- Features: 宠物成长系统 / 互动玩法 / 情绪表达 / 个性化外观

**Plan 3: TTS 语音合成**
- Preview: `tts-preview.jpg`
- Goal: ¥40,000
- Raised: ¥13,580
- Supporters: 72
- Features: 自然语音合成 / 多声线选择 / 情感语调 / 低延迟响应

### Animations
- **Cards entrance**: Stagger in, slide up 40px + fade, 150ms stagger, 600ms, trigger at 15% viewport
- **Progress bars**: Width 0→target%, 1200ms, ease-smooth, triggered when card enters viewport
- **Card hover**: `translateY(-6px)` + `shadow-lg`, 200ms
- **Preview images**: subtle `scale(1.03)` on hover within container

---

## Section 5: Overall Progress

### Overview
A combined progress view showing all three plans together with a visual summary.

### Layout
- Padding: `2xl` vertical
- Background: white
- Content: max-width 800px, centered

### Elements

#### Element: "Section Title"
- "总体进度" in `h1`, centered

#### Element: "Combined Progress Bars"
Three horizontal progress items stacked vertically:

Each item:
- Plan name (left): in `body`, `text-primary`, width 100px
- Progress bar (center): flex-1, 10px height
- Amount (right): "¥X / ¥Y" in `body-sm`, `text-muted`

- Live2D: 53% fill, `accent-gradient`
- Pet: 61% fill, `rose-gold`
- TTS: 34% fill, `purple-memory`

#### Element: "Milestone Markers"
- Below progress bars: milestone dots on a timeline
- Milestones at 25%, 50%, 75%, 100%
- Completed milestones: filled dot + label
- Future: empty dot + muted label

#### Element: "Time Estimate"
- "预计完成时间: 2025年6月" in `body`, `text-secondary`, centered
- Based on current funding velocity

### Animations
- Progress bars: width 0→target%, 1500ms, ease-smooth, staggered 200ms each
- Milestones: dots pop in (scale 0→1), 200ms, after corresponding bar reaches them

---

## Section 6: Supporter Wall

### Overview
A wall of gratitude showing recent supporters. Creates social proof and community feeling.

### Layout
- Padding: `2xl` vertical
- Background: `pink-50`
- Content: max-width 1000px, centered

### Elements

#### Element: "Section Title"
- "感谢每一位支持者" in `h1`, centered
- Subtitle: "因为有你们，Platonic 才能不断成长" in `body`, `text-secondary`

#### Element: "Supporter Grid"
- Grid of supporter name cards
- CSS Grid: `repeat(auto-fill, minmax(140px, 1fr))`
- Gap: 12px

Each supporter card:
- Background: white, `radius-md`, padding 10px 14px
- Content: supporter name (anonymized/partial): "张**", "Li***", etc.
- Amount: "¥50" in `body-sm`, `pink-500`
- Time: "2小时前" in `body-sm` (11px), `text-muted`

#### Element: "View More"
- "查看全部 187 位支持者" link, centered below grid
- `pink-500`, `body-sm`

### Animations
- Cards: stagger in, fade + scale 0.95→1, 30ms stagger (very fast for dense grid), 300ms
- Grid scroll: cards at bottom continue to stagger in as user scrolls

---

## Section 7: CTA Footer

### Layout
- Padding: `3xl` vertical
- Background: `accent-gradient`
- Centered content, white text

### Elements

#### Element: "CTA Text"
- "成为 Platonic 成长的一部分" in `h1`, white
- "每一份支持，都在为这个世界增添一点温暖" in `body`, white at 80%

#### Element: "CTA Button"
- "立即支持" — large white pill button, `pink-500` text, padding 16px 48px
- Hover: `scale(1.05)` + glow, 150ms

#### Element: "Share"
- "或分享给你的朋友" in `body-sm`, white at 60%
- Share buttons: 3 icon buttons (link copy, Twitter, WeChat placeholder)

### Animations
- Title: slide up 30px + fade, 600ms
- Button: scale 0.95→1 + fade, 400ms, 200ms delay

---

## Footer (Shared)

Same footer as landing page (see `home.md`):
- Background: `sidebar-bg`
- 4-column layout, `sidebar-text` color
- Logo, product links, resources, social
- Copyright bar at bottom
