# Design

Visual system for the BookScanner web app. Strategy and voice live in `PRODUCT.md`. Tokens live in
`frontend/web-ui/src/styles/globals.css` (HSL triplets used as `hsl(var(--token))` through `tailwind.config.ts`).

## Scene
A reader at a bookstore or library shelf, phone in one hand, mixed indoor light, a minute or two. Light theme by
default (follows the device), full dark theme for evening reading.

## Color (Restrained)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | 150 12% 98% | 160 14% 7% | page |
| `--card` | white | 160 12% 10% | surfaces |
| `--foreground` | 160 22% 11% | 150 12% 92% | text |
| `--muted-foreground` | 160 8% 36% | 150 8% 68% | secondary text (AA on bg and card) |
| `--primary` | 162 62% 26% (bottle green) | 156 46% 56% | primary action, selection, current page only |
| `--accent` | 156 38% 93% | 160 22% 16% | selected / active tint |
| `--success` `--warning` `--destructive` | semantic | semantic | status only, never decoration |

No gradients on surfaces or text. No raw Tailwind palette colors (`blue-500`, `purple-400`…) in components.

## Type
- UI: system font stack (`--font-sans`, SF Pro on Apple). Book titles: serif (`.book-title`, Iowan Old Style /
  Palatino / Georgia). No web fonts are loaded.
- Sizes: page title 24/30px semibold, section 18px semibold, body 14–16px, meta 12px. `text-wrap: balance` on h1–h3.

## Components
- Buttons: `Button` (`primary`, `outline`, `ghost`, `destructive`), 44px tall by default, `loading` prop.
- Chips: rounded-full, 40px tall, `aria-pressed`.
- Filters: pill tabs with `role="tab"`.
- Empty states: dashed box, icon tile, one sentence that explains the next step, one button.
- Loading: skeleton blocks for lists; step list + progress bar for scans.
- Covers: 2:3, `rounded-md`, `shadow-sm`, placeholder `/placeholder-book.svg`.

## Motion
150–250 ms color transitions, `active:scale-[0.98]` on buttons. The only looping animation is `.scan-sweep` over
the photo during a scan, hidden under `prefers-reduced-motion`. No bounce, ping or decorative pulse.

## Layout
Content column `max-w-3xl` (Library `max-w-5xl`). Phone: bottom tab bar (Scan, For you, Library, History,
Settings), toasts and sticky action bars sit above it. Desktop: the same sections as top-bar links.
