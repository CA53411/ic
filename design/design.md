# Platonic AI — Global Design Document

A healing, romantic AI virtual companion web application. The design evokes warmth, emotional intimacy, and gentle technology through a soft pink visual language, breathing gradient animations, and delicate micro-interactions.

---

## Page List

| Page | File | Route | Description |
|------|------|-------|-------------|
| Landing | `home.md` | `/` | Marketing homepage with hero, features, emotional intro |
| Auth | `auth.md` | `/auth` | Email login/signup with pink breathing animation background |
| Dashboard | `dashboard.md` | `/dashboard` | Main console: Big Five radar, milestones, energy, mood preview |
| Plaza | `plaza.md` | `/plaza` | Grid of browseable AI companion cards with personality tags |
| Customize | `customize.md` | `/customize` | Step-by-step companion creation with Big Five sliders |
| Chat | `chat.md` | `/chat` | Full-screen SSE streaming chat with breathing gradient bg |
| Memory | `memory.md` | `/memory` | 7x5 calendar grid with colored date highlights and detail sidebar |
| Drama | `drama.md` | `/drama` | Story plaza + immersive story chat interface |
| Payment | `payment.md` | `/payment` | Energy recharge center with plans and Alipay QR |
| Settings | `settings.md` | `/settings` | Language, account info, theme preferences |
| Crowdfunding | `crowdfunding.md` | `/crowdfunding` | Platonic feature funding plans with progress tracking |

---

## Color Palette

### Primary — Soft Pink Gradient
| Token | Hex | Usage |
|-------|-----|-------|
| `pink-50` | `#FFF5F7` | Page backgrounds, card backgrounds |
| `pink-100` | `#FFE4EC` | Light hover states, secondary backgrounds |
| `pink-200` | `#FFB6C1` | Primary accent, borders, light fills |
| `pink-300` | `#FF9EB5` | Medium accent, active states |
| `pink-400` | `#FF69B4` | Gradient end, bold accent |
| `pink-500` | `#E850A0` | Primary buttons, strong accent |

### Secondary — Deep Purple-Black Sidebar
| Token | Hex | Usage |
|-------|-----|-------|
| `sidebar-bg` | `#1A1025` | Sidebar navigation background |
| `sidebar-hover` | `#2A1A3A` | Sidebar item hover |
| `sidebar-active` | `#3D2652` | Sidebar active route highlight |
| `sidebar-text` | `#B8A9C9` | Sidebar secondary text |
| `sidebar-icon` | `#E8D5F5` | Sidebar icon default color |

### Accent — Rose Gold
| Token | Hex | Usage |
|-------|-----|-------|
| `rose-gold` | `#E8A0BF` | Emphasis, progress bars, highlights |
| `rose-gold-light` | `#F5C9D9` | Rose gold hover |
| `gold` | `#D4A574` | Milestone indicators, achievements |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `purple-memory` | `#C8A8E9` | Anterior Memory calendar highlight |
| `pink-memory` | `#FFB6C1` | LTM memory calendar highlight |
| `gold-milestone` | `#D4AF37` | Milestone dates on calendar |
| `text-primary` | `#2D1B2E` | Main body text (dark plum) |
| `text-secondary` | `#6B5B6E` | Secondary/caption text |
| `text-muted` | `#A093A5` | Placeholder, disabled text |

### Gradient Definitions
| Name | Definition | Usage |
|------|-----------|-------|
| `breathing-gradient` | `linear-gradient(135deg, #FFF5F7 0%, #FFE4EC 25%, #FFB6C1 50%, #E8A0BF 75%, #D4A5D4 100%)` | Breathing animation backgrounds (auth, chat) |
| `card-gradient` | `linear-gradient(180deg, #FFFFFF 0%, #FFF5F7 100%)` | Card surfaces |
| `accent-gradient` | `linear-gradient(135deg, #FF69B4 0%, #FFB6C1 100%)` | Buttons, active indicators |
| `sidebar-gradient` | `linear-gradient(180deg, #1A1025 0%, #2A1A3A 100%)` | Sidebar depth |

---

## Typography

