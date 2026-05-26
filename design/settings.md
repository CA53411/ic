# Settings Page (settings.md)

The settings page for user preferences — language switching, account information, and theme settings. Clean, organized, and functional with a settings-list layout pattern.

| Property | Value |
|----------|-------|
| Route | `/settings` |
| Sections | 4 |
| Purpose | User preferences, account info, and app configuration |

---

## Page Layout

Standard app layout: sidebar + content area. Settings are organized in cards by category.

```
┌──────────────────────────────────────────────────────┐
│ Sidebar │        Settings Content                   │
│ 220px   │                                           │
│         │  Top Bar: "设置"                          │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ Language Settings                │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ Account Information              │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ Theme Settings                   │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ About / Danger Zone              │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
```

---

## Section 1: Top Bar

### Elements
- **Left**: "设置" in `h2`, with `Settings` icon (20px, `text-secondary`)
- **Right**: None

### Animations
- Fade in, 300ms

---

## Section 2: Language Settings Card

### Overview
Language switching between supported languages. Clear visual selection with flag/icon indicators.

### Layout
- `Card Component`, padding 24px
- Max-width: 640px

### Elements

#### Card Header
- Title: "语言设置" in `h3`
- Subtitle: "选择你偏好的界面语言" in `body-sm`, `text-muted`

#### Language Options
Four selectable options in a vertical list:

1. **中文 (简体)**
   - Radio button (left) + "中文" label + "简体" tag (right, `body-sm`, `text-muted`)
   - Selected: radio filled `pink-400`, row bg `pink-50`
   - `Globe` icon beside label

2. **English**
   - Same layout
   - Label: "English"

3. **日本語**
   - Label: "日本語"
   - Tag: "Japanese" in `body-sm`, `text-muted`

4. **한국어**
   - Label: "한국어"
   - Tag: "Korean" in `body-sm`, `text-muted`

- Each option: full-width row, padding 14px 16px, `radius-md`, cursor pointer
- Hover: `pink-50` bg, 150ms
- Gap: 8px between options

#### Save Button
- "保存" `primary` button, right-aligned below options
- Disabled until a change is made
- Shows "已保存 ✅" briefly after save

### Animations
- Card entrance: slide up 20px + fade, 400ms
- Language options: stagger in 50ms
- Selection: radio fill animates (scale 0→1), 150ms, bg color transition 200ms
- Save: button text transitions, checkmark fades in

---

## Section 3: Account Information Card

### Overview
Displays user account details with the ability to edit certain fields.

### Layout
- `Card Component`, padding 24px, max-width 640px
- Margin-top: 20px

### Elements

#### Card Header
- Title: "账号信息" in `h3`
- Edit toggle: "编辑" / "取消" link in `pink-500`, `body-sm`

#### Account Fields (read-only mode)
Each field as a row:
- Left: field label in `body-sm`, `text-muted`, width 120px
- Right: field value in `body`, `text-primary`
- Divider: 1px `pink-50` between rows

Fields:
1. **用户名**: "PlatonicUser_8823" — with `Edit3` icon for inline editing
2. **邮箱**: "user@example.com" — verified badge (`CheckCircle`, green, 14px)
3. **注册时间**: "2024年12月1日"
4. **伴侣**: "小樱" — with small avatar (20px) + `ChevronRight` link to companion settings

#### Edit Mode
When "编辑" clicked:
- Username becomes editable `Input Component`
- Save / Cancel buttons appear below
- Email shows "验证中" or verified status

### Animations
- Card entrance: slide up 20px + fade, 400ms, 100ms delay
- Edit toggle: form fields cross-fade, 200ms
- Save: inline checkmark animation on saved field

---

## Section 4: Theme Settings Card

### Overview
Theme preferences including light/dark mode toggle (future) and accent color selection.

### Layout
- `Card Component`, padding 24px, max-width 640px
- Margin-top: 20px

### Elements

#### Card Header
- Title: "主题设置" in `h3`
- Subtitle: "自定义你的视觉体验" in `body-sm`, `text-muted`

#### Theme Mode Toggle
- Label: "主题模式" in `body-sm`, `text-secondary`
- Toggle switch: 
  - Left: `Sun` icon + "浅色" label
  - Right: `Moon` icon + "深色" label
  - Toggle track: 48px × 24px, `radius-full`, `pink-100` bg
  - Thumb: 20px circle, white, `shadow-sm`
  - Active side: `pink-400` fill on that half
- Currently: light mode active (dark mode is future feature, shows "即将推出" tooltip on dark)

#### Accent Color Selection
- Label: "强调色" in `body-sm`, `text-secondary`
- Row of 5 color circles (32px each):
  1. Default Pink: `pink-400` — selected
  2. Rose Gold: `rose-gold` (#E8A0BF)
  3. Lavender: `purple-memory` (#C8A8E9)
  4. Coral: `#FF8A80`
  5. Mint: `#80CBC4`
- Selected: 3px white border + 2px `text-primary` outer ring + `shadow-glow`
- Hover: `scale(1.1)`, 150ms

#### Font Size Slider
- Label: "字体大小" in `body-sm`, `text-secondary`
- Slider: `Slider Component` (same as customize page), range "小" to "大"
- Default: middle position
- Preview text below: "这是预览文字" in dynamic size

### Animations
- Card entrance: slide up 20px + fade, 400ms, 200ms delay
- Toggle switch: thumb slides with spring animation, 300ms
- Color selection: ring scales in (0→1), 200ms, glow appears
- Font slider: real-time preview text size transition, 150ms

---

## Section 5: About & Danger Zone

### Layout
- `Card Component`, padding 24px, max-width 640px
- Margin-top: 20px

### Elements

#### About Section
- Title: "关于 Platonic" in `h3`
- App version: "v1.0.0" in `body-sm`, `text-muted`
- Links: "服务条款" / "隐私政策" / "联系我们" — `body-sm`, `pink-500`, horizontal row
- Copyright: "2024 Platonic AI" in `body-sm`, `text-muted`

#### Danger Zone (bottom of card, separated by divider)
- Divider: 1px `pink-100`, margin 20px 0
- Label: "危险操作" in `label`, `#DC2626`
- **Logout Button**: `ghost` style, `text-secondary`, `LogOut` icon — "退出登录"
- **Delete Account**: text-only button, `danger` color (#DC2626), `Trash2` icon — "注销账号"
  - Click: confirmation modal required
  - Modal: "确定要注销账号吗？此操作不可撤销。" + "确认注销" (danger button) + "取消"

### Animations
- Card entrance: slide up 20px + fade, 400ms, 300ms delay
- Danger buttons: no special animation, standard hover
- Delete confirmation modal: standard modal animation (scale 0.93→1, 300ms)
