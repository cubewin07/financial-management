# Definitive List of Stitch-Spec Visual Techniques Missing from Current App

Based on a comprehensive extraction of `.html` design spec files (`3_WealthVision_Vibrant_Gradient_Dashboard.html`, `4_WealthVision_Subscription_Management.html`, `7_WealthVision_Monthly_Breakdown.html`) and design decision documents in `work/plans/` (`AGY_VERDICT_V2.md`, `DECISION_LOG.md`, `JUDGEMENT_PLAN.md`, `JUDGEMENT_PLAN_V2.md`, `polish_order_1.txt`, `polish_order_2.txt`, `polish_order_3.txt`), the following Stitch visual techniques are identified as missing or incomplete in the current application implementation.

## 1. Form Styling Gaps
- **Semi-Transparent Glass Input Shells**:
  - *Stitch Spec*: Inputs use `bg-surface-container/50` or `bg-surface-container-highest/50` with `border border-white/10` (or `border-white/5`) and `backdrop-blur`.
  - *App Gap*: Current `.input-shell` uses a solid, dark background (`--surface-container-lowest` `#0f0d15`) instead of a semi-transparent glass layer with backdrop blur.
- **Pill-Shaped Header Search Input**:
  - *Stitch Spec*: `rounded-full` expandable search input (`w-32 focus:w-48` or `w-64`) with left-aligned search icon and smooth expansion transition (`transition-all`).
  - *App Gap*: Header search is rendered with standard rectangular input styling (`rounded-lg` / `input-shell`) rather than the pill spec.
- **Input Group Focus Color Synchronization**:
  - *Stitch Spec*: Search icons and input icon adornments use `group-focus-within:text-secondary-fixed transition-colors` or `group-focus-within:text-primary` to dynamically change color on field focus.
  - *App Gap*: Icons inside input wrappers remain static in color when inputs gain focus.
- **Stitch-Compliant Focus Glow & Ring Tokens**:
  - *Stitch Spec*: Dynamic cyan/purple focus rings (`focus:border-secondary-fixed/50 focus:ring-0` or `focus:ring-2 focus:ring-secondary-container/50`).
  - *App Gap*: Legacy indigo overrides (`rgba(124,111,224)`) previously leaked through focus states instead of pure Stitch primary/secondary tokens (`#d0bcff` / `#00eefc`).
- **Primary-Fixed Selection Highlighting**:
  - *Stitch Spec*: `selection:bg-primary/30 selection:text-primary-fixed`.
  - *App Gap*: Text selection styles lack explicit `selection:text-primary-fixed` token mapping.

## 2. Decorative & Lighting Effect Gaps
- **Interactive Ambient Glow Orbs (Blur Orbs)**:
  - *Stitch Spec*: Radial glow circles placed in card corners (`absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/20 transition-all duration-500` or `bg-secondary-container/10 blur-2xl`).
  - *App Gap*: Summary metric cards and section panels lack background ambient blur orbs that intensify on hover.
- **Neon Text & Glow Drop-Shadow Utilities**:
  - *Stitch Spec*: Distinct glow text and box-shadow classes:
    - Text glow: `neon-text-primary` and `gradient-text`.
    - Box/Panel glow: `neon-glow-primary` and `neon-glow-secondary`.
    - Chart line & SVG node glows: `drop-shadow-[0_0_6px_rgba(208,188,255,0.8)]` on SVG trend paths, `drop-shadow-[0_0_8px_rgba(208,188,255,1)]` on active chart dots, and `drop-shadow-[0_0_8px_rgba(208,188,255,0.6)]` on progress ring indicators.
  - *App Gap*: Charts and key metric text display flat SVG lines and static text without neon drop-shadow glow filters.
- **"Lit-from-Within" Progress Bars**:
  - *Stitch Spec*: Dual-layer progress bar indicators with glowing caps/fills (`shadow-[0_0_10px_rgba(0,238,252,0.8)]`, `shadow-[0_0_10px_rgba(159,120,255,0.8)]`, and `shadow-[0_0_10px_rgba(208,188,255,0.5)]`).
  - *App Gap*: Progress bar fills are flat gradients without outer glow box-shadows.
