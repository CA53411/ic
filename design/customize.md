# Customize Page (customize.md)

The companion creation wizard. A step-by-step form that guides users through creating their own personalized AI companion — from basic info to personality settings via Big Five sliders to background story. Features a real-time personality preview that updates as sliders move.

| Property | Value |
|----------|-------|
| Route | `/customize` |
| Sections | 4 (step-based) |
| Purpose | Create a custom AI companion with full personality control |

---

## Page Layout

Standard app layout: sidebar + content area. The preview panel on the right shows a live-updating personality preview.

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │        Form Area              │ Preview Panel    │
│ 220px   │        flex-1                 │ 320px            │
│         │                              │                  │
│ Logo    │  Top Bar: "创建个人伴侣"       │ Live Radar       │
│ Nav     │                              │ Chart (mini)     │
│ Items   │  Step Indicator              │                  │
│         │                              │ Personality      │
│ User    │  ┌────────────────────────┐  │ Description      │
│ Profile │  │ Current Step Form      │  │ (updates live)   │
│         │  │                        │  │                  │
│         │  │                        │  │ Avatar Preview   │
│         │  │                        │  │ (placeholder)    │
│         │  └────────────────────────┘  │                  │
│         │                              └──────────────────┘
│         │  Navigation Buttons                              │
│         │  [上一步]        [下一步/完成]                   │
│         │                                                    │
└─────────┴────────────────────────────────────────────────────┘
```

---

## Section 1: Top Bar

### Elements
- **Left**: "创建个人伴侣" in `h2`
- **Right**: "Step X of 3" indicator in `body-sm`, `text-muted`

### Animations
- Fade in from left, 300ms

---

## Section 2: Step Indicator

### Layout
- Centered, max-width 500px, margin-bottom 32px
- Horizontal: 3 steps connected by line

### Elements

#### Step Nodes
- Each node: 40px circle with step number/icon inside
- Step 1: "基础" — `User` icon
- Step 2: "性格" — `Sparkles` icon
- Step 3: "故事" — `BookOpen` icon
- **Active step**: `pink-400` bg, white icon, pulsing ring (2s infinite)
- **Completed step**: `pink-400` bg, white `Check` icon
- **Future step**: `pink-100` bg, `text-muted` icon
- Connecting line: 2px, fills with `pink-400` as steps complete

#### Step Labels
- Below each node: step name in `body-sm`
- Active: `text-primary`, bold
- Others: `text-muted`

### Animations
- Line fill: width animates smoothly as steps progress, 400ms
- Active node: ring pulse starts when step becomes active
- Completed → Check: icon morphs with 200ms transition

---

## Step 1: Basic Information

### Form Container
- `Card Component`, max-width 640px, centered, padding 32px

### Elements

#### Element: "Companion Name"
- Label: "伴侣名称 *" in `label` font
- Input: `Input Component`, max 16 chars
- Placeholder: "给她一个温暖的名字..."
- Validation: required, min 1 char
- Char counter: "0/16" in `body-sm`, `text-muted`

#### Element: "Companion Gender"
- Label: "性别 *" in `label` font
- Three radio cards in a row:
  - 女性 (Female): `Venus/Female` icon, soft pink bg when selected
  - 男性 (Male): `Mars` icon, soft blue bg when selected
  - 中性 (Neutral): `User` icon, soft purple bg when selected
- Each: 100px × 80px card, icon 24px + label below, `radius-md`
- Selected: border 2px `pink-400` + bg tint + `shadow-glow`

#### Element: "Companion Avatar"
- Label: "头像 *" in `label` font
- Grid of 6 preset avatar options (2 rows × 3), each 80px circle
- Uses `companion-1.jpg` through `companion-6.jpg` as presets
- Selected: 3px `pink-400` border + `shadow-glow` ring
- Below: "或上传自定义头像" link in `pink-500`, opens file picker

#### Element: "Short Introduction"
- Label: "一句话简介" in `label` font
- Textarea: 3 rows, `Input Component` style
- Placeholder: "用一句话描述她给你的第一印象..."
- Max 60 chars

#### Element: "Voice Preference" (placeholder)
- Label: "声线风格" in `label` font
- 4 voice style chips: 甜美/成熟/清亮/低沉
- Each: `Badge` style, selectable (multi-select allowed)
- Subtitle: "声线功能将在后续版本推出" in `body-sm`, `text-muted`, italic

### Animations
- Form fields: stagger entrance, slide up 20px + fade, 60ms stagger
- Radio cards: hover `scale(1.03)` + border appear, 150ms
- Avatar selection: selected ring animates in (scale 0→1), 200ms
- Step transition out: slide left + fade 250ms

---

## Step 2: Personality Settings

### Form Container
- `Card Component`, max-width 720px, padding 32px

### Elements

#### Element: "Section Header"
- Title: "塑造她的灵魂" in `h2`, centered
- Subtitle: "拖动滑块，定义她独一无二的性格" in `body`, `text-secondary`, centered
- Decorative: small `Sparkles` icon with gentle pulse animation

#### Element: "Big Five Sliders"

5 sliders, each in its own row with rich labeling:

**Slider Component Design:**
- Track: 8px height, `radius-full`, `pink-50` bg
- Fill: `accent-gradient`, from left to current value
- Thumb: 20px circle, white, `shadow-md`, border 2px `pink-400`
- Hover on thumb: `scale(1.2)` + `shadow-glow`
- Drag: smooth value update, thumb follows cursor

**Each Slider Row Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  trait-icon   开放性 (Openness)              [78]       │
│  好奇心·创造力·想象力          [=========●====]          │
│  保守 ○──────────────────────────────○ 前卫              │
└─────────────────────────────────────────────────────────┘
```