| Token | Font | Size | Weight | Line-Height | Letter-Spacing | Usage |
|-------|------|------|--------|-------------|----------------|-------|
| `display` | ZCOOL QingKe HuangYou | 48px | 400 | 1.15 | -0.02em | Hero headlines, page titles |
| `h1` | ZCOOL QingKe HuangYou | 36px | 400 | 1.2 | -0.01em | Section headings |
| `h2` | Nunito | 28px | 700 | 1.3 | 0 | Sub-section headings |
| `h3` | Nunito | 22px | 700 | 1.35 | 0 | Card titles, labels |
| `h4` | Nunito | 18px | 600 | 1.4 | 0 | Small headings |
| `body` | Nunito | 15px | 400 | 1.65 | 0.005em | Body paragraphs |
| `body-sm` | Nunito | 13px | 400 | 1.6 | 0.01em | Captions, descriptions |
| `label` | Nunito | 12px | 600 | 1.3 | 0.04em | Uppercase labels, badges |
| `number` | DM Sans | 42px | 700 | 1.0 | -0.03em | Big energy numbers, stats |
| `number-sm` | DM Sans | 20px | 600 | 1.1 | -0.01em | Small numerical values |

### Font Loading
```html
<link href="https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&family=Nunito:wght@400;600;700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
```

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Micro gaps, icon padding |
| `sm` | 8px | Tight element spacing |
| `md` | 16px | Card internal padding, gap |
| `lg` | 24px | Section padding, card gap |
| `xl` | 32px | Section vertical spacing |
| `2xl` | 48px | Major section padding |
| `3xl` | 64px | Hero spacing |
| `sidebar-width` | 220px | Fixed sidebar width |
| `preview-width` | 320px | Phone-size preview panel width |
| `content-max` | 1200px | Maximum content area width |

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Small buttons, badges |
| `radius-md` | 12px | Input fields, small cards |
| `radius-lg` | 16px | Cards, modals |
| `radius-xl` | 24px | Hero cards, large containers |
| `radius-full` | 9999px | Circular avatars, pills |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 3px rgba(45,27,46,0.06)` | Subtle elevation |
| `shadow-md` | `0 4px 16px rgba(45,27,46,0.08)` | Cards at rest |
| `shadow-lg` | `0 8px 32px rgba(45,27,46,0.12)` | Cards hover, modals |
| `shadow-glow` | `0 0 24px rgba(255,182,193,0.25)` | Pink glow effect on focus/active |
| `shadow-sidebar` | `4px 0 24px rgba(26,16,37,0.15)` | Sidebar depth shadow |

---

## Animation & Motion

### Global Timing Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default transitions |
| `ease-bounce` | `cubic-bezier(0.68, -0.3, 0.32, 1.3)` | Playful micro-interactions |
| `ease-smooth` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Smooth page transitions |
| `duration-fast` | 150ms | Button hovers, toggles |
| `duration-normal` | 300ms | Card transitions, reveals |
| `duration-slow` | 500ms | Section entrances |
| `duration-entrance` | 700ms | Page-level animations |

### Breathing Animation (CSS Keyframes)
Used on Auth background and Chat background. A soft, slow pink-purple gradient pulse that creates a living, warm atmosphere.

```css
@keyframes breathing-gradient {
  0%, 100% {
    background-position: 0% 50%;
    filter: brightness(1) saturate(1);
  }
  50% {
    background-position: 100% 50%;
    filter: brightness(1.05) saturate(1.08);
  }
}

