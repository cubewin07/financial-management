# Luminous Velocity — Fleet Decision Log

> Continuous build mode. Human reviews once after Phase 7.
> Orchestrator: Grok 4.5 (w3:p1). Workers: 3× agy (w3:p6/p7/pA).

## Skills loaded (orchestrator)

- `herdr` (fleet control)
- `tooling/skills/REGISTRY.md` + CLAUDE.md router
- Shell Lock + DESIGN_PLAN as source of truth
- frontend-design skill installed globally for agy + grok

## Fleet topology

| Pane | Label | Role |
|------|-------|------|
| w3:p1 | grok (orchestrator) | design guardian, verifier, commit gate |
| w3:p6 | agy-dashboard | Phase 1 foundation, then Phase 2 |
| w3:p7 | agy-subscriptions | Phase 3 |
| w3:pA | agy-breakdown | Phase 4 |

**Subagent budget policy:** default 0; fleet-wide concurrent model calls ≤ 4.

---

## Phase 0 — Unblock (orchestrator decisions)

| ID | Decision | Rationale | Reversal cost |
|----|----------|-----------|---------------|
| 0.1 | Shell Lock is `work/plans/Luminous_Velocity_Shell_Lock.md` | Already present and RESOLVED in DESIGN_PLAN | Replace file + restyle tokens |
| 0.2 | Sidebar = Shell Lock (Dashboard / Subscriptions / Spending Breakdown), not Stitch A–D | Locked contract supersedes PNG sidebars | Change Shell Lock + Sidebar component |
| 0.3 Q4 | **Total Balance = effective budget** (carry-over aware), not bank balance | Schema has no account balance; ❌ bank-balance concept | New schema + BalanceHero rewrite |
| 0.3 Q5 | **Budget stays hardcoded** for now; use `MONTHLY_BUDGET` constant (raise to **1500** as a more realistic demo default, still one constant — not user settings) | Avoids user_settings migration mid-redesign; value is easy to tweak | Add settings table later |
| 0.3 Q6 | Savings goals **out of scope** | ❌ NOT POSSIBLE | New feature project |
| 0.3 Q7 | Subscription icons = **letter initial avatar** (no brand logos/catalog) | No logo_url/brand column; avoid fake service catalog | Add brand map or storage later |
| 0.3 Q8 | Next billing date = **frontend compute** from `start_date + frequency` | No migration; pure util | Optional column later for overrides |
| 0.3 Q9 | Per-category budgets **out**; impact = **% of total budget** | ❌ per-category budgets | New table + UI |
| 0.3 Q10 | Billing reminders **cut** | ❌ no notification infra | Edge Function + cron later |
| 0.3 Q11 | Multi-currency **cut**; USD implicit | ❌ no currency column | Schema + formatting later |
| 0.3 Q12 | Keep existing category list in `utils/finance.js` | Stable data; designs' labels are inspiration only | Rename CATEGORIES array later |
| 0.3 Q13 | "Change Plan" **cut**; detail modal edits amount/frequency via existing fields only | No plan-tier model | Define plan tiers later |
| 0.3 Q14 | Projected trend = **linear extrapolation from current daily average** | Simple, no new deps | Swap projection method later |
| routing | Use **react-router-dom** v6 for client routes | Clean AuthGuard + shell nesting; package not yet installed — Phase 1 installs it | Revert to useState page switch |
| mobile sidebar | **Hamburger overlay** on small screens (not bottom nav v1) | One mobile pattern, simpler than dual bottom-nav + overlay | Add bottom nav later |
| brand mark | Sidebar brand text **"Luminous"** (no logo image asset) | No brand assets in repo | Swap for logo later |

**Phase 0 status:** COMPLETE (decisions only; no code commit required for Phase 0 alone).

---

## Phase 1 — Foundation (COMPLETE)

