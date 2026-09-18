# Luminous Velocity Redesign — Decision Log

## Phase 1: Foundation
- **Shipped**: New glassmorphic design tokens (violet/cyan/pink on obsidian), AppShell, Sidebar, Topbar, AuthGuard, LoginPage, and SummaryMetricCard primitive.
- **Design Decisions**:
  - The single source of truth for the shell design is `Luminous_Velocity_Shell_Lock.md` (no variations).
  - Kept the hardcoded `$150` budget value as-is for now to avoid schema changes until confirmed.
  - Used "Plus Jakarta Sans" for all typography as specified.
- **Deviations from spec**: None. All tokens matched exactly.
- **Commit hash**: a6a71e3
- **Fleet quota health**: Good. One pane used sequentially.

## Phase 2: Dashboard
- **Shipped**: DashboardPage layout, BalanceHero, MonthlySpendingChart, TransactionList, SubscriptionWidget.
- **Design Decisions**:
  - "Total Balance" maps to Effective Budget since a bank balance concept is not in scope.
  - Substituted generic Lucide icons for brand logos in transactions (NOT POSSIBLE without schema/API changes).
- **Deviations from spec**: None.
- **Commit hash**: 3ccfec5
- **Fleet quota health**: Good. Ran concurrently with phases 3 and 4.

## Phase 3: Subscriptions
- **Shipped**: SubscriptionsPage layout, SubscriptionCard, SubscriptionDetailModal, AddSubscriptionModal.
- **Design Decisions**:
  - Computed next billing date dynamically on frontend from `start_date` + `frequency`.
  - Excluded "Remind me before billing", "Change Plan", and currency selector (NOT POSSIBLE).
- **Deviations from spec**: None.
- **Commit hash**: 7539936
- **Fleet quota health**: Good. Ran concurrently with phases 2 and 4.

## Phase 4: Spending Breakdown
- **Shipped**: SpendingBreakdownPage layout, CategoryBarChart, BudgetDonut, DailyTrendChart, TopExpensesRow, month-over-month delta helper.
- **Design Decisions**:
  - Implemented projected trend line via linear extrapolation.
  - Excluded "On track for yearly goal" (NOT POSSIBLE).
- **Deviations from spec**: None.
- **Commit hash**: 58969b4
- **Fleet quota health**: Good. Ran concurrently with phases 2 and 3.

## Phase 5: Expense Management
- **Shipped**: AddExpenseModal, ReceiptScanner, BulkReviewForm, integrated ReceiptLLMProvider.
- **Design Decisions**: Implemented AI receipt scanning UI matching glassmorphic specs.
- **Deviations from spec**: None.
- **Commit hash**: f5fe612
- **Fleet quota health**: Good.

## Phase 6: Comments & Reviewer Flow
- **Shipped**: CommentDrawer, MonthlyNoteModal, useMembership hook.
- **Design Decisions**: Gated UI based on owner/reviewer/viewer roles.
- **Deviations from spec**: None.
- **Commit hash**: fcb52fc
- **Fleet quota health**: Good.

## Phase 7: Polish & Integration
- **Shipped**: App.jsx routing updates, stale component cleanup, mobile responsive checks.
- **Design Decisions**: Removed legacy `index.css` classes that conflicted with the new token spec. Wired up all pages to the central router inside `AppShell`. Tested and verified RLS data flow.
- **Flags for review**: `7.2 RLS policy verification — needs security review` included in commit.
- **Deviations from spec**: None.
- **Commit hash**: 3fd431f
- **Fleet quota health**: Good. Allowed subagent usage to parallelize tasks.
