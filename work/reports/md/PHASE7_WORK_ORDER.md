TASK 7.0: Phase 7 — Polish, stale cleanup, integration, responsive

SUBAGENT BUDGET: 0. Final phase — do not freestyle new features.

SCOPE:
- src/hooks/useMembership.js (BUGFIX required)
- src/App.jsx (import order cleanup only if needed)
- src/utils/finance.js (update CATEGORY_COLOR_PALETTE / CHART_COLOR_PALETTE / CATEGORY_COLOR_OVERRIDES to Luminous neon hexes only)
- src/index.css (ensure old purple/teal root vars gone or aliased; import design-tokens; no Inter default)
- Delete STALE unused components (verify no live imports first):
  src/components/AnimatedSelect.jsx
  src/components/BalanceCard.jsx
  src/components/BulkReviewForm.jsx  (root — NOT expenses/BulkReviewForm.jsx)
  src/components/CarryOverPill.jsx
  src/components/CategoryChart.jsx
  src/components/DateRangePicker.jsx
  src/components/ExpenseForm.jsx (root — NOT expenses/)
  src/components/ExpenseList.jsx
  src/components/ReceiptScanner.jsx (root — NOT expenses/)
  src/components/SubscriptionCard.jsx (root — NOT subscriptions/)
  src/components/SubscriptionForm.jsx
  src/components/SummaryCard.jsx
  src/components/SupabaseAuthExample.jsx
  src/components/TrendChart.jsx
  src/components/ui/DatePicker.jsx
  src/components/ui/Select.jsx
  src/components/ui/calendar.jsx
  KEEP: src/components/ui/popover.jsx (REUSABLE), CommentDrawer re-export, MonthCommentCard, AddExpenseModal, shell/*, auth/*, dashboard/*, subscriptions/*, breakdown/*, expenses/*, comments/*
- src/components/shell/AppShell.jsx / Sidebar.jsx / Topbar.jsx — quick mobile hamburger audit only (fix if broken)
- DO NOT edit supabase/ migrations or RLS SQL — document verification notes in commit Flags only

CRITICAL BUGFIX 7.0a:
useMembership.js uses `const { data, err } = await supabase...` but Supabase returns `error`, not `err`.
Fix to: `const { data, error } = await ...` and `if (error)`.

7.1 Integration: confirm routes / /subscriptions /breakdown still work; AuthGuard wraps App; Add Expense owner-only; CommentDrawer wired.

7.2 RLS: Do NOT change policies. In commit Flags line write: "7.2 RLS not modified — needs manual owner/reviewer/viewer QA"

7.3 Delete stale list above after `rg` proves zero imports from live paths.

7.4 Responsive: mobile < lg uses hamburger overlay (already); ensure no shrink-to-rail; login still no shell.

7.5 Palette: replace chart colors with Luminous set e.g. #d0bcff, #9f78ff, #00eefc, #d3fbff, #f15999, #ffb0ca (and error #ffb4ab sparingly).

ACCEPTANCE:
- npm run build succeeds
- No broken imports
- useMembership uses `error` correctly
- Stale purple components removed
- Nav still only 3 items

COMMIT:

Phase 7: Polish — stale cleanup, membership fix, token chart colors

Tasks: 7.0a, 7.1, 7.2, 7.3, 7.4, 7.5
Design decisions: chart palette → Luminous neon hexes; no RLS edits
Deviations from spec: none
Flags for review: 7.2 RLS not modified — needs manual owner/reviewer/viewer QA; 6.3 membership is UI+query only (no policy change)

Report deleted files list + git log -1 --oneline.
