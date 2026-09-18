# Plan for Judgement — WealthVision Stitch realignment (branch redesin_UI)

You are a **judgement/review** agent. Review this plan and either `APPROVE` it
or request **specific** modifications. Be terse.

## CONTEXT
- React18 + Vite + Tailwind + framer-motion + recharts + lucide-react.
- Stitch "WealthVision" design reference lives in `stitch_screens/*.html`.
- `src/styles/design-tokens.css` already matches Stitch exactly:
  `#15121b` bg, `#d0bcff` primary, `#00eefc` secondary-container,
  Plus Jakarta Sans, `.glass-card` (5% white tint + blur), radius 1.5rem.
- Build currently passes (`npm run build` -> 3209 modules, 2.1s).

## CONFIRMED PROBLEM
`src/index.css` `body{ background:... }` uses a **darker indigo** scheme
(`#0a0a0f` / `#0d0d14` gradients + `rgba(124,111,224)` accent) that diverges
from the Stitch `#15121b` warm near-black with purple/cyan radials. Every page
is wrapped in `<body>`, so **every screen reads cooler/darker than the design**.
This is the #1 design-drift gap (cross-page).

## PLAN — 3 surgical edits, ~26 lines total

### EDIT 1 — `src/index.css` (body background + selection)
Replace the indigo gradient stack in `body` with Stitch-aligned warm
purple/cyan radials over `#15121b`:

```css
body {
  background:
    radial-gradient(ellipse at top right, rgba(208,188,255,0.08), transparent 55%),
    radial-gradient(circle at 90% 10%, rgba(0,238,252,0.06), transparent 25%),
    linear-gradient(180deg, #15121b 0%, #0f0d15 100%);
}
```
- Keep `--bg-app: var(--background)` map untouched (it already points at `#15121b`).
- Swap selection color `rgba(124,111,224,0.34)` -> `rgba(208,188,255,0.34)`
  to match the `--primary` token.
- No other rules touched. `.glass-card`, `.input-shell` etc. above inherit
  unchanged and were never the culprit (prior investigation confirmed).

### EDIT 2 — `src/components/shell/Sidebar.jsx` (logo mark)
Add the gradient **logo-mark badge** that every Stitch screen renders beside
the wordmark (currently the sidebar shows bare "Luminous" text):

```jsx
<div className="h-16 flex items-center gap-3 px-6">
  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary-container)] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.3)]">
    <Wallet size={18} className="text-[var(--background)]" />
  </div>
  <span className="text-headline-md text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)]">
    Luminous
  </span>
</div>
```
- `Wallet` imported from `lucide-react` (already a dependency). No new dep.
- Token-derived colors only — stays in design system.

### EDIT 3 — `src/components/shell/Sidebar.jsx` (sliding active accent)
Convert the active NavLink accent bar from a conditional-rendered `<div>` to a
framer-motion **shared `layoutId`** element so the glow bar **slides** between
items instead of appearing/disappearing:

```jsx
import { motion } from 'framer-motion';
// ...inside NavLink render:
{isActive && (
  <motion.div
    layoutId="nav-active-bar"
    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--primary)] rounded-r-full shadow-[0_0_8px_var(--primary)]"
    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
  />
)}
```
- framer-motion already installed. `prefers-reduced-motion` is handled by
  framer's default `useReducedMotion` in layout animations.
- ~4 lines net change.

## NON-GOALS (deliberately skipped — YAGNI for this pass)
- Per-page localized ambience glows.
- Route-level code-splitting (bundle 1.14MB; flagged, not now).
- Count-up motion hooks for balances.
- Breakdown chart reorientation (vertical bars are a defensible product choice).
- Savings `prompt()` -> modal swap.

## VERIFICATION
1. `npm run build` MUST still pass.
2. Visually the app canvas now carries the warm purple/cyan tint matching
   `stitch_screens/3_…png` / `7_…png`.
3. Sidebar shows logo mark; active nav accent slides.

## YOUR RESPONSE FORMAT
Reply with exactly one of:
- `APPROVE` (optionally + minor notes), or
- `CHANGES REQUIRED:` followed by a numbered list of specific, implementable
  modifications.

If approved, the main Claude session implements immediately.
