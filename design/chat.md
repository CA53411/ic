# Chat Page (chat.md)

The full-screen chat interface — the heart of the Platonic AI experience. Features a mesmerizing pink breathing gradient background, real-time SSE streaming messages with typewriter effects, distinct message bubbles for user and AI, and a fixed bottom input bar with quick-action buttons. This page has no sidebar to maximize immersion.

| Property | Value |
|----------|-------|
| Route | `/chat` |
| Sections | 5 |
| Purpose | Primary conversation interface with AI companion |
| Layout | Full-screen immersive (no sidebar) |

---

## Page Layout

Full viewport, no sidebar. The entire screen is the chat canvas.

```
┌──────────────────────────────────────────────────────────┐
│ Chat Top Bar (56px)                                      │
│ ┌────┐ Companion Name + Status          [Settings][Menu] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Message History Area (scrollable, flex-1)               │
│                                                          │
│      ┌─────────────────────────────┐                     │
│      │ AI Message Bubble (pink)    │                     │
│      │ 你好呀！今天过得怎么样？     │                     │
│      └─────────────────────────────┘                     │
│                                                          │
│                          ┌────────────────────┐          │
│                          │ User Message (white)│          │
│                          │ 今天工作有点累...   │          │
│                          └────────────────────┘          │
│                                                          │
│      ┌──────────────────────────────────────────┐        │
│      │ AI Message (pink) — streaming text       │        │
│      │ 辛苦啦！要不要聊聊是什么让你感到累... █   │        │
│      └──────────────────────────────────────────┘        │
│                                                          │
│  Date Separator: "—— 今天 ——"                             │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Quick Actions Row                                        │
│ [发送图片] [表情] [语音] [更多]                           │
├──────────────────────────────────────────────────────────┤
│ Input Bar (fixed bottom)                                 │
│ [Attachment] [Text Input.................] [Send]        │
└──────────────────────────────────────────────────────────┘
```

- **Background**: `breathing-gradient` animation (8s cycle) + 2-3 floating soft orbs
- **Top bar**: transparent with `backdrop-blur(8px)`, subtle bottom border `pink-100`
- **Message area**: scrollable, padding 24px, messages aligned alternately
- **Input area**: fixed at bottom, `backdrop-blur(12px)`, semi-transparent white bg

---

## Background

### Breathing Gradient
Same animation as auth page but slightly more subtle:
```css
background: linear-gradient(135deg, #FFF8FA 0%, #FFF0F3 20%, #FFE8EE 40%, #FFD4E0 60%, #FFC9D8 80%, #FFB6C1 100%);
background-size: 400% 400%;
animation: breathing-gradient 10s ease-in-out infinite;
```
Slightly slower (10s vs 8s) for a calmer conversation atmosphere.

### Floating Orbs
- 2 orbs only (less distracting during conversation):
  - Orb 1: 350px, `rgba(255,182,193,0.12)`, blur(100px), top-left, `float-orb` 16s
  - Orb 2: 280px, `rgba(232,160,191,0.1)`, blur(120px), bottom-right, `float-orb` 14s, 4s delay

---

## Section 1: Chat Top Bar

### Layout
- Height: 56px, fixed top
- Background: `rgba(255,245,247,0.7)` + `backdrop-blur(8px)`
- Border-bottom: 1px `rgba(255,182,193,0.2)`
- Padding: 0 20px

### Elements

#### Left Side
- **Back button**: `ChevronLeft` icon, 20px, `text-secondary`, only on mobile (< 768px)
- **Companion Avatar**: 36px circle, `companion-1.jpg`, `shadow-sm`
- **Name + Status** (beside avatar):
  - Name: "小樱" in `h4`
  - Status: "在线 💚" or "正在输入..." in `body-sm`, `text-muted`
  - "正在输入..." shows animated dots (3 dots cycling opacity)

#### Right Side
- **Companion Settings**: `Settings` icon button, `ghost` style, 36px circle — opens companion config drawer
- **More Menu**: `MoreVertical` icon button, dropdown menu with: 清空对话 / 导出记录 / 举报

### Animations
- Top bar: fades in on page load, 300ms
- "正在输入...": dots pulse opacity 0.3→1, staggered 200ms, infinite
- Settings drawer: slides from right, 400ms ease-smooth

---

## Section 2: Message History Area

### Layout
- Flex-1, fills all space between top bar and input area
- Scrollable (auto-scroll to bottom on new messages)
- Padding: 20px horizontal, 16px vertical
- Messages aligned: AI left-aligned, user right-aligned

### Message Bubble Design

#### AI Message Bubble
- **Background**: `rgba(255,255,255,0.82)` + `backdrop-blur(4px)`
- **Border**: 1px `rgba(255,182,193,0.3)`
- **Border radius**: 20px top-right, 20px bottom-right, 4px top-left, 20px bottom-left
  (soft rounded with slight point on avatar side)
- **Padding**: 14px 18px
- **Max width**: 70% of chat width
- **Shadow**: `shadow-sm`
- **Text**: `body` font, `text-primary`, line-height 1.65

#### User Message Bubble
- **Background**: `rgba(255,255,255,0.92)`
- **Border**: 1px `rgba(255,182,193,0.2)`
- **Border radius**: 20px top-left, 20px bottom-left, 20px top-right, 4px bottom-right
- **Padding**: 14px 18px
- **Max width**: 70% of chat width
- **Shadow**: `shadow-sm`
- **Text**: `body` font, `text-primary`