.breathing-bg {
  background: breathing-gradient;
  background-size: 400% 400%;
  animation: breathing-gradient 8s ease-in-out infinite;
}
```

### Floating Orbs Animation (Decorative)
Soft pink orbs float slowly across the background for the auth and chat pages:

```css
@keyframes float-orb {
  0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
  33% { transform: translate(30px, -40px) scale(1.1); opacity: 0.5; }
  66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.4; }
  100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
}
```
3 orbs with staggered animation-delay (0s, 2.5s, 5s), sizes 200px–400px, blur 80px, positioned absolute.

### Standard Entrance Pattern
Elements enter the viewport with a consistent pattern:
- `opacity: 0` → `opacity: 1`
- `translateY(30px)` → `translateY(0)`
- Duration: 600ms
- Easing: ease-smooth
- Trigger: when element enters 15% from bottom of viewport
- Stagger: 80ms between sibling elements

### Hover Micro-Interactions
- Buttons: `scale(1.03)` + `shadow-glow`, 150ms
- Cards: `translateY(-4px)` + `shadow-lg`, 200ms
- Sidebar items: background color shift + icon `scale(1.1)`, 150ms
- Links: underline expand from center, 200ms
- Avatar: `scale(1.08)` + ring glow, 200ms

### Page Transitions
- Exit: fade out 200ms
- Enter: fade in + slide up 20px, 400ms, ease-smooth
- Between app pages (sidebar nav): instant with content fade, no full page reload feel

---

## Shared Components

### Sidebar Navigation
- **Background**: `sidebar-bg` (#1A1025) with `shadow-sidebar`
- **Width**: 220px fixed, full viewport height
- **Layout**: vertical flex, logo at top, nav items in middle, user mini-profile at bottom
- **Logo**: "Platonic" wordmark in `pink-200`, 24px, with small sparkle icon
- **Nav Items**: icon (20px) + label in `sidebar-text`, vertical padding 12px, horizontal padding 20px
  - Items: Dashboard, Plaza, Chat, Memory, Drama, Payment, Settings
  - Active state: `sidebar-active` background + left border 3px `pink-400` + text white
  - Hover: `sidebar-hover` background + `sidebar-icon` color shift to `pink-200`
- **User Mini-Profile**: avatar (36px circle) + username (13px) + energy dot indicator (8px, `pink-400`)
- **Bottom Section**: "Crowdfunding" link with heart icon, subtle `rose-gold` highlight
- **Animation**: Items stagger fade-in on page load (60ms delay each). Active indicator slides with 200ms spring transition.

### Top Bar (Dashboard & App Pages)
- **Height**: 56px, transparent background, content overlaps into page
- **Left**: Page title in `h2` style
- **Right**: Notification bell (with dot indicator) + user avatar dropdown
- **Animation**: Title fades in from left (300ms), right elements fade in from right (300ms, 100ms delay)

### Card Component
- **Background**: white with `card-gradient`
- **Border**: 1px solid `pink-100`
- **Border Radius**: `radius-lg` (16px)
- **Shadow**: `shadow-md` at rest, `shadow-lg` on hover
- **Padding**: `md` (16px) or `lg` (24px) depending on size
- **Hover**: `translateY(-4px)` + `shadow-lg`, 200ms ease-default
- **Transition**: all 200ms ease-default

### Button Variants
| Variant | Background | Text | Border | Hover | Active |
|---------|-----------|------|--------|-------|--------|
| Primary | `accent-gradient` | white | none | brightness(1.08) + glow | brightness(0.95) |
| Secondary | `pink-50` | `pink-500` | 1px `pink-200` | `pink-100` bg | `pink-200` bg |
| Ghost | transparent | `text-primary` | 1px `pink-100` | `pink-50` bg | `pink-100` bg |
| Icon | `pink-50` | `pink-500` | none | `pink-100` + scale(1.08) | scale(0.97) |
| Danger | `#FEE2E2` | `#DC2626` | none | `#FECACA` | brightness(0.95) |

### Input Field
- **Background**: white
- **Border**: 1px solid `pink-100`, radius `radius-md`
- **Padding**: 12px 16px
- **Focus**: border `pink-400` + `shadow-glow`
- **Placeholder**: `text-muted`
- **Transition**: border-color 200ms, box-shadow 200ms

### Badge/Tag
- **Background**: `pink-50`
- **Text**: `pink-500`, `label` token
- **Border Radius**: `radius-full` (pill)
- **Padding**: 4px 12px
- **Variants**: `gold` (for milestone), `purple` (for memory), `green` (for active)

### Progress Bar
- **Height**: 8px
- **Background Track**: `pink-50`
- **Fill**: `accent-gradient` or `rose-gold` depending on context
- **Border Radius**: `radius-full`
- **Animation**: width transition 800ms ease-smooth on value change

### Modal/Drawer
- **Overlay**: rgba(26,16,37,0.4) backdrop-blur(4px)
- **Panel**: white bg, `radius-xl`, `shadow-lg`
- **Entry**: scale(0.95) + opacity(0) → scale(1) + opacity(1), 300ms ease-bounce
- **Exit**: reverse, 200ms
- **Drawer variant**: slides from right, 400ms ease-smooth

---

## Assets

### Image Assets

