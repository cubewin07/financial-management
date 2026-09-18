# Finance Tracker — Shell Lock (Luminous Velocity)

> This file reflects the "Luminous Velocity" design system for your personal
> finance/budget tracker from `DESIGN.md`: glassmorphic, neon-accented, 
> violet/cyan/pink dark fintech.

---

## Step 0 — Navigation pattern: still a sidebar

`DESIGN.md` itself specifies a persistent 260px left sidebar with its own
active-state and selection styling — this isn't a judgment call, it's
already decided in the design system. Your app currently has 3 pages
(Dashboard, Subscriptions, Spending Breakdown), which sits comfortably in a
sidebar without needing to invent extra nav items to justify it.

---

## Locked Design Tokens (from `DESIGN.md`)

### Colors

| Token | Value | Use |
|---|---|---|
| `background` / `surface` | `#15121b` | Base app background |
| `surface-container-lowest` | `#0f0d15` | Deepest recess (e.g. modal backdrop) |
| `surface-container` / `-low` / `-high` / `-highest` | `#211e27` / `#1d1a23` / `#2c2832` / `#37333d` | Card/panel layering |
| `on-surface` | `#e7e0ed` | Primary text |
| `on-surface-variant` | `#cbc3d7` | Secondary text |
| `outline` / `outline-variant` | `#958ea0` / `#494454` | Borders, dividers |
| **`primary`** (Electric Violet) | `#d0bcff` | Main actions, active states, gradient start |
| `on-primary` | `#3b0091` | Text on primary-filled surfaces |
| `primary-container` | `#9f78ff` | Gradient stop / secondary primary surface |
| **`secondary`** (Cyan Neon) | `#d3fbff` / container `#00eefc` | Data viz, secondary indicators |
| **`tertiary`** (Neon Pink) | `#ffb0ca` / container `#f15999` | Status alerts, gradient stop |
| `error` / `error-container` | `#ffb4ab` / `#93000a` | Errors only |

Full fixed/inverse variants are in `DESIGN.md` if you need state variants
beyond this list — this table is the everyday subset.

### Typography — Plus Jakarta Sans

| Style | Size / Weight / Line-height |
|---|---|
| `display` | 48px / 700 / 1.2, -0.02em tracking |
| `headline-lg` (28px on mobile) | 32px / 700 / 1.2 |
| `headline-md` | 24px / 600 / 1.3 |
| `body-lg` | 18px / 500 / 1.6 |
| `body-md` | 16px / 400 / 1.6 |
| `label-md` | 14px / 500 / 1.4, +0.01em |
| `label-sm` | 12px / 500 / 1.4, +0.02em |

### Shape & Spacing

| Token | Value | Applied to |
|---|---|---|
| `rounded-xl` | 1.5rem (24px) | Glass cards |
| `rounded-lg` | 1rem (16px) | Buttons, inputs |
| `rounded-full` | pill | Progress bars, sidebar active indicator |
| `sidebar-width` | 260px | Fixed, persistent |
| `gutter` | 24px | Between glass cards |
| margins | 40px / 24px / 16px | Desktop / tablet / mobile |

### Elevation & Glass Treatment

- Glass surface: `rgba(255,255,255,0.05)` background + `backdrop-filter: blur(20px)`
- Card border: 1px `rgba(255,255,255,0.1)`, plus a 1px white-10% top inner highlight to fake a glass edge catching light
- Priority cards / primary buttons: soft outer glow (`box-shadow`) matching the primary gradient color — depth comes from glow and blur, not flat borders

---

## Sidebar (locked component)

- **260px fixed width**, persistent, no icon-rail collapse mode — mobile
  reflow is: cards stack, sidebar becomes a bottom nav bar or a
  hamburger-triggered overlay (per `DESIGN.md`, not a shrink-to-64px rail)
- **Nav items: Dashboard, Subscriptions, Spending Breakdown** — the 3 pages
  that actually exist. Do not add Investments/Savings Goals (flagged ❌ NOT POSSIBLE in your own feasibility
  audit) — only extend this list when a page is actually built
- **Active state:** low-opacity primary-color background tint + a 4px
  vertical pill-shaped "light bar" on the left edge of the active item
- Avatar/session area: bottom of sidebar

## Topbar

`DESIGN.md` doesn't specify a topbar in detail (the system is sidebar +
12-col content grid), so keep it minimal and consistent with the glass
language: optional search, notification, avatar/session menu — styled with
the same blur/glow treatment, violet focus rings instead of any amber.

## Locked Component Treatments

- **Buttons:** primary = linear gradient (violet → pink) with a matching
  color shadow; secondary = ghost-glass with a subtle border
- **Glass cards:** backdrop-blur(20px), 1px white-10% border + top inner
  highlight, `rounded-xl`
- **Progress bars:** dual-layer — dark track, gradient fill, fill has a
  slight outer glow ("lit from within")
- **Charts:** neon-colored data points; area charts use a vertical gradient
  that fades to transparent at the bottom to keep the glass feel consistent
- **Inputs:** dark background, border glows primary color on focus

---

## Domain

This is a **personal finance / budget tracker**. Nav
items, page names, and data concepts stay scoped to what the app actually
does (expenses, subscriptions, budget, spending breakdown).

---

## Step 1 — Shell-Lock Prompt for Stitch (run this first, reference page only)

```
Design a single reference screen: the Dashboard, for a personal finance
tracker. This screen locks a design system every future screen must reuse
exactly — treat the tokens below as a fixed contract, not a suggestion.

AESTHETIC: "Luminous Velocity" — premium, high-tech fintech. Deep immersive
dark theme using Glassmorphism and Neon Accents for depth and focus.
Sophisticated yet energetic: vibrant violet/cyan/pink gradients against an
obsidian backdrop. "Cyber-premium," not playful SaaS. Hierarchy comes from
luminous glows and blur layering, not flat borders.

[Paste the full Colors / Typography / Shape & Spacing / Elevation tables
above, verbatim]

SIDEBAR: 260px fixed, persistent left. Nav: Dashboard, Subscriptions,
Spending Breakdown. Active state = primary-tint background + 4px pill light
bar on left edge. Avatar/session at bottom.

DASHBOARD CONTENT: balance/budget hero card (glass, glow), monthly spending
chart, recent transactions list, subscription preview widget — use glass
cards throughout, rounded-xl, 24px gutters.

DELIVERABLE: this one screen at high fidelity. Flag which elements are
"locked shell" (sidebar/tokens) vs "page-specific content" so I can extract
the shell cleanly.
```

## Step 2 — Freeze the shell

Same process as before: take the actual rendered hex/spacing values Stitch
outputs, not just what you asked for, and treat those as ground truth for
every later prompt.

## Step 3 — Batches

Use `DESIGN_PLAN.md`'s existing phases as your batches — no need to
reinvent grouping:
- Phase 1: Foundation (design-tokens.css, AppShell, Sidebar, Topbar, Auth)
- Phase 2: Dashboard
- Phase 3: Subscriptions
- Phase 4: Spending Breakdown
- Phase 5: Expense management
- Phase 6: Comments & reviewer flow
- Phase 7: Polish & integration

Each batch prompt still pastes this shell spec in verbatim — same rule as
before, just correct tokens now.
