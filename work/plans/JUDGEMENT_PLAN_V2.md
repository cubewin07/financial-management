# Plan V2 for Judgement — WealthVision Stitch realignment (branch redesin_UI)

You are a **judgement/review** agent. Review this plan and either `APPROVE` it
or request **specific** modifications. Be terse.

## CONTEXT
- React18 + Vite + Tailwind + framer-motion + recharts + lucide-react.
- Stitch "WealthVision / Luminous" design lives in `stitch_screens/{3,4,7}_*.html`
  (authoritative HTML; PNG-only 1,2,6,8,9 are variants of the same screens).
- `src/styles/design-tokens.css` matches Stitch exactly. `npm run build` passes (2.09s).
- Prior pass (JUDGEMENT_PLAN.md, APPROVE) shipped 3 fixes: body bg warm radials,
  sidebar gradient logo mark, framer-motion layoutId nav accent. All verified in tree.

## AUDIT SCOPE — every screen mapped
Per-page comparison done against the 3 authoritative HTML screens + PNG variants:
- Dashboard (3_), Subscriptions (4_), Monthly Breakdown (7_), plus Savings,
  Investments, Notifications, Budget Settings, Login, and the shared shell
  (Sidebar, Topbar, AppShell, tokens.css, index.css).

## CONFIRMED MISMATCHES (only real drift, ranked)

### M1 — Stale indigo palette leaking through `src/index.css` (CROSS-PAGE, #1)
`index.css` is imported AFTER `design-tokens.css`, so 7 indigo rules **override**
the matching Stitch-correct token rules. Confirmed by grep:
```
src/index.css:
  66-67  .input-shell:focus { border-color: rgba(124,111,224,.35); box-shadow:0 0 0 4px rgba(124,111,224,.12) }
        (overrides design-tokens.css:158 .input-shell:focus { var(--primary) + rgba(208,188,255,.5) } on EVERY form input)
  96     .finance-range-picker .rdp-range_middle-background-color: rgba(124,111,224,.12)
  161    .status-spinner border: 2px solid rgba(124,111,224,.3); border-top-color var(--accent-purple)
  194    .status-shimmer gradient middle stop rgba(124,111,224,.35)
  202-3  .auth-grid-overlay grid lines rgba(124,111,224,.1)
```
`rgba(124,111,224)` is the OLD pre-redesign indigo; Stitch primary is `#d0bcff`
(= rgba(208,188,255)). Every focused input (Budget Settings, Savings modal,
SpendingBreakdown date/select, Topbar search) currently glows indigo, not purple.

### M2 — Topbar search is a square input, not the Stitch pill (DASHBOARD/BREAKDOWN)
Stitch (3_:166, 7_:166): `rounded-full ... bg-surface-container/50 border border-white/10`,
search icon left. Current Topbar.jsx:107-114 uses `input-shell` (square, radius-lg)
and is `border-transparent`. Reads as a plain form box, not the design's pill.

### M3 — Notification dot is cyan in Stitch, pink in app (SHELL)
Stitch (3_:170): `bg-secondary-container` cyan dot with cyan glow.
Topbar.jsx:57 uses `bg-[var(--tertiary)]` (pink) + pink glow. Mismatched accent.

### M4 — 'Add New' / 'Add Expense' CTA placement (SHELL)
Stitch renders an always-visible gradient **'Add New'** button inside the sidebar
(3_:107, 4_:134) AND an 'Add Expense' button in the top bar (3_:175, 4_:113, 7_:177).
Current app: 'Add Expense' only appears as a thin right-aligned row above the
route content (App.jsx:301-311), only when `canManageBudget`. No sidebar CTA,
no topbar CTA. The primary design affordance is missing from the chrome.

## PLAN — 4 surgical edits, ~40 lines

### EDIT 1 — `src/index.css`: replace 5 indigo rules with Stitch tokens
Swap `rgba(124,111,224,*)` -> `rgba(208,188,255,*)` (the --primary #d0bcff) at
lines 66-67, 96, 161, 194, 202-203. Strict find/replace of the single color; no
rule structure changed. This removes the cross-page indigo leak and lets
design-tokens.css' own `.input-shell:focus` theme take effect. ~7 lines touched,
behavior identotherwise.
Deliberate keep: the spinner/shimmer/auth-grid *shapes* are fine — only their
color token was wrong.

### EDIT 2 — `src/components/shell/Topbar.jsx`: pill search + cyan notification dot
- Search input (107-114): drop `input-shell` class, use Stitch pill:
  `className="bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-full py-1.5 pl-9 pr-4 h-9 w-64 text-label-md focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/40 transition-all"`.
- Notification dot (57): `--tertiary` -> `--secondary-container`,
  `shadow-[0_0_8px_var(--tertiary)]` -> `shadow-[0_0_8px_rgba(0,238,252,0.8)]`.

### EDIT 3 — `src/components/shell/Sidebar.jsx`: 'Add New' gradient CTA
Add the always-visible gradient button below the brand (before nav), per
3_:107-111 / 4_:134-137:
```jsx
<div className="px-4 mb-4">
  <button type="button" className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] text-[var(--on-primary)] font-label-md font-semibold shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:shadow-[0_0_30px_rgba(208,188,255,0.5)] transition-shadow flex items-center justify-center gap-2">
    <Plus size={18} /> Add New
  </button>
</div>
```
Wire onClick -> opens Add Expense modal. This CTA must be owned by App.jsx
(it holds the modal + `canManageBudget` gate), so Sidebar needs an
`onAddExpense` prop threaded from App -> AppShell -> Sidebar; gate the button
visibility on `canManageBudget` to match today's permission model (reviewers/
viewers cannot add). ~3 lines prop-threading + ~6 lines button.

### EDIT 4 — Remove the now-redundant inline 'Add Expense' row (App.jsx)
With the sidebar CTA in place, delete the standalone right-aligned button block
at App.jsx:301-311. Keeps a single design-aligned affordance instead of two.

## NON-GOALS (YAGNI for this pass)
- Per-page localized ambience glows (glows exist already; M1 is color, not presence).
- Route-level code-splitting (bundle >650kB flagged; not now).
- Savings `prompt()` -> modal swap (functional, not a Stitch mismatch).
- SpendingBreakdown `<select>` -> pill picker (native select is defensible & a11y-good).
- Count-up balance animation; breakdown chart orientation — defensible product choices.

## VERIFICATION
1. `npm run build` MUST pass.
2. Focus any input -> glow is Stitch purple `#d0bcff`, not indigo.
3. Topbar search is a rounded-full pill; notification dot is cyan.
4. Sidebar shows gradient 'Add New' CTA (owner only); Add Expense row removed.

## YOUR RESPONSE FORMAT
Reply with exactly one of:
- `APPROVE` (optionally + minor notes), or
- `CHANGES REQUIRED:` followed by a numbered list of specific, implementable
  modifications.

If approved, the main Claude session implements immediately.