Individual sliders:

1. **开放性 Openness**
   - Icon: `Lightbulb` (20px, `pink-400`)
   - Range: 0 (保守务实) → 100 (好奇创新)
   - Default: 50
   - Labels: left "务实保守" / right "好奇创新"

2. **尽责性 Conscientiousness**
   - Icon: `CheckSquare` (20px, `rose-gold`)
   - Range: 0 (随性自由) → 100 (严谨自律)
   - Default: 50
   - Labels: left "随性自由" / right "严谨自律"

3. **外向性 Extraversion**
   - Icon: `Users` (20px, `gold`)
   - Range: 0 (内向安静) → 100 (外向活跃)
   - Default: 50
   - Labels: left "内向安静" / right "外向活跃"

4. **宜人性 Agreeableness**
   - Icon: `Heart` (20px, `pink-400`)
   - Range: 0 (理性独立) → 100 (温和友善)
   - Default: 50
   - Labels: left "理性独立" / right "温和友善"

5. **神经质 Neuroticism**
   - Icon: `CloudRain` (20px, `purple-memory`)
   - Range: 0 (情绪稳定) → 100 (敏感多变)
   - Default: 50
   - Labels: left "情绪稳定" / right "敏感多变"

- Each slider: margin-bottom 28px
- Value display: `number-sm` font (20px), `pink-500`, right-aligned, updates in real-time
- Sub-labels: `body-sm`, `text-muted`, describing the poles

#### Element: "Personality Presets"
- Row of quick preset buttons below sliders:
  - "温柔型" (soft pink) — High Agreeableness, Low Neuroticism
  - "活泼型" (soft coral) — High Extraversion, High Openness
  - "知性型" (soft lavender) — High Openness, High Conscientiousness
  - "冷静型" (soft blue-gray) — Low Neuroticism, High Conscientiousness
  - "元气型" (soft gold) — High Extraversion, High Agreeableness
- Each: `Badge` pill style, click sets all sliders to preset values
- Active preset: `pink-400` bg, white text

### Animations
- **Slider entrance**: Stagger in from left, 80ms stagger, slide in 20px + fade
- **Slider value change**: Fill width animates smoothly (CSS transition on width)
- **Value number**: Quick bounce (scale 1.1→1) on change, 150ms
- **Preset click**: Sliders animate to new values simultaneously, 400ms ease-smooth
- **Radar preview** (right panel): Animates vertices to new positions in sync with sliders, 300ms

