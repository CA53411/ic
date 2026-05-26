# Payment Page (payment.md)

The energy recharge center where users can purchase "energy" (电量) — the in-app currency for conversations and premium features. Features a prominent balance display, tiered recharge plans, Alipay QR code payment flow, and transaction history.

| Property | Value |
|----------|-------|
| Route | `/payment` |
| Sections | 5 |
| Purpose | Recharge energy balance and view transaction history |

---

## Page Layout

Standard app layout: sidebar + content area. Clean, trustworthy, and encouraging design.

```
┌──────────────────────────────────────────────────────┐
│ Sidebar │        Payment Content                    │
│ 220px   │                                           │
│         │  Top Bar: "支付中心"                      │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ Energy Balance Card (large)      │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
│         │  "选择充值套餐"                           │
│         │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│         │  │P1  │ │P2  │ │P3  │ │P4  │ │P5  │    │
│         │  └────┘ └────┘ └────┘ └────┘ └────┘    │
│         │                                           │
│         │  ┌──────────────────────────────────┐    │
│         │  │ Payment Method (Alipay QR)       │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
│         │  Transaction History                      │
│         │  ┌──────────────────────────────────┐    │
│         │  │ List of past transactions        │    │
│         │  └──────────────────────────────────┘    │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
```

---

## Section 1: Top Bar

### Elements
- **Left**: "支付中心" in `h2`, with `Zap` icon (20px, `gold`)
- **Right**: Current balance pill: "⚡ 1,280" in `body-sm`, `gold`, `pink-50` bg, `radius-full`

### Animations
- Fade in, 300ms

---

## Section 2: Energy Balance Card

### Overview
A large, visually striking balance display card. This is the hero element of the payment page — big numbers, clean design, encouraging recharge.

### Layout
- Full content width
- Card: `Card Component`, padding 40px, `radius-xl`
- Background: `accent-gradient` (the card itself uses the gradient)
- Text: white

### Elements

#### Element: "Balance Label"
- "当前电量余额" in `body`, white at 80%
- `Zap` icon (24px) beside label

#### Element: "Balance Number"
- "1,280" in `number` token (48px, even larger here), white, bold
- "⚡" unit icon, 28px, white, beside number
- `shadow-glow` text shadow for emphasis

#### Element: "Balance Sub-info"
- "大约可支持 128 次普通对话" in `body-sm`, white at 70%
- Progress bar below: thin (6px), white at 20% track, white fill at ~60%
- Label: "使用进度" in `body-sm`, white at 60%

#### Element: "Recharge CTA"
- "电量不足时，充值即可继续与伴侣畅聊" in `body-sm`, white at 70%
- Positioned at bottom-right of card

### Animations
- **Card entrance**: Slide up 30px + fade, 600ms
- **Balance number**: Counts up from 0 to 1280, 2000ms, ease-smooth
- **Progress bar**: Width 0→60%, 1200ms, 500ms delay
- **Glow effect**: Subtle `shadow-glow` pulse on the number, 3s infinite, starts after count-up

---

## Section 3: Recharge Plans

### Overview
Six tiered recharge plan cards. Each offers different energy amounts at different price points, with popular/best-value highlighting.

### Layout
- Section title: "选择充值套餐" in `h2`, margin-bottom 24px
- Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- Gap: 20px

### Plan Card Design

Each plan card:
- **Container**: `Card Component`, padding 28px, text centered
- **Border**: 2px transparent, becomes `pink-400` when selected
- **Border radius**: `radius-lg`

#### Card Content
- **Energy Amount**: Large number, e.g., "500" in `number` token (36px), `text-primary`
- **Unit**: "⚡" in `gold`, 20px
- **Bonus Tag** (if applicable): pill badge, `accent-gradient`, white text, e.g., "+50 赠送"
- **Price**: "¥9.99" in `h2`, `pink-500`
- **Per-unit price**: "≈ ¥0.02/次" in `body-sm`, `text-muted`
- **Popular badge** (for recommended plan): "最受欢迎" ribbon at top-right corner, `gold` bg, white text

#### Plan Tiers