#### Streaming Message (AI typing)
- Same style as AI bubble
- **Cursor**: Blinking block cursor `█` at end of text
- Cursor animation: opacity 0→1, 500ms, infinite
- Text appears character by character (SSE stream)
- Smooth scroll: message area gently scrolls as content grows

#### Message Metadata
- Below each bubble: timestamp in `body-sm` (11px), `text-muted`
- Format: "14:32" or "昨天 14:32"

#### Avatar Beside AI Messages
- Small avatar (28px circle) on the left of AI bubbles
- Positioned at bottom-left of bubble
- Subtle `shadow-sm`

### Date Separators
- Centered text: "—— 今天 ——" or "—— 12月15日 ——"
- Font: `body-sm`, `text-muted`
- Margin: 24px vertical
- Horizontal lines (1px `pink-100`) extending from text to edges

### Special Message Types

#### Image Message
- Thumbnail inside bubble, `radius-md`
- Click to expand (lightbox modal)
- Max height 200px in bubble

#### System Message
- Centered, no bubble
- Background: `pink-50` pill, `radius-full`
- Text: "小樱 已成为你的伴侣 💕" in `body-sm`, `pink-500`

### Animations
- **AI message entrance**: Slide in from left 20px + fade in, 400ms, ease-smooth
- **User message entrance**: Slide in from right 20px + fade in, 300ms, ease-smooth
- **Streaming text**: Each character appears with micro-stagger (SSE driven, ~30-50ms per chunk)
- **Message bubble hover**: Very subtle `shadow-md` increase, 150ms
- **Auto-scroll**: Smooth scroll to bottom, 300ms, when new message arrives
- **Scroll to bottom button**: Appears when scrolled up, floating pill at bottom-center, `ChevronDown` icon, `pink-400` bg, white icon, click smooth-scrolls to bottom

---

## Section 3: Quick Actions Row

### Layout
- Above input bar, full width
- Height: 44px
- Background: transparent (part of gradient background visible)
- Horizontal scrollable row of pill buttons
- Padding: 0 20px

### Elements

Quick action pill buttons (all `ghost` variant, small, `radius-full`):
1. "发送图片" — `Image` icon + text
2. "表情" — `Smile` icon + text
3. "语音消息" — `Mic` icon + text  
4. "分享心情" — `Heart` icon + text
5. "记忆回顾" — `Calendar` icon + text
6. "更多" — `Plus` icon + text (opens additional actions)

- Each pill: `pink-50` bg, `pink-500` text, padding 6px 14px
- Gap: 8px between pills
- Horizontal scroll on overflow (hidden scrollbar)

### Animations
- Pills: fade in + slide up 10px, staggered 40ms, when chat page loads
- Hover: `scale(1.04)` + bg darkens to `pink-100`, 150ms
- Click: `scale(0.97)` feedback, 100ms
- Currently: show toast "功能即将推出" on click (placeholder)

---

## Section 4: Input Bar

### Layout
- Fixed at bottom of viewport
- Height: auto (min 56px, expands for multiline)
- Background: `rgba(255,245,247,0.85)` + `backdrop-blur(12px)`
- Border-top: 1px `rgba(255,182,193,0.2)`
- Padding: 12px 20px
- Horizontal layout: attachment button → text area → send button

### Elements

#### Attachment Button
- `Paperclip` icon, 20px, `text-secondary`
- 40px circle button, `ghost` style
- Hover: `pink-50` bg, 150ms
- Click: opens file picker (placeholder)

#### Text Input
- Auto-expanding textarea, 1-5 rows
- Background: white, `radius-full` (pill shape when 1 line, `radius-lg` when multiline)
- Border: 1px `pink-100`
- Padding: 10px 18px
- Placeholder: "说点什么吧..." in `text-muted`
- Focus: border `pink-400` + `shadow-glow`
- Font: `body` 15px
- **Enter to send** (single Enter), Shift+Enter for newline

#### Send Button
- `Send` icon (paper plane), 20px
- 40px circle, `primary` variant (`accent-gradient`)
- White icon
- Disabled state: `pink-200` bg, white icon at 50% opacity (when input empty)
- Hover (enabled): brightness(1.1) + `scale(1.05)`, 150ms
- Active: `scale(0.95)`, 100ms
- **Send animation**: Icon briefly rotates -45° and moves up 5px (plane flying), 300ms, then resets

### Animations
- Input bar: fades in on page load, 300ms, 200ms delay
- Send button enable: smooth transition from disabled→enabled state, 200ms
- Message sent: Input clears with quick fade, bubble appears as described above

---

## Section 5: Typing Indicator

### When companion is "typing"
- A temporary AI bubble appears at the bottom
- Contains 3 animated dots instead of text
- Dot animation: each dot (6px circle, `pink-400`) bounces up 6px, staggered 150ms, infinite loop
- Bubble disappears when first SSE chunk arrives (replaced by actual message)

---

## Companion Settings Drawer

### Triggered from top bar settings icon
- Slides from right, 360px wide
- Background: white, `shadow-lg`

### Elements
- **Header**: Companion avatar (48px) + name + close `X` button
- **Big Five Summary**: Mini 5-bar display of current personality
- **Milestone Info**: Current stage + progress
- **Actions**:
  - "查看记忆" button → links to `/memory`
  - "剧情空间" button → links to `/drama`
  - "调整设置" button → companion config (future)
  - "解除伴侣关系" danger text button at bottom

### Animations
- Slide in 400ms ease-smooth, overlay fade 200ms