---

## Step 3: Background Story

### Form Container
- `Card Component`, max-width 640px, padding 32px

### Elements

#### Element: "Section Header"
- Title: "她的故事" in `h2`, centered
- Subtitle: "为她编写一段背景故事，让她更加真实立体" in `body`, centered

#### Element: "Story Background"
- Label: "背景故事" in `label` font
- Textarea: 8 rows, `Input Component` style
- Placeholder: "她从哪里来？有着怎样的过去？喜欢什么、害怕什么？写下她的故事..."
- Character counter: "0/500" in `body-sm`, `text-muted`
- Max 500 chars

#### Element: "Story Prompts" (expandable)
- "需要灵感？点击获取提示" link, toggles prompt suggestions
- Prompts displayed as clickable chips:
  - "她在一个樱花小镇长大..."
  - "她是一名热爱星空的天文学者..."
  - "她曾经环游世界，现在想要安定..."
  - "她是一位神秘的图书馆管理员..."
- Clicking a prompt: auto-fills the textarea with a template story

#### Element: "First Message"
- Label: "初见时的第一句话" in `label` font
- Input: `Input Component`
- Placeholder: "当她第一次见你时，会说些什么？"
- Example below: "例如：'嗨，终于见到你了。我等了你好久。'" in `body-sm`, `text-muted`, italic

#### Element: "Topic Preferences"
- Label: "她擅长的话题" in `label` font
- Tag cloud of selectable topics:
  - 日常生活, 文学小说, 动漫游戏, 哲学思考, 情感交流, 旅行探险, 美食烹饪, 音乐艺术, 科学知识, 时尚潮流
- Each: `Badge` pill, toggle select/deselect on click
- Selected: `pink-400` bg, white text

### Animations
- Form entrance: stagger slide up + fade, 60ms
- Prompt toggle: height expand with content fade, 300ms
- Prompt chips: stagger in 40ms when section opens
- Tag selection: bg color transition 150ms + slight scale(1.05)

---

## Preview Panel (Right Side)

### Overview
A live-updating preview that shows the companion's personality as a mini radar chart and generates a real-time personality description based on the Big Five sliders.

### Elements

#### Mini Radar Chart
- Size: 200px × 200px
- Same design as dashboard radar but smaller
- Updates in real-time as sliders move (vertices animate to new positions, 300ms)
- No labels (clean), just the filled polygon shape

#### Personality Description
- Title: "性格预览" in `h3`
- Dynamic text block that updates based on slider values:
  - Generates a 2-3 sentence description combining top 2-3 traits
  - Example: "她是一位开朗且富有创造力的伴侣。她乐于探索新事物，总是充满好奇心，同时她温和友善的性格让人感到舒适和放松。"
- Text: `body-sm`, `text-secondary`, border-left 3px `rose-gold`, padding-left 12px
- **Update animation**: Text cross-fades (outgoing fades 100ms, incoming fades 200ms) when description changes

#### Avatar Preview
- Selected avatar from Step 1, 120px circle
- Below: companion name (updates as typed), `h4`
- Soft `shadow-glow` ring around avatar

### Animations
- Panel entrance: slide in from right + fade, 400ms
- Radar update: vertices transition with spring-like easing, 300ms
- Description update: cross-fade as noted

---

## Navigation Buttons

### Layout
- Fixed at bottom of form area, or within form container
- Horizontal: [Previous] [Next/Complete]

### Buttons
- **Previous**: `ghost` button, disabled on Step 1, "上一步"
- **Next**: `primary` button, "下一步" (Steps 1-2), "完成创建" (Step 3)
- On Step 3 "完成创建": button has extra `shadow-glow` + sparkle icon

### Animations
- Button hover: standard hover effects
- "完成创建" click: button expands briefly, sparkle particles emit, then redirect to `/chat`
