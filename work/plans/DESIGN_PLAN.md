# DESIGN_PLAN.md — Luminous Velocity Visual Redesign Implementation Plan

> **Planning session — no code changes.**
> Produced after a full audit of the component tree, Supabase schema, Stitch design exports, and the shell spec.
> Updated to reflect the **Luminous Velocity** design system (glassmorphic, violet/cyan/pink dark fintech).

---

## 0. Shell Spec — RESOLVED ✅

> [!NOTE]
> The shell spec has been updated and saved to [Luminous_Velocity_Shell_Lock.md](file:///Users/letanthang/learning_software/financial%20mangement/work/plans/Luminous_Velocity_Shell_Lock.md).
> It reflects the **Luminous Velocity** design system (personal finance tracker).

### Canonical Shell Contract (summary)

| Element | Spec |
|---------|------|
| **Domain** | Personal finance / budget tracker |
| **Aesthetic** | "Luminous Velocity" — premium, high-tech fintech. Glassmorphism + neon accents. Violet/cyan/pink gradients on obsidian backdrop. Cyber-premium, not playful SaaS. |
| **Background** | Deep obsidian `#15121b` (surface), `#0f0d15` (deepest recess) |
| **Primary accent** | Electric Violet (`#d0bcff` / container `#9f78ff`) — main actions, active states, gradient start |
| **Secondary accent** | Cyan Neon (`#d3fbff` / container `#00eefc`) — data viz, secondary indicators |
| **Tertiary accent** | Neon Pink (`#ffb0ca` / container `#f15999`) — status alerts, gradient stop |
| **Body font** | Plus Jakarta Sans |
| **Border radius** | Large/glassmorphic — `1.5rem` (24px) cards, `1rem` (16px) buttons/inputs, pill for progress bars |
| **Elevation** | Glass surface: `rgba(255,255,255,0.05)` + `backdrop-filter: blur(20px)`. Card border: 1px `rgba(255,255,255,0.1)` + top inner highlight. Glow-based depth, not flat borders. |
| **Sidebar** | Left, persistent, 260px fixed. Nav: Dashboard, Subscriptions, Spending Breakdown. Active = primary-tint bg + 4px pill light bar on left. Avatar/session at bottom. Mobile: bottom nav bar or hamburger overlay. |
| **Topbar** | Minimal glass treatment. Optional search, notification, avatar/session menu. Violet focus rings. |
| **Buttons** | Primary = violet→pink gradient with matching glow shadow. Secondary = ghost-glass with subtle border. |
| **Login page** | Shell does NOT apply — no sidebar/topbar on auth screens. |

### What this resolves

- The 4 sidebar variants in the Stitch design PNGs (A/B/C/D from §3) are **all superseded** by this spec.
- All nav items, active states, topbar content, and token values are now locked.
- The Stitch design PNGs remain useful for **page content layout inspiration** but their sidebar/topbar elements must be ignored.

### Domain

> [!NOTE]
> This is a **personal finance / budget tracker**. 
> Nav items are: **Dashboard, Subscriptions, Spending Breakdown** — the 3 pages that actually exist.

---

## 1. Code Audit — Component Classification

### 1a. Current Architecture Summary

The app is a **Vite + React 18 + Tailwind CSS** SPA with:
- **No router** — page state managed via `useState('dashboard')` in [App.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/App.jsx)
- **All Supabase calls** made directly from 3 custom hooks + inline in App.jsx
- **3 pages**: Dashboard, Subscriptions, SpendingBreakdown (plus auth/loading states baked into App.jsx)
- **17 components** + 4 UI primitives
- **Purple/teal/coral multi-accent** design system (being replaced with the Luminous Velocity violet/cyan/pink glassmorphic system)

### 1b. Classification Table

| File | Classification | Rationale |
|------|---------------|-----------|
| **Pages** | | |
| [DashboardPage.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/pages/DashboardPage.jsx) | 🔴 STALE | Layout is full-width fluid, no sidebar; uses purple section-shells; month-snapshot, charts, carry-over sidebar panels all tightly coupled to current layout grid. Design screens show completely different layout with persistent sidebar. |
| [SubscriptionsPage.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/pages/SubscriptionsPage.jsx) | 🔴 STALE | Full-width layout with inline modal; designs show sidebar + grid cards with brand logos, "next billing date", "Active" pill — layout structure is fundamentally different. |
| [SpendingBreakdownPage.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/pages/SpendingBreakdownPage.jsx) | 🔴 STALE | Heavily coupled to AnimatedSelect, DateRangePicker, and FlexibleSummaryGrid with purple styling. Design 7 ("Monthly Breakdown" / "Luminous") shows different layout: horizontal bar charts for categories, donut for budget impact, line chart for daily trend, and "Top Expenses" cards. |
| **App Shell** | | |
| [App.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/App.jsx) (shell/routing) | 🔴 STALE | Contains nav as horizontal pill-tab bar in header; designs show vertical sidebar. All loading/error states, auth gating, and page routing are in one 673-line file. Auth flow embedded inline. Needs decomposition into shell + router + auth guard. |
| [App.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/App.jsx) (auth/session logic, L115-213) | ⚠️ PARTIAL REUSE | The `useEffect` blocks for `auth.getSession()`, `onAuthStateChange`, `loadMembership`, and `loadExpenses` contain correct Supabase logic but are entangled with component state. Extract to hooks. |
| **Components** | | |
| [SupabaseAuthExample.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/SupabaseAuthExample.jsx) | 🔴 STALE | 221 lines of tightly styled auth form with purple/teal gradient aesthetic. Design screens don't show a login screen, but the auth form structure would need to match the new shell. Rebuild to match new design system. |
| [BalanceCard.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/BalanceCard.jsx) | 🔴 STALE | Purple gradient hero card; designs show teal/gradient balance card with different metrics layout. |
| [CategoryChart.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/CategoryChart.jsx) | 🔴 STALE | Recharts PieChart; design 7 shows horizontal bar chart for category breakdown. |
| [TrendChart.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/TrendChart.jsx) | 🔴 STALE | Recharts AreaChart; design 7 shows line chart (actual + projected). |
| [ExpenseList.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ExpenseList.jsx) | 🔴 STALE | List with comment-count badges and delete buttons; designs show simpler transaction rows with service icons. |
| [SummaryCard.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/SummaryCard.jsx) | 🔴 STALE | Grid of metric cards with purple styling. |
| [SubscriptionCard.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/SubscriptionCard.jsx) | 🔴 STALE | surface-card with active/inactive toggle; designs show cards with brand logos, plan tier names, next billing date — completely different data surface. |
| [SubscriptionForm.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/SubscriptionForm.jsx) | 🔴 STALE | Simple label/amount/frequency/date form; design 8 shows service search with logo grid, plan name, currency selector, reminder toggle. |
| [ExpenseForm.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ExpenseForm.jsx) | 🔴 STALE | Complex 12KB form with receipt scanning integration; design 9 shows simpler modal with category dropdown, file upload, and scan receipt. Layout completely different. |
| [AddExpenseModal.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/AddExpenseModal.jsx) | 🔴 STALE | Wrapper modal; will be replaced by new modal in shell system. |
| [ReceiptScanner.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ReceiptScanner.jsx) | 🔴 STALE | Heavily styled with purple gradients. Scanner logic could be extracted but the component is 80% layout. |
| [BulkReviewForm.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/BulkReviewForm.jsx) | 🔴 STALE | Tied to current form styling. |
| [CommentDrawer.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/CommentDrawer.jsx) | 🔴 STALE | Drawer with purple/coral styling; no matching design screen provided. |
| [MonthCommentCard.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/MonthCommentCard.jsx) | 🔴 STALE | Small display component tied to purple section-shell. |
| [CarryOverPill.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/CarryOverPill.jsx) | 🔴 STALE | Simple pill badge; trivial to rebuild. |
| [DateRangePicker.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/DateRangePicker.jsx) | 🔴 STALE | Wraps react-day-picker with purple theme overrides. |
| [AnimatedSelect.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/AnimatedSelect.jsx) | 🔴 STALE | Custom dropdown with purple/teal animations. |
| **UI Primitives** | | |
| [ui/DatePicker.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ui/DatePicker.jsx) | 🔴 STALE | Styled with input-shell + purple focus ring. |
| [ui/Select.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ui/Select.jsx) | 🔴 STALE | Custom select with surface-2 styling. |
| [ui/calendar.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ui/calendar.jsx) | 🔴 STALE | Shadcn-style calendar component with purple accent overrides. |
| [ui/popover.jsx](file:///Users/letanthang/learning_software/financial%20mangement/src/components/ui/popover.jsx) | 🟡 REUSABLE | Thin Radix UI wrapper — no styling, just Popover.Root/Trigger/Content exports. Zero layout coupling. |
| **Hooks** | | |
| [useSubscriptions.js](file:///Users/letanthang/learning_software/financial%20mangement/src/hooks/useSubscriptions.js) | 🟢 REUSABLE | Pure data hook — Supabase CRUD for subscriptions, returns data + mutation functions, zero JSX. |
| [useCarryOver.js](file:///Users/letanthang/learning_software/financial%20mangement/src/hooks/useCarryOver.js) | 🟢 REUSABLE | Pure data hook — snapshot sync logic, returns computed budgets, zero JSX. |
| [useComments.js](file:///Users/letanthang/learning_software/financial%20mangement/src/hooks/useComments.js) | 🟢 REUSABLE | Pure data hook — expense/month comments CRUD, zero JSX. |
| **Lib** | | |
| [supabaseClient.ts](file:///Users/letanthang/learning_software/financial%20mangement/src/lib/supabaseClient.ts) | 🟢 REUSABLE | Supabase client factory; framework-agnostic. |
| [transactions.ts](file:///Users/letanthang/learning_software/financial%20mangement/src/lib/transactions.ts) | 🟢 REUSABLE | `fetchUserTransactions()` function; pure query, no JSX. |
| [ReceiptLLMProvider.js](file:///Users/letanthang/learning_software/financial%20mangement/src/lib/ReceiptLLMProvider.js) | 🟢 REUSABLE | Gemini API class; framework-agnostic. |
| [utils.js](file:///Users/letanthang/learning_software/financial%20mangement/src/lib/utils.js) | 🟢 REUSABLE | `cn()` clsx+twMerge helper; universal. |
| **Utils** | | |
| [utils/finance.js](file:///Users/letanthang/learning_software/financial%20mangement/src/utils/finance.js) | 🟢 REUSABLE | Pure functions — formatCurrency, getFinanceSummary, getCategoryBreakdown, getDailyTrend, etc. No JSX. |
| [utils/subscriptions.js](file:///Users/letanthang/learning_software/financial%20mangement/src/utils/subscriptions.js) | 🟢 REUSABLE | Pure functions — projectSubscriptionCost, getTotalSubscriptionBurden. |
| [utils/carryOver.js](file:///Users/letanthang/learning_software/financial%20mangement/src/utils/carryOver.js) | 🟢 REUSABLE | Pure functions — buildMonthlySnapshots, getEffectiveBudget. |
| [utils/comments.js](file:///Users/letanthang/learning_software/financial%20mangement/src/utils/comments.js) | 🟢 REUSABLE | Pure functions — comment map manipulation. |
| [utils/mathUtils.js](file:///Users/letanthang/learning_software/financial%20mangement/src/utils/mathUtils.js) | 🟢 REUSABLE | Mortgage/compound interest calculators (seems orphaned but harmless). |
| **Styles** | | |
| [index.css](file:///Users/letanthang/learning_software/financial%20mangement/src/index.css) | 🔴 STALE | 553 lines defining the purple/teal/coral design system. Entire token set (CSS variables, section-shell, surface-card, surface-panel, btn-primary, input-shell) must be replaced to match Luminous Velocity glassmorphic aesthetic (violet/cyan/pink on obsidian, Plus Jakarta Sans, 24px card radii, glow-based elevation). |

### 1c. Summary

| Category | REUSABLE | STALE |
|----------|----------|-------|
| Pages | 0 | 3 |
| App shell | 0 (partial logic salvageable) | 1 |
| Components | 0 (popover wrapper only) | 17 |
| Hooks | 3 | 0 |
| Lib | 4 | 0 |
| Utils | 5 | 0 |
| Styles | 0 | 1 |

**Total reusable without modification:** 13 files (all logic-only, no JSX layout)
**Total stale:** 22 files (all layout/visual components)

---

## 2. Design Feasibility Audit

### 2a. Stitch Design Screens Inventory

| # | File | Depicted Screen | Shell Layout |
|---|------|----------------|--------------|
| 1 | [1_Subscription_Management_Pro.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/1_Subscription_Management_Pro.png) | Subscription management with sidebar (Dashboard, Subscriptions, Budget, Reports, Settings) | Sidebar variant A (dark, icon+text, avatar top-right) |
| 2 | [2_Modern_Finance_Dashboard_Home.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/2_Modern_Finance_Dashboard_Home.png) | Dashboard with balance card, monthly spending chart, recent transactions, subscription widget | Sidebar variant B (icon+text, "Add Expense" top-right button) |
| 3 | [3_WealthVision_Vibrant_Gradient_Dashboard.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/3_WealthVision_Vibrant_Gradient_Dashboard.png) | "WealthVision" dashboard with total balance, savings goals, monthly spending chart, transactions, subscription management | Sidebar variant C (brand logo, "+ Add New" teal button, Dashboard/Investments/Budgets/Transactions/Subscriptions/Settings, avatar at bottom) |
| 4 | [4_WealthVision_Subscription_Management.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/4_WealthVision_Subscription_Management.png) | Subscription list page with brand logos, total cost, budget impact %, grid/list toggle | Sidebar variant C (same as screen 3) |
| 6 | [6_WealthVision_Subscription_Management.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/6_WealthVision_Subscription_Management.png) | Subscription detail modal (Netflix) — shows plan name, monthly cost, next billing date, annual total, budget impact %, "Change Plan" / "Cancel Subscription" actions | Sidebar variant C |
| 7 | [7_WealthVision_Monthly_Breakdown.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/7_WealthVision_Monthly_Breakdown.png) | "Luminous" monthly breakdown — total spent, budget remaining, saved this month, horizontal bar categories, donut budget impact, daily trend line chart, top expenses cards | Sidebar variant D ("Luminous", different nav items: Dashboard/Spending/Subscriptions/Budget/Savings/Reports, Support/Log Out at bottom) |
| 8 | [8_WealthVision_Subscription_Management.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/8_WealthVision_Subscription_Management.png) | Add New Subscription modal — service search with logo grid (Disney+, Hulu, Max, Apple TV+, Paramount+, Peacock), plan name, amount with currency/frequency selectors, next billing date, "Remind me before billing" toggle | Sidebar variant C |
| 9 | [9_WealthVision_Subscription_Management.png](file:///Users/letanthang/learning_software/financial%20mangement/stitch_screens/9_WealthVision_Subscription_Management.png) | Add New Expense modal — amount, description, category dropdown (Food/Travel/Shopping/Parcels/Homewaters/Others), date picker, receipt upload + scan receipt buttons | Sidebar variant C |

### 2b. Feasibility Classification

| Screen | Element | Status | What's Missing | Decision Needed |
|--------|---------|--------|---------------|-----------------|
| **Screen 1 — Subscription Mgmt Pro** | | | | |
| | Subscription cards with brand logos (Netflix, Spotify, etc.) | ❌ NOT POSSIBLE | `subscriptions` table has no `logo_url`, `brand`, or `icon` column. No logo service integration exists. | Brian: Add a `logo_url` or `brand_key` column? Or use a static brand-icon mapping? |
| | "Next billing date" per subscription | ❌ NOT POSSIBLE | Schema has `start_date` only — no `next_billing_date` or logic to compute it from frequency. | Brian: Add `next_billing_date` column, or compute from `start_date` + `frequency` on frontend? |
| | "Budget Impact %" stat card | ✅ POSSIBLE NOW | `getSubscriptionBudgetShare()` already computes this. | — |
| | "Below 35% target" threshold text | ❌ NOT POSSIBLE | No `budget_impact_target` setting exists in schema or frontend state. | Brian: Is this a hardcoded threshold or a user setting? |
| | Avatar + user email in topbar | ✅ POSSIBLE NOW | `session.user.email` available; avatar URL from `session.user.user_metadata.avatar_url` (may be null). | — |
| | Sidebar with Dashboard/Subscriptions/Budget/Reports/Settings | ⚠️ POSSIBLE WITH CHANGES | Budget, Reports, and Settings pages don't exist yet. | Brian: Are these pages in scope, or placeholder nav items? |
| **Screen 2 — Modern Finance Dashboard** | | | | |
| | "Total Balance" $14,500.25 | ❌ NOT POSSIBLE | No `balance` or `account_balance` field in schema. The app tracks budget/expenses/carry-over but not total account balance. This is a conceptually different data model. | Brian: Is "Total Balance" meant to be effective budget, or a new concept? |
| | "Remaining Budget 65%" | ✅ POSSIBLE NOW | `getFinanceSummary()` computes `percentSpent`; remaining% = 100 - percentSpent. | — |
| | Monthly spending bar chart by category | ✅ POSSIBLE NOW | `getChartCategoryBreakdown()` already computes this data. | — |
| | Recent transactions list with service icons | ⚠️ POSSIBLE WITH CHANGES | Transaction list data exists, but service icons (Grocery Store icon, Spotify logo, Amazon logo) require either a category-to-icon mapping or a brand field. | Brian: Static icon mapping per category, or per-expense brand lookup? |
| | "Subscription Management" widget showing billing dates | ❌ NOT POSSIBLE | Same issue as Screen 1 — no next billing date. "Due in 2 days" requires date computation from a missing field. | — |
| **Screen 3 — WealthVision Dashboard** | | | | |
| | "Savings Goals" — "Car Fund" at 70%, $400 of $12,000 | ❌ NOT POSSIBLE | No `savings_goals` table or concept in schema. This is entirely new functionality. | Brian: Is savings goals in scope for this redesign, or a future feature? |
| | "Investments" nav item | ❌ NOT POSSIBLE | No investments data model or functionality exists. | Brian: In scope or placeholder? |
| | Search bar in topbar | ⚠️ POSSIBLE WITH CHANGES | No search functionality exists but could be implemented as client-side filtering on expenses/subscriptions. | Brian: Should search query Supabase or filter local data? |
| | "+ Add New" button (teal) | ✅ POSSIBLE NOW | Triggers add expense/subscription modals. | — |
| | "Pro Member" badge on avatar | ❌ NOT POSSIBLE | No membership tier concept in schema. | Brian: Decorative only, or tied to a real feature? |
| **Screen 4 — Subscription Page** | | | | |
| | Grid/list toggle for subscription display | ⚠️ POSSIBLE WITH CHANGES | View mode toggle is pure frontend state — no schema change needed, but requires building both layout variants. | — |
| | Brand logos on subscription cards | ❌ NOT POSSIBLE | Same as Screen 1. | — |
| | Plan tier name ("Premium Plan", "Family Plan", "Apartment") | ❌ NOT POSSIBLE | `subscriptions` table has `label` but no `plan_tier` or `plan_name` field. The label could be overloaded, but the design treats them as separate fields (label = service name, plan = tier). | Brian: Add `plan_name` column, or treat `label` as the full name? |
| **Screen 6 — Subscription Detail Modal** | | | | |
| | "Annual Total" calculation ($239.88) | ✅ POSSIBLE NOW | Can compute from `amount * 12` (monthly) or `amount * 52` (weekly). | — |
| | "Budget Impact 16% of Entertainment Budget" | ❌ NOT POSSIBLE | No per-category budget allocation exists. Budget is a single global number. | Brian: Add per-category budget splits, or compute as % of total budget? |
| | "Change Plan" button | ❌ NOT POSSIBLE | No plan-change concept. What would this do? Subscriptions are just amount/frequency. | Brian: Remove from design, or define the interaction? |
| | "Cancel Subscription" button | ⚠️ POSSIBLE WITH CHANGES | Could map to `removeSubscription()` or toggle to inactive. Semantics should be clarified. | Brian: Does "Cancel" mean delete the row or set `active = false`? |
| **Screen 7 — Monthly Breakdown ("Luminous")** | | | | |
| | Total Spent / Budget Remaining / Saved This Month | ✅ POSSIBLE NOW | All derivable from `getFinanceSummary()` + carry-over logic. | — |
| | "+12% vs last month" comparison | ⚠️ POSSIBLE WITH CHANGES | Requires comparing current month's total with previous month's snapshot. Data exists in `monthly_snapshots`, but no helper function currently computes month-over-month delta. | — |
| | "70% of $6k Budget" | ⚠️ POSSIBLE WITH CHANGES | Budget is currently hardcoded as `MONTHLY_BUDGET = 150` in App.jsx. If the design says $6k, the budget must be configurable. | Brian: Should budget be user-configurable (needs new schema) or remain hardcoded? |
| | "On track for yearly goal" | ❌ NOT POSSIBLE | No yearly goal concept exists. | Brian: New feature or decorative? |
| | Horizontal bar chart for categories | ✅ POSSIBLE NOW | Same data as category breakdown, different chart type. | — |
| | Donut chart for "Budget Impact — 75% Used" | ✅ POSSIBLE NOW | `percentSpent` already available. | — |
| | "Actual + Projected" line chart | ⚠️ POSSIBLE WITH CHANGES | Actual data exists via `getDailyTrend()`. Projected trend line requires new logic (e.g., linear regression or simple average extrapolation). | Brian: What projection method? Linear extrapolation from current pace? |
| | "Top Expenses This Month" with icons | ⚠️ POSSIBLE WITH CHANGES | Top expenses derivable from existing data. Category icons needed (see Screen 2). | — |
| **Screen 8 — Add New Subscription Modal** | | | | |
| | Service search with logo grid | ❌ NOT POSSIBLE | No service catalog exists. Showing Disney+, Hulu, etc. logos requires either a hardcoded service list or an external API. | Brian: Hardcoded list of popular services? Or free-form input only? |
| | Currency selector (USD dropdown) | ❌ NOT POSSIBLE | Schema has no `currency` column. All amounts are implicitly USD. | Brian: Multi-currency support in scope? |
| | "Remind me before billing" toggle | ❌ NOT POSSIBLE | No notification/reminder system. Supabase has no cron or push notification capability built-in. Would need an Edge Function + a `reminders` table. | Brian: In scope, or remove from design? |
| **Screen 9 — Add New Expense Modal** | | | | |
| | Amount display as "$0.00" large text | ✅ POSSIBLE NOW | Styling only. | — |
| | Description field | ✅ POSSIBLE NOW | Maps to `note` column. | — |
| | Category dropdown with custom categories | ✅ POSSIBLE NOW | `CATEGORIES` array in finance.js, though designs show different labels (Travel, Parcels, Homewaters, Others vs. Food, Groceries, Transport, Entertainment, Shopping, Bills, Health, Education, Other). | Brian: Should category list change to match designs? |
| | Date picker | ✅ POSSIBLE NOW | Existing functionality. | — |
| | "Upload File" + "Scan Receipt" buttons | ✅ POSSIBLE NOW | ReceiptScanner + ReceiptLLMProvider already exist. | — |

### 2c. Feasibility Summary

| Status | Count | Notes |
|--------|-------|-------|
| ✅ POSSIBLE NOW | 12 elements | Current schema + logic supports as-is |
| ⚠️ POSSIBLE WITH SCHEMA/POLICY CHANGE | 9 elements | Need new columns, helper functions, or frontend state — no product decision required |
| ❌ NOT POSSIBLE AS DESIGNED | 14 elements | Missing data models (savings goals, investments, service catalog, reminders, per-category budgets, plan tiers, currencies, billing dates) |

---

## 3. Shell Conformance Audit

> [!WARNING]
> **The Stitch designs show at least 4 distinct sidebar/topbar configurations.** Without `Luminous_Velocity_Shell_Lock.md`, it is impossible to determine which is canonical.

| Sidebar Variant | Used In | Nav Items | Distinctive Features |
|-----------------|---------|-----------|---------------------|
| **A** (Screen 1) | Subscription Mgmt Pro | Dashboard, Subscriptions, Budget, Reports, Settings | Avatar + email top-right. No branding. |
| **B** (Screen 2) | Modern Finance Dashboard | Dashboard, Transactions, Subscriptions, Reports, Settings | "F" logo. "Add Expense" button top-right. |
| **C** (Screens 3, 4, 6, 8, 9) | WealthVision screens | Dashboard, Investments, Budgets, Transactions, Subscriptions, Settings | "WealthVision" brand. "+ Add New" teal button. Avatar at bottom. Search bar in topbar. |
| **D** (Screen 7) | Monthly Breakdown ("Luminous") | Dashboard, Spending, Subscriptions, Budget, Savings, Reports, Support, Log Out | "Luminous" brand. Bell + notification icons in topbar. |

### Conflicts — RESOLVED by Shell Spec (Luminous Velocity)

All 5 conflicts below are now resolved by the updated [Shell Lock](file:///Users/letanthang/learning_software/financial%20mangement/work/plans/Luminous_Velocity_Shell_Lock.md):

1. **Domain**: ✅ **Personal finance tracker**.
2. **Nav item set**: ✅ **Dashboard, Subscriptions, Spending Breakdown** — the 3 pages that actually exist. Do not add Investments/Savings Goals.
3. **"+ Add" button placement**: ✅ Not in sidebar primary nav. "Add" actions are page-specific content.
4. **Avatar placement**: ✅ **Bottom of sidebar** (session area).
5. **Topbar content**: ✅ Minimal — optional search + notification + avatar/session menu. Glass treatment, violet focus rings.

> All Stitch design PNGs (Screens 1–9) are now treated as **page content inspiration only**. Their sidebar/topbar elements are superseded.

---

## 4. New-Not-Reuse Reasoning

| Stale Component | Why Rewrite Is Cheaper |
|-----------------|----------------------|
| DashboardPage | Layout changed from full-width fluid to sidebar+content with different card grid; verifying old responsive breakpoints against new sidebar offset would cost more than fresh layout. |
| SubscriptionsPage | Card structure changed from label/amount/frequency to brand-logo/plan-name/billing-date; old component's data mapping is wrong. |
| SpendingBreakdownPage | Chart types changed (pie→bar, area→line), new "top expenses" section added, period selector UX changed. Patching would be a near-total rewrite anyway. |
| App.jsx shell | Must decompose from monolith (673 lines) into sidebar+topbar+content-area+router. Modifying the existing file to add sidebar around existing content would be a surgical nightmare with no clean separation. |
| SubscriptionCard | Data surface completely different (needs logo, plan name, billing date — none of which the old component references). |
| SubscriptionForm | Design adds service search, logo picker, currency selector, reminder toggle — old form has none of these fields. |
| ExpenseForm/ReceiptScanner | UI layout completely different; only the `ReceiptLLMProvider` class (already separate in lib/) is reusable. |
| CategoryChart/TrendChart | Chart type changed. Recharts component type must change (PieChart→BarChart, AreaChart→LineChart). Styling is the least of the issues. |
| All UI primitives | Design token system (CSS variables, border-radius, colors) changes across the board; updating each primitive's styling individually is more error-prone than a clean set built against the new tokens. |
| index.css | Every CSS variable, every component class, and every animation targets the old purple/teal system. The Luminous Velocity glassmorphic aesthetic (violet/cyan/pink, Plus Jakarta Sans, 24px card radii, glow elevation) requires a full replacement. |

**Exception — things we keep:**
The 3 hooks, 4 lib files, and 5 utils are pure logic with zero JSX. No layout to verify against a new design. These are directly importable into new components.

---

## 5. New Component Inventory

> [!NOTE]
> Component names below are finalized for the Luminous Velocity finance tracker shell.

| # | New Component | Route/Screen | Replaces | One-Line Spec |
|---|--------------|-------------|----------|---------------|
| 1 | `AppShell` | All pages | App.jsx (shell portion) | Fixed sidebar + topbar + scrollable content area, matching locked shell spec |
| 2 | `Sidebar` | All pages | Nav in App.jsx header | Vertical nav with icon+label items, active state, brand logo, avatar, per shell spec |
| 3 | `Topbar` | All pages | Header in App.jsx | Page title, search bar (if spec requires), "+ Add" button, user menu |
| 4 | `AuthGuard` | Pre-auth | Auth logic in App.jsx | Session gate component wrapping AppShell; shows login if no session |
| 5 | `LoginPage` | `/login` | SupabaseAuthExample | Full-page login form matching new design tokens |
| 6 | `DashboardPage` | `/dashboard` | pages/DashboardPage.jsx | Balance hero, monthly spending chart, recent transactions, subscription widget |
| 7 | `BalanceHero` | Dashboard | BalanceCard.jsx | Large balance display with remaining budget bar, carry-over pill |
| 8 | `MonthlySpendingChart` | Dashboard, Breakdown | CategoryChart.jsx | Recharts BarChart (vertical bars by category) |
| 9 | `TransactionList` | Dashboard, Breakdown | ExpenseList.jsx | Compact transaction rows with category icon, amount, date |
| 10 | `SubscriptionWidget` | Dashboard | (new) | Small card showing 2-3 subscriptions with next billing dates |
| 11 | `SubscriptionsPage` | `/subscriptions` | pages/SubscriptionsPage.jsx | Grid of subscription cards with total cost + budget impact header |
| 12 | `SubscriptionCard` | Subscriptions | SubscriptionCard.jsx | Card with brand icon (or initial), label, plan, amount/mo, next billing date, active badge |
| 13 | `SubscriptionDetailModal` | Subscriptions | (new) | Modal showing plan details, annual total, budget impact, cancel action |
| 14 | `AddSubscriptionModal` | Subscriptions | SubscriptionForm.jsx (modal) | Form with optional service search, plan name, amount, frequency, start date |
| 15 | `SpendingBreakdownPage` | `/breakdown` | pages/SpendingBreakdownPage.jsx | Monthly totals, horizontal category bars, donut budget gauge, daily trend line, top expenses |
| 16 | `CategoryBarChart` | Breakdown | CategoryChart.jsx | Horizontal bar chart with category labels and % |
| 17 | `BudgetDonut` | Breakdown | (new) | Donut/gauge chart showing % of budget used |
| 18 | `DailyTrendChart` | Breakdown | TrendChart.jsx | Line chart (actual; optionally projected) |
| 19 | `TopExpensesRow` | Breakdown | (new) | Horizontal scroll of top expense cards with category icon |
| 20 | `AddExpenseModal` | Any page | AddExpenseModal + ExpenseForm | Amount input, description, category select, date picker, receipt upload/scan |
| 21 | `SummaryMetricCard` | Various | SummaryCard.jsx | Single metric display card (label, value, optional delta or hint) |
| 22 | `design-tokens.css` | Global | index.css | New CSS variable set: Luminous Velocity palette (violet/cyan/pink on obsidian), glassmorphic surfaces, Plus Jakarta Sans typography, glow-based elevation |

---

## 6. Phased Task Breakdown

### Phase 0 — Unblock (REQUIRES BRIAN)

| Task | Description | Complexity |
|------|-------------|------------|
| 0.1 | **Provide `Luminous_Velocity_Shell_Lock.md`** | N/A — decision |
| 0.2 | **Resolve sidebar variant** — pick one from A/B/C/D or provide canonical spec | N/A — decision |
| 0.3 | **Answer open questions** from §7 below (at least the ones blocking Phase 1-2) | N/A — decision |

---

### Phase 1 — Foundation (shared primitives before page assemblies)

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **1.1** Create `design-tokens.css` — new CSS variable set (colors, surfaces, radii, type scale for Luminous Velocity glassmorphic system) | Shell spec color tokens (violet/cyan/pink), Plus Jakarta Sans, 24px card radii, glow elevation | None | SIMPLE |
| **1.2** Create `AppShell` component — sidebar + topbar + `{children}` content slot | Sidebar width, topbar height, layout breakpoints, nav items | None | SIMPLE |
| **1.3** Create `Sidebar` component — nav items, brand, avatar | Nav item list, icon set, active state styling, brand mark | None | SIMPLE |
| **1.4** Create `Topbar` component — page title, search (if spec requires), action buttons, user menu | Topbar layout spec, which elements appear | `auth.getSession()` for user info | SIMPLE |
| **1.5** Create `AuthGuard` wrapper — session check, redirect to login | Auth flow spec (if shell spec covers it) | `auth.getSession()`, `auth.onAuthStateChange()` | COMPLEX — touches auth state |
| **1.6** Create `LoginPage` — email/password form | None (pre-shell page) | `auth.signInWithPassword()`, `auth.resetPasswordForEmail()` | SIMPLE |
| **1.7** Create `SummaryMetricCard` primitive — label + value + optional delta | Surface/card token styles | None | SIMPLE |
| **1.8** Set up client-side routing (React Router or keep manual) | Shell spec routing pattern | None | SIMPLE |

---

### Phase 2 — Dashboard Page

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **2.1** Create `DashboardPage` layout — grid composition inside AppShell content area | Content area padding, responsive breakpoints | Existing: expenses query, subscriptions query, snapshots query (via reused hooks) | SIMPLE |
| **2.2** Create `BalanceHero` — large balance + remaining bar + carry-over pill | Card token styles | None (receives data as props) | SIMPLE |
| **2.3** Create `MonthlySpendingChart` — Recharts BarChart by category | Chart colors from design tokens | None (receives data as props) | SIMPLE |
| **2.4** Create `TransactionList` — compact row list with category icon mapping | Icon set per category | None (receives data as props) | SIMPLE |
| **2.5** Create `SubscriptionWidget` — 2-3 subscription preview cards on dashboard | Card token styles | None (receives data as props from parent) | SIMPLE |

---

### Phase 3 — Subscriptions Page

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **3.1** Create `SubscriptionsPage` layout — header stats + card grid | Content area layout | Existing: `useSubscriptions` hook | SIMPLE |
| **3.2** Create `SubscriptionCard` — card with optional icon, label, amount/mo, next billing, active badge | Card tokens | None (receives props) | SIMPLE |
| **3.3** Create `SubscriptionDetailModal` — plan detail, annual total, budget impact, cancel | Modal overlay tokens | `removeSubscription()` or `toggleSubscription()` from useSubscriptions | SIMPLE |
| **3.4** Create `AddSubscriptionModal` — form with plan name, amount, frequency, start date | Modal tokens | `addSubscription()` from useSubscriptions | SIMPLE |
| **3.5** *(Conditional on Brian's answer)* Add `next_billing_date` computation or column | Schema migration | New migration if column added; or pure frontend computation from `start_date + frequency` | COMPLEX — schema change |

---

### Phase 4 — Spending Breakdown Page

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **4.1** Create `SpendingBreakdownPage` layout — metric cards + charts + top expenses | Content area layout | Existing: expense queries via hooks | SIMPLE |
| **4.2** Create `CategoryBarChart` — horizontal bars with labels and % | Chart colors from tokens | None | SIMPLE |
| **4.3** Create `BudgetDonut` — donut gauge showing % used | Accent colors from tokens | None | SIMPLE |
| **4.4** Create `DailyTrendChart` — line chart (actual data) | Chart colors | None | SIMPLE |
| **4.5** Create `TopExpensesRow` — horizontal scroll of top expense cards | Card tokens | None | SIMPLE |
| **4.6** Create month-over-month delta helper — compute "+12% vs last month" | None | Reads `monthly_snapshots` via existing hook | SIMPLE |
| **4.7** *(Conditional)* Add projected trend line logic | None | None (pure math on existing data) | SIMPLE |

---

### Phase 5 — Expense Management

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **5.1** Create `AddExpenseModal` — amount, description, category, date, receipt scan | Modal tokens | `expenses.insert()` (existing in App.jsx) | SIMPLE |
| **5.2** Integrate `ReceiptLLMProvider` into new modal — reuse existing provider | None | Gemini API via existing provider | SIMPLE |
| **5.3** Create `BulkReviewForm` (new) — review AI-scanned items before save | Modal tokens | Batch `expenses.insert()` | SIMPLE |

---

### Phase 6 — Comments & Reviewer Flow

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **6.1** Create `CommentDrawer` (new) — slide-out panel for expense comments | Drawer/overlay tokens | `useComments` hook (existing) | SIMPLE |
| **6.2** Create `MonthlyNoteModal` (new) — reviewer month note editor | Modal tokens | `saveReviewerMonthComment()` from useComments | SIMPLE |
| **6.3** Wire role-based UI gating — owner vs reviewer vs viewer visibility | None | Existing membership query in App.jsx (extract to hook) | COMPLEX — touches RLS, auth state |

---

### Phase 7 — Polish & Integration

| Task | What It Needs From Shell Spec | Supabase Calls | Complexity |
|------|------------------------------|----------------|------------|
| **7.1** Wire all pages into AppShell + router | Final nav item list | None | SIMPLE |
| **7.2** Verify RLS policies work with new component data flows | N/A | All existing policies | COMPLEX — must test owner/reviewer/viewer flows |
| **7.3** Remove stale components, pages, and old index.css | None | None | SIMPLE |
| **7.4** Responsive testing — sidebar collapse behavior on mobile | Shell spec mobile behavior | None | SIMPLE |

---

## 7. Open Questions for Brian

> [!IMPORTANT]
> These questions **block** specific tasks. Items marked 🚫 block entire phases.

| # | Question | Blocks | Options |
|---|----------|--------|---------|
| ~~Q0~~ | ~~Domain identity~~ | ✅ RESOLVED | **Personal finance tracker** — Luminous Velocity aesthetic. |
| ~~Q1~~ | ~~Shell spec location~~ | ✅ RESOLVED | Updated in `Luminous_Velocity_Shell_Lock.md` (now Luminous Velocity). |
| ~~Q2~~ | ~~Brand name~~ | ✅ RESOLVED | Finance tracker. |
| ~~Q3~~ | ~~Nav items~~ | ✅ RESOLVED | **Dashboard, Subscriptions, Spending Breakdown** — the 3 pages that exist. |
| Q4 | **Is "Total Balance" the effective budget or a new bank-balance concept?** Screen 2 shows $14,500.25 which is far above the $150 hardcoded budget. | Phase 2 | Effective budget (existing) or new concept (needs schema) |
| Q5 | **Should budget be user-configurable?** Currently hardcoded as `$150`. Design 7 implies `$6,000`. | Phase 2 | Hardcode new value; or add `user_settings` table with budget field |
| Q6 | **Are savings goals in scope?** Screen 3 shows "Car Fund" with progress tracking. | Deferred | ❌ Flagged NOT POSSIBLE in feasibility audit — cut from scope. |
| Q7 | **Subscription brand logos** — hardcoded icon set for popular services, user-uploadable logo, or skip logos entirely? | Phase 3 | Hardcoded map; user upload (needs storage bucket); or skip |
| Q8 | **Next billing date** — add column to `subscriptions` table, or compute from `start_date + frequency`? | Phase 3 | New column (migration); or frontend computation |
| Q9 | **Per-category budgets** — design 6 shows "16% of Entertainment Budget". Add category budget splits? | Deferred | New `category_budgets` table; or compute as % of total (simpler) |
| Q10 | **"Remind me before billing" toggle** — requires scheduled notifications, which Supabase doesn't natively support. Edge Function + cron? Or cut from design? | Phase 3 | Edge Function cron (complex); or cut |
| Q11 | **Multi-currency support** — design 8 shows a NZD dropdown. In scope? | Deferred | Add `currency` column (schema change); or cut |
| Q12 | **Category list update** — current: Food, Groceries, Transport, Entertainment, Shopping, Bills, Health, Education, Other. Designs show: Travel, Parcels, Homewaters. Align? | Phase 5 | Provide final category list |
| Q13 | **"Change Plan" button** on subscription detail — what does this do? Update amount? Change frequency? Or is this out of scope? | Phase 3 | Define interaction; or cut |
| Q14 | **Projected trend line** — design 7 shows "Actual + Projected". What projection method? | Phase 4 | Linear extrapolation from current daily average; or cut |

---

## Appendix: Schema Tables (Current State)

For reference, here are the tables the above analysis is based on:

| Table | Columns | RLS Model |
|-------|---------|-----------|
| `expenses` | id, user_id, amount, category, date, note, created_at | Owner: full CRUD on own. Members: SELECT via `can_access_owner_budget()`. |
| `subscriptions` | id, user_id, label, amount, frequency, start_date, active, created_at | Owner: full CRUD. Members: SELECT. |
| `monthly_snapshots` | id, user_id, month, budget, total_spent, carry_over, created_at | Owner: full CRUD. Members: SELECT. |
| `expense_comments` | id, expense_id, author_role, body, created_at | Owner: full CRUD on own expenses' comments. Reviewer: INSERT (own role) + SELECT. |
| `month_comments` | id, user_id, month, author_role, body, created_at | Owner: full CRUD. Reviewer: INSERT (own role) + SELECT. |
| `budget_memberships` | id, owner_user_id, member_user_id, role, created_at | Owner: full CRUD. Member: SELECT own row. |