| Filename | Description | Page | Dimensions | Type |
|----------|-------------|------|-----------|------|
| `hero-bg.jpg` | Soft dreamy pink-purple watercolor wash background with gentle cloud-like formations, healing and warm atmosphere | home | 1920x1080 16:9 | Image |
| `companion-1.jpg` | Portrait illustration of a gentle young woman with soft brown hair and warm smile, anime-influenced but realistic, soft pink lighting | plaza | 400x500 3:4 | Image |
| `companion-2.jpg` | Portrait illustration of a confident young woman with short black hair and sparkling eyes, anime-influenced, soft rose-gold lighting | plaza | 400x500 3:4 | Image |
| `companion-3.jpg` | Portrait illustration of a shy bookish young woman with glasses and long silver hair, anime-influenced, warm lavender lighting | plaza | 400x500 3:4 | Image |
| `companion-4.jpg` | Portrait illustration of an energetic young woman with red hair in a ponytail, bright smile, anime-influenced, warm coral lighting | plaza | 400x500 3:4 | Image |
| `companion-5.jpg` | Portrait illustration of a mysterious elegant woman with dark purple hair and gentle eyes, anime-influenced, moonlit pink lighting | plaza | 400x500 3:4 | Image |
| `companion-6.jpg` | Portrait illustration of a cheerful girl with twin-tails and flower accessories, warm golden-pink lighting, anime-influenced | plaza | 400x500 3:4 | Image |
| `drama-cover-1.jpg` | Romantic fantasy scene of a cherry blossom garden at twilight with two silhouetted figures, soft pink and purple tones, painterly style | drama | 600x800 3:4 | Image |
| `drama-cover-2.jpg` | Cozy coffee shop interior with warm lighting, rain on windows, soft pink and amber tones, illustration style | drama | 600x800 3:4 | Image |
| `drama-cover-3.jpg` | Starry night sky over a quiet lakeside with a small glowing lantern, dreamy purple-blue tones, painterly style | drama | 600x800 3:4 | Image |
| `drama-cover-4.jpg` | Victorian-era garden party scene with soft pastel colors and flower decorations, romantic illustration style | drama | 600x800 3:4 | Image |
| `crowdfunding-hero.jpg` | Abstract 3D render of glowing heart-shaped particles floating in soft pink-purple space, technological yet warm, futuristic healing aesthetic | crowdfunding | 1920x600 21:9 | Image |
| `live2d-preview.jpg` | Preview mockup showing a Live2D animated character on the left side of a phone screen with expressive face and subtle movement blur | crowdfunding | 800x600 4:3 | Image |
| `pet-preview.jpg` | Preview mockup showing a cute virtual pet (small fox-like creature) sitting at the bottom of a phone screen with soft glow around it | crowdfunding | 800x600 4:3 | Image |
| `tts-preview.jpg` | Abstract visualization of sound waves in soft pink and purple gradient forming a heart shape, technological but warm | crowdfunding | 800x600 4:3 | Image |
| `logo.svg` | Platonic wordmark logo with a small four-pointed sparkle/star icon, minimal vector, pink gradient fill | all | 160x40 | SVG |
| `default-avatar.jpg` | Soft pastel gradient circle with a minimal silhouette outline, warm pink-purple tones | all | 200x200 1:1 | Image |

### Icon Library

Use `lucide-react` for all icons. Key icons used across pages:
- Navigation: `LayoutDashboard`, `Users`, `MessageCircle`, `Calendar`, `BookOpen`, `Zap`, `Settings`, `Heart`, `Sparkles`
- UI: `Send`, `Image`, `Smile`, `ChevronLeft`, `ChevronRight`, `ChevronDown`, `X`, `Menu`, `Bell`, `Search`, `Plus`, `Edit3`, `Trash2`, `Lock`, `Eye`, `EyeOff`, `Check`, `Star`, `Clock`, `TrendingUp`, `Battery`, `Globe`

---

## Responsive Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| Mobile | < 768px | Single column, sidebar becomes bottom nav or hamburger menu, preview panel hidden |
| Tablet | 768–1024px | Sidebar collapses to icons-only (72px), content area adjusts |
| Desktop | 1024–1440px | Full sidebar + content + preview panel |
| Wide | > 1440px | Content area maxes at 1200px, extra space on sides |

---

## Scroll Behavior

- **Lenis** smooth scrolling enabled on all pages
- **Scroll-triggered reveals**: IntersectionObserver at 15% from bottom
- **No pinning** on dashboard/app pages (free scroll)
- **Landing page**: Possible pinned hero section with scroll-driven content reveal
- **Back-to-top**: Floating pill button appears after 400px scroll, bottom-right, `pink-400` bg, white arrow icon
