# Drama Page (drama.md)

The Advanced Drama Space — a dual-mode page featuring a story plaza with novel-reader-style story cards and an immersive story chat interface. Users can browse story scenarios, unlock them, and then enter dedicated story sessions with their companion.

| Property | Value |
|----------|-------|
| Route | `/drama` |
| Sub-routes | `/drama` (plaza), `/drama/:id` (story session) |
| Sections | 2 modes (Plaza + Session) |
| Purpose | Immersive story scenarios and roleplay with AI companion |

---

## Mode A: Drama Plaza

### Overview
A browsing page for story scenarios displayed as rich cards in a grid. Each story has a cover image, title, synopsis, rating, and unlock condition. Novel-reader aesthetic with warm, literary styling.

### Page Layout

Standard app layout: sidebar + content area.

```
┌──────────────────────────────────────────────────────┐
│ Sidebar │        Drama Plaza Content                │
│ 220px   │                                           │
│         │  Top Bar: "剧情空间" + filter tabs        │
│         │                                           │
│         │  ┌─────────────────────────────────────┐ │
│         │  │ Featured Story (large banner card)  │ │
│         │  └─────────────────────────────────────┘ │
│         │                                           │
│         │  Tab: [全部] [已解锁] [热门] [新品]      │
│         │                                           │
│         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│         │  │Story │ │Story │ │Story │ │Story │   │
│         │  │Card  │ │Card  │ │Card  │ │Card  │   │
│         │  └──────┘ └──────┘ └──────┘ └──────┘   │
│         │                                           │
│         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│         │  │Story │ │Story │ │Story │ │Story │   │
│         │  │Card  │ │Card  │ │Card  │ │Card  │   │
│         │  └──────┘ └──────┘ └──────┘ └──────┘   │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
```

---

### Section 1: Top Bar

### Elements
- **Left**: "剧情空间" in `h2`, with `BookOpen` icon (20px, `pink-400`)
- **Right**: "已解锁 3/12" badge in `label` font, `pink-500`

### Animations
- Fade in, 300ms

---

### Section 2: Featured Story Banner

### Overview
A large, prominent banner card showcasing the featured/recommended story scenario at the top of the plaza.

### Layout
- Full content width, height ~240px
- Card: `radius-xl`, overflow hidden
- Horizontal layout: image left (~40%), text right (~60%)

### Elements

#### Image Area
- Cover image (`drama-cover-1.jpg`), object-fit cover, full height
- Gradient overlay: `linear-gradient(90deg, transparent 30%, rgba(26,16,37,0.85) 100%)`

#### Text Area (overlaid on right)
- **Badge**: "推荐剧情" pill, `accent-gradient`, white text
- **Title**: "樱花树下的约定" in `h1`, white
- **Synopsis**: "春天的一个傍晚，你和她在盛开的樱花树下相遇。风轻轻吹过，花瓣飘落在她的发间..." in `body`, white at 80%
- **Meta row**: `Star` icon + "4.9" rating + `Users` icon + "2.3k 体验" + `Lock` icon + "免费解锁"
- **CTA**: "开始体验" `primary` button, white bg, `pink-500` text

### Animations
- Entrance: slide up 30px + fade, 600ms
- Hover: image subtle `scale(1.03)` within container, 400ms

---

### Section 3: Filter Tabs

### Elements
- Horizontal tab group, centered
- Tabs: "全部" / "已解锁" / "热门" / "新品" / "浪漫" / "冒险" / "日常"
- Active: `primary` button style (pill)
- Inactive: `ghost` style
- Gap: 8px

### Animations
- Tabs: fade in 200ms after banner
- Switch: active indicator slides with spring, content cross-fades

---

### Section 4: Story Card Grid

### Overview
The main grid of story scenario cards. Rich, book-cover-inspired design.

### Layout
- CSS Grid: `repeat(auto-fill, minmax(240px, 1fr))`
- Gap: 24px

### Story Card Design

Each card:
- **Container**: `Card Component`, padding 0, overflow hidden, `radius-lg`
- **Aspect ratio**: ~3:4 portrait (book cover feel)

#### Cover Image Area (top ~70%)
- Story cover image, object-fit cover
- Gradient overlay at bottom: `linear-gradient(transparent 50%, rgba(26,16,37,0.8) 100%)`
- **Lock overlay** (if locked): semi-transparent dark overlay + `Lock` icon (32px, white) centered
- **Difficulty badge**: top-left corner, small pill, e.g., "简单" (green), "中等" (gold), "困难" (red)

#### Info Area (bottom ~30%)
- **Padding**: 16px
- **Title**: in `h4`, `text-primary`, 2-line clamp
- **Rating**: `Star` icon (12px, `gold`) + number, `body-sm`
- **Unlock condition**: in `body-sm` (11px), `text-muted`
  - "免费" (green) / "需50好感度" (gold) / "需100电量" (pink)
- **Tags**: 1-2 small pills, `pink-50` bg

#### Card Hover
- `translateY(-6px)` + `shadow-lg`, 200ms
- Cover image: `scale(1.06)`, 300ms
- If locked: overlay lightens slightly, "点击解锁" text appears

### Sample Story Data