- **Background Radial Canvas Depth**:
  - *Stitch Spec*: Multi-stop top-right radial mesh: `bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-dim via-background to-surface-container-lowest`.
  - *App Gap*: App background uses basic body background fallback rather than localized top-right radial gradient canvas depth.
- **Double-Layer Logo Mark Badge & Floating Icons**:
  - *Stitch Spec*: Logo icon badges wrapped in gradient borders (`w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary p-0.5` wrapping inner `bg-surface rounded-[6px]`), and decorative rotated background icons (`transform rotate-12 opacity-20 group-hover:opacity-40`).
  - *App Gap*: Brand logos and background card watermarks lack the double-layered gradient padding and angled icon overlays.
- **Technical Guideline Chart Overlays**:
  - *Stitch Spec*: Dashed vertical alignment guidelines over category charts (`w-[1px] bg-white/5 border-l border-dashed border-white/20`).
  - *App Gap*: Category progress bars lack technical grid line overlays.

## 3. Micro-Interaction Gaps
- **Interactive Card Hover Borders & Scale Transitions**:
  - *Stitch Spec*: Card border highlight shifts on hover (`hover:border-primary/50 transition-colors duration-300` and `border border-transparent hover:border-white/5 hover:bg-white/5`).
  - *App Gap*: Cards rely on static borders rather than subtle border color transitions on hover.
- **Chart Bar Column Hover Highlights**:
  - *Stitch Spec*: Vertical bar chart columns feature full-height background highlight tracks (`w-10 bg-white/[0.03] group-hover:bg-white/[0.05] rounded-t-lg transition-colors`).
  - *App Gap*: Spending charts display individual bars without full column background highlight tracks on hover.
- **Button Glow Elevation & Active Feedback**:
  - *Stitch Spec*: Multi-tier button shadow expansion (`shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:shadow-[0_0_30px_rgba(208,188,255,0.5)]` and `shadow-[0_0_20px_rgba(0,238,252,0.2)] hover:shadow-[0_0_30px_rgba(0,238,252,0.4)]`), plus active press feedback (`active:scale-95`).
  - *App Gap*: Buttons lack active click scale-down effects and multi-step shadow glow expansion on hover.
- **Active Navigation Scale & Motion Accent**:
  - *Stitch Spec*: Active sidebar items feature `scale-95 transition-transform` and dynamic sliding accent indicators.
  - *App Gap*: Sidebar links without framer-motion layout transitions lack active item subtle scale shifts.
- **Cyan Glow Notification Dot**:
  - *Stitch Spec*: `bg-secondary-container rounded-full shadow-[0_0_8px_rgba(0,238,252,0.8)]` (cyan glow badge).
  - *App Gap*: Notification badge in header previously used pink (`--tertiary`) instead of cyan glow.

## 4. Custom State & Spec-Aligned Component Gaps (from Design Notes)
- **Glassmorphic Loading, Empty, and Error States**:
  - *Stitch Spec*: Custom fallback components using glassmorphic cards with neon violet/cyan/pink glows (`polish_order_1.txt`, `polish_order_2.txt`, `polish_order_3.txt`).
  - *App Gap*: Standard loading spinners and basic text fallbacks were used in place of custom glassmorphic states across page data fetches.
- **Strict NZD Currency Formatting Alignment**:
  - *Stitch Spec*: Explicit enforcement of NZD currency formatting (`NZ$`) across all metrics and table views rather than hardcoded generic `$` signs (`polish_order_1.txt`).
  - *App Gap*: Hardcoded `$` symbols in various page components instead of centralized NZD formatter utility.
- **Prominent 'Add New' Sidebar Action Placement**:
  - *Stitch Spec*: Always-visible gradient 'Add New' CTA button in the persistent sidebar chrome (Screen 3 & Screen 4).
  - *App Gap*: Action buttons were positioned only within content headers rather than integrated into the primary sidebar navigation.
