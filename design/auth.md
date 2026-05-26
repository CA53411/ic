# Auth Page (auth.md)

Email-based login and signup with a mesmerizing pink breathing animation background. The entire experience should feel warm, inviting, and secure — like being welcomed into a safe space.

| Property | Value |
|----------|-------|
| Route | `/auth` |
| Sections | 1 (single view with tab toggle) |
| Purpose | Authenticate users via email + password |

---

## Page Layout

- Full viewport (100vw × 100vh), no sidebar, no scroll
- Background: `breathing-gradient` animation (8s cycle) + 3 floating soft pink orbs
- Centered auth card, max-width 420px

---

## Background

### Breathing Gradient Animation
```css
background: linear-gradient(135deg, #FFF5F7 0%, #FFE4EC 20%, #FFB6C1 45%, #E8A0BF 70%, #D4A5D4 100%);
background-size: 400% 400%;
animation: breathing-gradient 8s ease-in-out infinite;
```
The gradient shifts slowly between warm pink and soft lavender, creating a living, breathing atmosphere.

### Floating Orbs
- Orb 1: 300px, `rgba(255,182,193,0.25)`, blur(80px), top-left area, `float-orb` 14s
- Orb 2: 250px, `rgba(232,160,191,0.2)`, blur(100px), bottom-right area, `float-orb` 12s, 3s delay
- Orb 3: 200px, `rgba(212,165,212,0.2)`, blur(90px), center-right, `float-orb` 16s, 6s delay

---

## Auth Card

### Container
- Background: `rgba(255,255,255,0.85)` with `backdrop-filter: blur(20px)`
- Border: 1px solid `rgba(255,182,193,0.3)`
- Border radius: `radius-xl` (24px)
- Padding: 40px
- Shadow: `shadow-lg` + soft pink glow `0 0 60px rgba(255,182,193,0.15)`
- Width: 100%, max-width 420px

### Logo Area (Card Top)
- `logo.svg` centered, 140px wide
- Below: "Platonic" wordmark in `pink-400`, `h3` size
- Below: "你的AI虚拟伴侣" in `body-sm`, `text-muted`
- Margin-bottom: 32px

### Tab Toggle
- Two tabs: "登录" (Login) | "注册" (Sign Up)
- Container: pill-shaped background `pink-50`, radius-full, padding 4px
- Active tab: white bg, `pink-500` text, `shadow-sm`, radius-full
- Inactive tab: transparent, `text-muted`
- Tab switch: content cross-fades (200ms), form fields animate with slight slide

---

## Login Form

### Email Input
- Label: "邮箱地址" in `label` font, `text-secondary`
- Input: `Input Component` from design.md
- Icon: `Mail` (lucide) inside left of input, `text-muted`, 18px
- Placeholder: "your@email.com"
- Validation: email format on blur

### Password Input
- Label: "密码" in `label` font
- Input: `Input Component` with `type="password"`
- Icon: `Lock` inside left, `Eye` / `EyeOff` toggle button inside right
- Placeholder: "输入密码"

### Forgot Password
- "忘记密码？" link below password field, right-aligned
- Font: `body-sm`, `pink-500`
- Hover: underline

### Submit Button
- "登录" — full width, `primary` button variant, height 48px
- Loading state: spinner icon replaces text, disabled
- Success: brief checkmark animation, then redirect

### Divider
- "或" text centered between two horizontal lines (1px `pink-100`)
- Margin: 20px vertical

### Social Login (Placeholder)
- "使用其他方式登录" in `body-sm`, `text-muted`
- Row of 3 icon buttons (Google, Apple, WeChat) — ghost style, 44px circle
- Currently decorative, click shows "即将推出" toast

### Animations (Login)
- **Card entrance**: Scale 0.92→1 + opacity 0→1, 600ms, ease-bounce, 200ms page-load delay
- **Form fields**: Stagger fade in + slide up 15px, 60ms stagger, 400ms after card
- **Tab switch**: Outgoing form fades out 150ms, incoming fades in + slides from opposite direction 200ms
- **Submit hover**: `shadow-glow` intensifies, 150ms
- **Submit active**: Scale 0.98, 100ms
- **Error shake**: Horizontal shake (translateX ±6px, 3 cycles, 400ms total) on validation error

---

## Signup Form

### Step Indicator
- 3 dots in a row: 基本信息 → 邮箱验证 → 完成
- Active dot: `pink-400` filled, 10px
- Inactive dot: `pink-100` filled, 8px
- Connector line: 1px `pink-100` between dots
- Updates as user progresses

### Step 1: Basic Info

#### Username Input
- Label: "昵称" in `label` font
- Input: `Input Component`
- Icon: `User` inside left
- Placeholder: "给你的伴侣一个称呼你的方式"
- Max length: 20 chars, counter shown

#### Email Input
- Same as login email field

#### Password Input
- Label: "设置密码" in `label` font
- Input: password type with visibility toggle
- **Password Strength Indicator** (below input):
  - 4-segment horizontal bar, 4px height each
  - Colors by strength: gray (empty) → red (weak) → orange (fair) → `rose-gold` (good) → `pink-400` (strong)
  - Label below: "密码强度：弱/一般/良好/强" in `body-sm`
  - Rules checked: 8+ chars, uppercase, lowercase, number, special char
  - Each rule shown as small check item with `Check` or `X` icon

#### Confirm Password
- Label: "确认密码"
- Input: password type
- Validation: must match password, green `Check` when matching, red warning when different

#### Next Button
- "下一步" — full width, primary button
- Disabled until all fields valid

### Step 2: Email Verification

#### Status Display
- Large envelope icon (`Mail` from lucide), 64px, `pink-400`
- Title: "验证你的邮箱" in `h2`
- Description: "我们已向 **user@email.com** 发送了验证码，请查收并输入" in `body`, email in bold

#### Code Input
- 6 single-character input boxes in a row
- Each: 48px × 56px, centered text, `number` font 24px, border `pink-200`
- Focus: border `pink-400` + `shadow-glow`
- Auto-advance to next box on input
- Backspace moves to previous
- Paste support: paste 6-digit code fills all boxes

#### Resend Timer
- "重新发送 (45s)" — countdown timer, starts at 60s
- When expired: becomes clickable link in `pink-500`

#### Verify Button
- "验证" — primary button, disabled until 6 digits entered

### Step 3: Complete

#### Success Animation
- Animated checkmark circle: SVG circle draws + checkmark appears, 800ms
- Circle: 80px, `pink-400` stroke, 3px width
- Checkmark: white fill inside

#### Welcome Message
- Title: "欢迎加入 Platonic" in `h2`
- Description: "你的账号已创建成功。现在，去遇见你的灵魂伴侣吧。" in `body`

#### CTA
- "进入 Platonic" — large primary button
- Redirects to `/dashboard` on click

### Animations (Signup)
- **Step transitions**: Outgoing step slides left + fades out 250ms, incoming slides from right + fades in 300ms
- **Password strength bar**: Width + color transitions 200ms smooth
- **Code input focus**: `shadow-glow` pulses on active box
- **Success checkmark**: SVG stroke-dashoffset animation draws the circle (600ms), then checkmark draws (200ms delay)
- **Welcome content**: Fade in + slide up 20px, 400ms after checkmark completes

---

## Responsive

- Mobile (< 768px): Card becomes full-width with 16px margin, padding reduces to 28px, orbs hidden for performance
- Tablet: Card at 400px width, standard padding
- Orbs are hidden on mobile for performance; gradient animation remains