| Plan | Energy | Bonus | Price | Popular |
|------|--------|-------|-------|---------|
| 入门 | 100 | — | ¥1.99 | |
| 基础 | 300 | +20 | ¥4.99 | |
| 标准 | 500 | +50 | ¥9.99 | ★ |
| 高级 | 1000 | +150 | ¥18.99 | |
| 豪华 | 3000 | +600 | ¥49.99 | |
| 至尊 | 10000 | +2500 | ¥149.99 | |

#### Selected State
- Border: 2px `pink-400`
- Background: `pink-50`
- `shadow-glow` effect
- Radio indicator: filled `pink-400` circle at top-left

#### Card Hover
- `translateY(-4px)` + `shadow-lg`, 200ms
- Border: 1px `pink-200`

### Animations
- **Cards entrance**: Stagger in, slide up 20px + fade, 80ms stagger, 400ms
- **Card hover**: As described
- **Selection**: Border color transitions 200ms, glow appears 200ms, radio fills 150ms

---

## Section 4: Payment Method — Alipay

### Overview
Alipay QR code payment flow. Clean, step-by-step payment experience.

### Layout
- Appears below plan selection when a plan is selected
- Card: `Card Component`, max-width 480px, centered, padding 32px

### Elements

#### Element: "Selected Plan Summary"
- "已选择: 500⚡ + 50⚡赠送" in `body`
- "应付金额: ¥9.99" in `h3`, `pink-500`
- Divider: 1px `pink-100`

#### Element: "Alipay QR Code"
- Label: "使用支付宝扫码支付" in `h4`
- QR Code placeholder: 200px × 200px white square with centered "二维码" text
  - In implementation: generate actual Alipay QR
  - Border: 1px `pink-100`, `radius-md`
- Below QR: "打开支付宝扫一扫" in `body-sm`, `text-muted`
- Refresh button: "刷新二维码" link in `pink-500`, `body-sm`

#### Element: "Payment Status"
- Auto-checking payment status
- "等待支付..." with spinner animation
- After success: "支付成功! ✅" + redirect or balance update

#### Alternative
- "其他支付方式" expandable section (placeholder for future)
- "微信支付 (即将推出)" / "银行卡 (即将推出)" — disabled

### Animations
- **Section appears**: Slide down + fade, 400ms, after plan selection
- **QR code**: Fades in 300ms
- **Spinner**: Continuous rotation animation, 1s linear infinite
- **Success**: QR replaced by animated checkmark + success text, 500ms

---

## Section 5: Transaction History

### Overview
A clean list of past recharge transactions with date, amount, and status.

### Layout
- Section title: "交易记录" in `h2`, with `Clock` icon
- Card: `Card Component`, padding 0 (list bleeds to edges)

### Elements

#### Header Row
- Column headers: 日期 / 套餐 / 金额 / 状态
- Font: `label`, `text-muted`
- Background: `pink-50`, padding 12px 20px

#### Transaction Rows
Each row:
- Padding: 14px 20px
- Border-bottom: 1px `pink-50`
- Columns:
  - **日期**: "2024-12-15 14:32" in `body-sm`
  - **套餐**: "500⚡ + 50⚡赠送" in `body-sm`
  - **金额**: "¥9.99" in `body-sm`, `text-primary`, bold
  - **状态**: 
    - Completed: "已完成" pill, green bg, white text, `radius-full`
    - Pending: "处理中" pill, `gold` bg, white text + spinner
- Hover: `pink-50` bg, 150ms

#### Pagination
- Bottom of list
- "加载更多" button if more than 10 records

### Sample Data

| Date | Plan | Amount | Status |
|------|------|--------|--------|
| 2024-12-15 14:32 | 500⚡ + 50⚡ | ¥9.99 | 已完成 |
| 2024-12-01 09:15 | 300⚡ + 20⚡ | ¥4.99 | 已完成 |
| 2024-11-20 22:48 | 1000⚡ + 150⚡ | ¥18.99 | 已完成 |

### Animations
- **List entrance**: Rows stagger in, slide right 10px + fade, 40ms stagger, 300ms
- **Row hover**: Background color transition 150ms
- **Status badge**: Scale 0.9→1 on load, 200ms