- **Worker:** w3:p6
- **Commit:** `01296a6` Phase 1: Foundation — design tokens, AppShell, auth, routing
- **Shipped:** design-tokens.css, AppShell, Sidebar, Topbar, AuthGuard, LoginPage, SummaryMetricCard, react-router-dom, App rewire
- **Deviations:** none material at ship; AuthGuard initially unwired (caught in 1F)

## Phase 1/2 fix (COMPLETE)

- **Worker:** w3:p6
- **Commit:** `995c9a4` Phase 1/2 fix: wire AuthGuard, billing compute, chart, token cleanup
- **Decisions:** next billing frontend compute (date-fns) in SubscriptionWidget
- **Verified:** AuthGuard wraps App in main.jsx; build green; old marketing header purple removed from App.jsx

## Phase 2 — Dashboard (COMPLETE — freestyle then accepted)

- **Worker:** w3:p6 (jumped ahead after queued permission reply `"2"` was mis-ingested as a prompt; still produced valid Phase 2)
- **Commit:** `c612bed` Phase 2: Dashboard — layout, BalanceHero, charts, widgets
- **Shipped:** BalanceHero, MonthlySpendingChart, TransactionList, SubscriptionWidget, DashboardPage rewrite
- **Deviations at first ship:** mock "Upcoming" billing (fixed in 995c9a4); chart layout fixed in 995c9a4
- **Fleet lesson:** never queue bare digits into agy permission UI via `pane run` text — use careful key handling

## Phase 3 — Subscriptions (COMPLETE)

- **Worker:** w3:p7
- **Commit:** `9708e7b` Phase 3: Subscriptions — cards, detail modal, add modal
- **Shipped:** SubscriptionsPage rewrite; SubscriptionCard/Detail/Add modals; getNextBillingDate helpers
- **Verified:** build green; no logo/currency/reminders; letter avatars; Shell tokens; no purple leaks in new files

## Phase 4 — Spending Breakdown (COMPLETE)

- **Worker:** w3:pA
- **Commit:** `1d1ac62` Phase 4: Spending Breakdown — charts, donut, trend, top expenses
- **Shipped:** CategoryBarChart, BudgetDonut, DailyTrendChart, TopExpensesRow; MoM + projected helpers
- **Verified:** build green; native period controls; projected linear daily avg for current-month

## Phase 5 — Expense management (COMPLETE)

- **Worker:** w3:p6
- **Commit:** `05d62a1` Phase 5: Expense management — add modal, receipt scan, bulk review
- **Shipped:** AddExpenseModal rewrite; expenses/ExpenseForm, ReceiptScanner, BulkReviewForm
- **Verified:** build green; ReceiptLLMProvider imported; App API unchanged; no purple in new expense files

## Phase 6 — Comments & reviewer flow (COMPLETE)

- **Worker:** w3:p6
- **Commit:** `4e68189` Phase 6: Comments drawer, monthly note modal, role UI gating
- **Shipped:** comments/CommentDrawer, MonthlyNoteModal, useMembership, TransactionList/TopExpenses comment entry, MonthCommentCard restyle
- **RLS:** no SQL/policy changes (UI gating only) — **flag for human review of role QA**
- **Bug found post-commit:** useMembership destructures `err` instead of Supabase `error` — fix in Phase 7

## Phase 7 — Polish (in progress)

- **Worker:** w3:p7
- **Work order:** `work/reports/md/PHASE7_WORK_ORDER.md`
- **Subagent budget:** 0

---

## Commit history (phase boundaries)

| Phase | Commit | Notes |
|-------|--------|-------|
| — | e4d6930 | Pre-fleet: design plan + shell lock docs |
| 1 | 01296a6 | Foundation shell + tokens + routing |
| 2 | c612bed | Dashboard components |
| 1F/2F | 995c9a4 | AuthGuard wire + billing + chart fix |
| 3 | 9708e7b | Subscriptions page + modals |
| 4 | 1d1ac62 | Spending breakdown charts |
| 5 | 05d62a1 | Expense modal + receipt scan |
| 6 | 4e68189 | Comments + role UI gating (**no RLS SQL**) |
