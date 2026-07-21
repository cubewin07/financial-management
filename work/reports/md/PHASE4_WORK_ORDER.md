TASK 4.0: Phase 4 — Spending Breakdown page (Luminous Velocity)

You own the BREAKDOWN lane only. SUBAGENT BUDGET: 0. Do not spawn subagents.
Do not touch Dashboard, Subscriptions, shell, auth, or App.jsx unless prop interface is broken (prefer identical props).

SCOPE (only these paths):
- src/pages/SpendingBreakdownPage.jsx (REWRITE)
- src/components/breakdown/CategoryBarChart.jsx (NEW)
- src/components/breakdown/BudgetDonut.jsx (NEW)
- src/components/breakdown/DailyTrendChart.jsx (NEW)
- src/components/breakdown/TopExpensesRow.jsx (NEW)
- src/utils/finance.js (APPEND ONLY: add getMonthOverMonthDelta(snapshots, currentMonthKey?) and getProjectedDailyTrend(actualTrend) — do not change existing function signatures/behavior)

DOES NOT:
- No savings goals / yearly goal copy as real data (❌)
- No per-category budgets (❌) — donut is % of TOTAL budget used
- No old purple section-shell / --accent-purple / rgba(124,111,224)
- Do not rewrite REUSABLE hooks
- Do not edit subscriptions files or dashboard files
- Do not edit App.jsx if props already include: expenses, period, summary, customRange, snapshots, onBack, onPeriodChange, onCustomRangeChange, onOpenComments, commentCounts, onDeleteExpense, canDeleteExpense

ORCHESTRATOR DECISIONS (locked):
- Metrics: Total Spent, Budget Remaining, Saved/remaining this period — from summary (totalSpent, remaining, budget). Use SummaryMetricCard if useful (import from components/ui/SummaryMetricCard.jsx).
- Month-over-month: if snapshots provide prior month total, show "+X% vs last month" via new helper; if data missing, hide delta (don't invent).
- Projected trend (Q14): linear extrapolation from current daily average — second line on DailyTrendChart labeled Projected; only extend remaining days of current month if period is current-month-like, else skip projected.
- Category icons on top expenses: same lucide category mapping approach as dashboard TransactionList (inline helper OK).
- Period selector: keep PERIOD_OPTIONS from finance.js with simple glass select/buttons — may use native select styled with input-shell to avoid depending on stale AnimatedSelect styling. Custom range: simple two date inputs if custom selected (avoid rewriting DateRangePicker purple theme).
- Layout inspiration from stitch screen 7 content only — ignore its sidebar.

LOCKED TOKENS (verbatim):
- background/surface #15121b; surface-container-lowest #0f0d15; surface-container #211e27 / low #1d1a23 / high #2c2832 / highest #37333d
- on-surface #e7e0ed; on-surface-variant #cbc3d7; outline #958ea0; outline-variant #494454
- primary #d0bcff; on-primary #3b0091; primary-container #9f78ff
- secondary #d3fbff / container #00eefc; tertiary #ffb0ca / container #f15999
- error #ffb4ab
- Plus Jakarta Sans; rounded-xl 1.5rem; glass blur 20px; neon chart colors

IMPLEMENT:
4.1 SpendingBreakdownPage layout — metric row + period controls + charts grid + top expenses
4.2 CategoryBarChart — horizontal bars (Recharts BarChart layout="vertical") with labels + %
4.3 BudgetDonut — Recharts PieChart donut showing percentSpent used vs remaining
4.4 DailyTrendChart — LineChart actual (+ optional projected dashed)
4.5 TopExpensesRow — horizontal scroll of top N expense glass cards
4.6 getMonthOverMonthDelta helper in finance.js
4.7 getProjectedDailyTrend helper in finance.js

Reuse: formatCurrency, getChartCategoryBreakdown, getDailyTrend, getFinanceSummary fields already on summary prop, PERIOD_OPTIONS.

ACCEPTANCE:
- Tokens match Shell Lock
- No ❌ features
- npm run build succeeds
- Parent prop interface stable

COMMIT only your Phase 4 files (not work/reports, dist, DESIGN_PLAN, subscriptions, dashboard):

Phase 4: Spending Breakdown — charts, donut, trend, top expenses

Tasks: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
Design decisions: MoM from snapshots when available; projected=linear daily avg; native period controls
Deviations from spec: none (or list)
Flags for review: none

Report: files changed; git log -1 --oneline.
Read work/plans/Luminous_Velocity_Shell_Lock.md before coding.
