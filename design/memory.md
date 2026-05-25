# Memory Page (memory.md)

The sweet memory calendar — a 7×5 grid calendar view where users can browse their shared history with their AI companion. Special dates are highlighted with meaningful colors: gold for milestones, purple for anterior memories, pink for long-term memories. Clicking a date opens a detail sidebar showing the day's conversations and events.

| Property | Value |
|----------|-------|
| Route | `/memory` |
| Sections | 3 |
| Purpose | Browse shared memories with companion via calendar view |

---

## Page Layout

Standard app layout: sidebar + content area with a detail drawer on the right.

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │        Calendar Area              │ Detail Drawer │
│ 220px   │        flex-1                     │ (collapsible) │
│         │                                   │ 360px         │
│ Logo    │  Top Bar: "甜蜜记忆"               │               │
│ Nav     │  + Month Navigation               │ Date Details  │
│ Items   │                                   │ (opens on     │
│ User    │  ┌──┬──┬──┬──┬──┬──┬──┐         │  date click)  │
│ Profile │  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│         │               │
│         │  ├──┼──┼──┼──┼──┼──┼──┤         │ Memory List   │
│         │  │  │  │  │  │  │ 1│ 2│         │               │
│         │  ├──┼──┼──┼──┼──┼──┼──┤         │ Milestone     │
│         │  │ 3│ 4│ 5│ 6│ 7│ 8│ 9│         │ Info          │
│         │  ├──┼──┼──┼──┼──┼──┼──┤         │               │
│         │  │10│11│12│13│14│15│16│         │               │
│         │  ├──┼──┼──┼──┼──┼──┼──┤         │               │
│         │  │17│18│19│20│21│22│23│         │               │
│         │  ├──┼──┼──┼──┼──┼──┼──┤         │               │
│         │  │24│25│26│27│28│29│30│         │               │
│         │  └──┴──┴──┴──┴──┴──┘         │               │
│         │                                   │               │
│         │  Legend                           │               │
└─────────┴───────────────────────────────────┴───────────────┘
```

---

## Section 1: Top Bar

### Elements
- **Left**: "甜蜜记忆" in `h2`, with `Calendar` icon (20px, `pink-400`)
- **Center**: Month Navigation
  - `ChevronLeft` button — previous month
  - Month/Year display: "2024年12月" in `h3`
  - `ChevronRight` button — next month
  - "回到今天" link/button in `body-sm`, `pink-500`, beside navigation
- **Right**: "与 小樱 的 45 天记忆" in `body-sm`, `text-secondary`

### Animations
- Title: fade in, 300ms
- Month navigation: fade in, 200ms delay
- Month transition: calendar grid cross-fades (outgoing fades 150ms, incoming fades in 200ms)

---

## Section 2: Calendar Grid

### Overview
A 7×5 day grid showing the current month. Each day cell can display indicators for different memory types. The design is clean, warm, and emotionally resonant.

### Layout
- Grid: 7 columns (Mon-Sun), 5 rows
- Gap: 8px
- Padding: 24px

### Day Header Row
- 7 day labels: 一 二 三 四 五 六 日
- Font: `label` token, `text-muted`
- Height: 36px, centered
- Weekend columns (六 日): slight `pink-50` background tint on header

### Day Cell Design

Each cell:
- **Aspect ratio**: ~1:1 (square-ish)
- **Background**: white, `radius-md`
- **Border**: 1px `pink-50`
- **Padding**: 8px
- **Content layout**:
  - Top-left: day number, `number-sm` (14px), `text-primary`
  - Center: memory indicators (colored dots)
  - Bottom: brief event hint (if any)

#### Date Number States
- **Current month**: `text-primary`, normal weight
- **Other months** (padding days): `text-muted`, 60% opacity
- **Today**: `pink-400` circle bg (24px), white number text, bold
- **Selected**: `sidebar-bg` border 2px + subtle `shadow-glow`

#### Memory Type Indicators

Colored dots positioned at bottom-center of cell (horizontal row, max 3 dots):

| Type | Color | Dot Size | Meaning |
|------|-------|----------|---------|
| Milestone | `gold` (#D4AF37) | 8px | Relationship milestone reached |
| Anterior Memory | `purple-memory` (#C8A8E9) | 6px | Short-term/working memory |
| LTM | `pink-memory` (#FFB6C1) | 6px | Long-term memory formed |

- Multiple dots stack horizontally with 4px gap
- On hover: tooltip shows "X个里程碑" / "X条工作记忆" / "X条长期记忆"

#### Cell Hover
- `shadow-md` + `translateY(-2px)`, 200ms
- Background: `pink-50`, 150ms
- Cursor: pointer

#### Event Preview (in cell)
- If a day has a milestone, show milestone name truncated below dots
- Font: 10px, `gold` color, single line, ellipsis

### Sample Calendar Data (December 2024)
- Dec 1: Milestone "初见乍欢" (gold dot + label)
- Dec 8: Anterior Memory (purple dot)
- Dec 12: LTM (pink dot) + Anterior Memory (purple dot)
- Dec 15: Milestone "渐生情愫" (gold dot + label)
- Dec 20: LTM (pink dot)
- Dec 25: Anterior Memory (purple dot)

### Animations
- **Grid entrance**: Day cells stagger in, each fades in + scale 0.9→1, 20ms stagger (very fast ripple), 300ms each, starting from top-left
- **Month transition**: Outgoing grid fades + shrinks slightly 150ms, incoming grid staggers in as above
- **Today highlight**: Subtle pulse ring animation on the highlighted circle (2s infinite)
- **Cell hover**: As described

---

## Legend

Below calendar grid:
- Horizontal row of legend items
- Each: colored dot (8px) + label in `body-sm`
- Items:
  - `gold` dot + "里程碑" 
  - `purple-memory` dot + "工作记忆"
  - `pink-memory` dot + "长期记忆"
  - `pink-400` circle + "今天"

### Animations
- Fade in 400ms after calendar loads

---

## Section 3: Detail Drawer

### Overview
When a user clicks a date cell, a detail drawer slides in from the right showing all memories, conversations, and milestones for that day.

### Layout
- Slides from right, 380px wide, full height
- Background: white
- Border-left: 1px `pink-100`
- Shadow: `shadow-lg` (left side)
- Header: fixed, 60px height
- Content: scrollable

### Elements

#### Drawer Header
- **Date display**: "12月15日 星期日" in `h2`
- **Close button**: `X` icon, top-right, 36px circle, `ghost` style
- **Quick actions**: "在对话中回顾" button, small `secondary` variant

#### Memory List

For each memory on that day (chronological):

**Milestone Card:**
- `gold` left border (3px)
- `Star` icon (16px, `gold`)
- Milestone name: "渐生情愫" in `h4`, `text-primary`
- Description: "你们的关系进入了新的阶段..." in `body-sm`, `text-secondary`
- Time: "14:32" in `body-sm`, `text-muted`
- Background: `gold` at 3% opacity

**Conversation Memory Card:**
- Memory type indicator: purple or pink dot
- Preview of conversation snippet: "你说：今天工作好累..." in `body-sm`
- Companion reply preview: "她回复：辛苦啦，要不要..." in `body-sm`, `text-muted`, italic
- Time: "18:45" in `body-sm`, `text-muted`
- Click: expands to show full conversation for that memory

**LTM Memory Card:**
- `Heart` icon (16px, `pink-400`)
- "长期记忆形成" label in `label` font, `pink-500`
- Memory content: "记住了你喜欢在压力大的时候听音乐" in `body-sm`
- Time: "20:12" in `body-sm`, `text-muted`
- Background: `pink-50`

#### Empty State
- If no memories: centered illustration (soft empty calendar icon, 80px, `pink-100`)
- Text: "这一天还没有留下回忆" in `body`, `text-muted`
- Subtext: "去和伴侣聊聊天，创造属于你们的记忆吧" in `body-sm`

### Animations
- **Drawer open**: Slide from right 400ms ease-smooth, content area slightly dims (overlay rgba(0,0,0,0.05))
- **Drawer close**: Slide right + fade 300ms
- **Memory cards**: Stagger in, slide up 15px + fade, 60ms stagger
- **Card expand**: Height animates, content fades in, 300ms