| Title | Cover | Rating | Condition | Tags |
|-------|-------|--------|-----------|------|
| 樱花树下的约定 | `drama-cover-1.jpg` | 4.9 | 免费 | 浪漫, 春日 |
| 雨夜咖啡馆 | `drama-cover-2.jpg` | 4.7 | 已解锁 | 日常, 温馨 |
| 星空下的告白 | `drama-cover-3.jpg` | 4.8 | 需80好感度 | 浪漫, 夜晚 |
| 花园茶会 | `drama-cover-4.jpg` | 4.5 | 需60电量 | 优雅, 古典 |

### Animations
- **Grid entrance**: Cards stagger in, slide up 30px + fade, 60ms stagger, 400ms
- **Card hover**: As described
- **Filter change**: Outgoing cards fade 150ms, incoming stagger in

---

### Story Unlock Modal

When clicking a locked story:
- Modal overlay: `rgba(26,16,37,0.5)` + `backdrop-blur(4px)`
- Panel: white, `radius-xl`, max-width 420px, centered
- Content:
  - Cover image thumbnail (120px)
  - Title: "解锁 [故事名]?"
  - Description: brief synopsis
  - Cost display: e.g., "需要: 50 好感度" with `Heart` icon
  - "确认解锁" `primary` button + "取消" `ghost` button

### Animations
- Modal: scale 0.92→1 + fade, 300ms ease-bounce

---

## Mode B: Story Session

### Overview
When entering a story, the UI transforms into an immersive story chat interface. Similar to the main chat but with story-specific theming, progress tracking, and narrative elements.

### Page Layout

Full-screen immersive (no sidebar), similar to chat page but with story-specific chrome.

```
┌──────────────────────────────────────────────────────────┐
│ Story Top Bar (56px)                                     │
│ [Back] Story Title + Chapter    [Progress: 3/8] [Menu]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Story Chat Area (scrollable)                            │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │ 📖 章节 3: 樱花飘落                          │       │
│  │ 微风吹过，花瓣纷纷扬扬地落下...              │       │
│  │                                              │       │
│  │ [剧情描述气泡 — 特殊样式]                    │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│      ┌──────────────────────────────┐                   │
│      │ AI Companion Message         │                   │
│      │ 你看，花瓣落在你的肩膀上了...│                   │
│      └──────────────────────────────┘                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🎯 剧情选择                                     │   │
│  │ [轻轻帮她拂去花瓣] [抬头看樱花树] [握住她的手]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Input Bar (same as main chat)                            │
└──────────────────────────────────────────────────────────┘
```

---

### Section 1: Story Top Bar

### Elements
- **Left**: `ChevronLeft` back button + "剧情空间" label (links back to plaza)
- **Center**: Story title "樱花树下的约定" in `h4` + current chapter "· 第3章" in `body-sm`, `text-muted`
- **Right**: Progress "3/8" in `body-sm` + `Menu` icon dropdown

### Progress Indicator
- Thin horizontal bar below top bar (3px height)
- `accent-gradient` fill showing current progress
- Width: chapter / total, e.g., 3/8 = 37.5%

### Animations
- Progress bar: width animates on chapter change, 400ms

---

### Section 2: Story Chat Area

Same message system as main chat, but with additional elements:

#### Narrative Description Bubbles
- Special message type for story narration
- Background: `rgba(255,245,247,0.6)` + `backdrop-blur(4px)`
- Border: 1px dashed `pink-200`
- Border radius: `radius-lg` all corners
- Text: `body`, italic, `text-secondary`
- Book icon (`BookOpen`) at top-left corner, 12px, `pink-400`
- Max width: 85%
- Centered alignment

#### Chapter Dividers
- When a new chapter begins:
  - Centered decorative divider
  - Chapter number: "第三章" in `label`, `pink-500`
  - Chapter title: "樱花飘落" in `h3`
  - Decorative line above and below: 1px `pink-100`, 60px wide
  - Small sparkle animation on the divider

#### Story Choice Prompts
- At decision points, a special card appears:
  - Background: `card-gradient`, `radius-lg`, `shadow-md`
  - Title: "你的选择" in `h4`, with `GitFork` icon
  - 2-3 option buttons stacked vertically
  - Each option: full-width `ghost` button with text description
  - Hover: `pink-50` bg + border `pink-300`
  - Selected: `primary` button style, disabled others

### Animations
- Narrative bubbles: fade in + slight scale 0.98→1, 500ms
- Chapter divider: decorative elements stagger in, chapter title slides up + fades
- Choice card: slide up 20px + fade, 300ms
- Choice selection: selected button transitions to `primary`, others fade out 200ms, then chat continues

---

### Section 3: Story Completion

When a story is completed:
- A celebration overlay appears
- Confetti animation (pink and gold particles)
- "剧情完成!" in `h1`, centered
- Rewards: "+50 好感度" + "+20 电量" displayed with icons
- "返回广场" button
- Option to "重新体验" (restart)

### Animations
- Confetti: particles fall from top, 3s, various sizes and speeds
- Text: fade in + scale 0.9→1, 600ms, after confetti starts
- Rewards: stagger in from bottom, 100ms stagger
