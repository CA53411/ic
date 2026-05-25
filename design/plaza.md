# Plaza Page (plaza.md)

The companion browsing plaza. A warm, inviting grid of AI companion cards where users can browse, filter, and select companions to meet. Each card presents a companion's avatar, name, brief introduction, and personality tags.

| Property | Value |
|----------|-------|
| Route | `/plaza` |
| Sections | 4 |
| Purpose | Browse and discover AI companions |

---

## Page Layout

Standard app layout: sidebar + full-width content area (no preview panel on this page to maximize browsing space).

```
┌──────────────────────────────────────────────────────┐
│ Sidebar │            Plaza Content                  │
│ 220px   │            full-width                     │
│         │                                           │
│ Logo    │  Top Bar: "伴侣广场" + filter/search      │
│ Nav     │                                           │
│ Items   │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│         │  │Card│ │Card│ │Card│ │Card│ │Card│    │
│ User    │  └────┘ └────┘ └────┘ └────┘ └────┘    │
│ Profile │                                           │
│         │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│         │  │Card│ │Card│ │Card│ │Card│ │Card│    │
│         │  └────┘ └────┘ └────┘ └────┘ └────┘    │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ Pagination / Load More           │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
```

---

## Section 1: Top Bar

### Elements
- **Left**: Page title "伴侣广场" in `h2`, with subtitle "发现属于你的灵魂伴侣" in `body-sm`, `text-secondary`
- **Right**:
  - Search input: compact, 220px wide, `Search` icon, placeholder "搜索伴侣名称..."
  - Filter button: "筛选" with `SlidersHorizontal` icon, opens filter drawer
  - Sort dropdown: "排序" with `ChevronDown`, options: 推荐/最新/热门

### Filter Drawer (Modal)
- Slides from right, 360px wide
- **Header**: "筛选伴侣" in `h3`, close `X` button
- **Filters**:
  - 性格类型: checkbox group — 开朗/温柔/冷静/活泼/神秘/知性
  - 声线偏好: radio — 甜美/成熟/清亮/低沉
  - 话题偏好: tag multi-select — 日常/文学/游戏/哲学/情感/旅行
- **Footer**: "重置" ghost button + "应用" primary button

### Animations
- Title: fade in from left, 300ms
- Search/filter: fade in from right, 100ms delay
- Filter drawer: slide from right 400ms, overlay fade 200ms

---

## Section 2: Companion Grid

### Overview
The main grid of companion cards. Responsive grid layout with elegant hover effects revealing more information.

### Layout
- CSS Grid: `repeat(auto-fill, minmax(260px, 1fr))`
- Gap: 24px
- Padding: 24px content area

### Companion Card Design

Each card is a rich, interactive element:

#### Card Structure
- **Container**: `Card Component`, padding 0 (image bleeds to edge), overflow hidden
- **Border radius**: `radius-lg` (16px)
- **Aspect ratio**: Portrait ~3:4 overall (image top ~65%, content bottom ~35%)

#### Image Area (top 65%)
- Companion portrait image (e.g., `companion-1.jpg` through `companion-6.jpg`)
- Object-fit: cover, full width
- Gradient overlay at bottom: `linear-gradient(transparent 40%, rgba(26,16,37,0.7) 100%)`
- **Online indicator**: 10px green dot, absolute, top-right, 12px from edges, with white 2px border

#### Hover Overlay (on image)
- Semi-transparent overlay: `rgba(26,16,37,0.6)` with `backdrop-blur(2px)`
- Center: "查看详情" button, ghost style (white border, white text), `radius-full`
- Below button: brief personality quote in white italic, `body-sm`
- Fade in 200ms on hover

#### Content Area (bottom 35%)
- **Padding**: 16px
- **Name Row**: Companion name in `h3` (e.g., "小樱") + small verified badge (`CheckCircle`, `pink-400`, 16px)
- **Description**: One-line intro in `body-sm`, `text-secondary`, 2-line clamp
  - Example: "开朗活泼的邻家女孩，喜欢樱花和甜点，总能带给你阳光般的笑容"
- **Tags Row**: 2-3 personality tags as `Badge` pills
  - Tags: e.g., "开朗", "甜食控", "户外" — `pink-50` bg, `pink-500` text
- **Stats Row** (bottom): 
  - `Heart` icon + "12.5k 喜爱" in `body-sm`, `text-muted`
  - `MessageCircle` icon + "8.2k 对话" in `body-sm`, `text-muted`

#### Card Hover (Full Card)
- `translateY(-6px)` + `shadow-lg`
- Image: subtle `scale(1.04)` within container (overflow hidden crops), 300ms
- 200ms transition

### Sample Companion Data

| Name | Avatar | Description | Tags | Likes | Chats |
|------|--------|-------------|------|-------|-------|
| 小樱 | `companion-1.jpg` | 开朗活泼的邻家女孩，喜欢樱花和甜点，总能带给你阳光般的笑容 | 开朗, 甜食控, 户外 | 12.5k | 8.2k |
| 凌霜 | `companion-2.jpg` | 冷静理性的职场精英，热爱文学与哲学，适合深度对话 | 知性, 冷静, 文学 | 9.8k | 6.5k |
| 银月 | `companion-3.jpg` | 害羞内敛的图书管理员，拥有丰富的知识和温柔的内心 | 害羞, 知性, 温柔 | 8.3k | 7.1k |
| 炎夏 | `companion-4.jpg` | 元气满满的运动少女，活力四射，和她在一起永远不会无聊 | 活泼, 运动, 直率 | 11.2k | 9.3k |
| 紫鸢 | `companion-5.jpg` | 神秘优雅的古典美人，喜欢茶道与花艺，话少但每一句都有深意 | 神秘, 优雅, 艺术 | 7.6k | 5.4k |
| 晴空 | `companion-6.jpg` | 天真烂漫的花店女孩，对世界充满好奇，像小太阳一样温暖 | 天真, 温暖, 好奇 | 10.1k | 7.8k |

### Animations
- **Grid entrance**: Cards stagger in, each card slides up 30px + fades in, 60ms stagger between cards, 400ms duration, trigger at 10% viewport
- **Card hover**: As described above
- **Filter application**: Grid cross-fades (outgoing fades 150ms, incoming staggers in as above)

---

## Section 3: Companion Detail Modal

### Overview
When a user clicks "查看详情" on a card, a detailed modal opens showing full companion information with an option to "meet" them.

### Layout
- Modal overlay: `rgba(26,16,37,0.5)` + `backdrop-blur(4px)`
- Modal panel: max-width 560px, centered, `radius-xl`, white bg, `shadow-lg`
- Two-column layout inside: left ~40% image, right ~60% info

### Elements

#### Left Column — Image
- Large companion portrait, full height of modal, `radius-xl` left corners
- Gradient overlay: subtle darkening at bottom for text legibility

#### Right Column — Info
- **Name**: in `h1`, `text-primary`
- **Personality Badge**: e.g., "ENFP" or "开朗型" pill badge
- **Full Description**: 2-3 sentences in `body`, `text-secondary`
- **Personality Tags**: row of 4-5 tags as `Badge` pills
- **Big Five Mini**: 5 small horizontal bars showing rough personality dimensions, 4px height each, `rose-gold` fill
- **Stats Row**: 喜爱数 / 对话数 / 在线时长
- **Action Buttons** (bottom):
  - "认识她" — `primary` button, full width
  - "再看看" — `ghost` button, below

### Animations
- **Modal open**: Overlay fades in 200ms, panel scales 0.93→1 + fades in 300ms, ease-bounce
- **Modal close**: Reverse, 200ms
- **Content**: Stagger fade in 80ms per element after modal opens

---

## Section 4: Pagination / Load More

### Elements
- Centered below grid
- "加载更多" button: `secondary` variant, `ChevronDown` icon
- After all loaded: "已展示全部伴侣" in `body-sm`, `text-muted`

### Animations
- Button: fade in 300ms
- Loading state: spinner replaces text
- New cards: stagger in as grid entrance animation
