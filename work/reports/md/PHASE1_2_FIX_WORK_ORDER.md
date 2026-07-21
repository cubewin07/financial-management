TASK 1F: Critical fix — AuthGuard not wired; Phase 2 polish

SCOPE (only these files):
- src/main.jsx
- src/App.jsx
- src/components/dashboard/SubscriptionWidget.jsx
- src/components/dashboard/MonthlySpendingChart.jsx
- src/pages/DashboardPage.jsx (cleanup only)

SUBAGENT BUDGET: 0. Do not spawn subagents. Do not start Phase 3/4.

CRITICAL BUG:
AuthGuard.jsx exists and exports useAuth, but nothing wraps the tree with <AuthGuard>.
App.jsx calls useAuth() → always gets default { session: null } → never shows LoginPage, never loads real session.

DOES:
1. main.jsx — wrap as:
   BrowserRouter > AuthGuard > App
   Import AuthGuard from './components/auth/AuthGuard'

2. App.jsx — remove the leftover marketing header block that still uses OLD purple tokens
   rgba(124,111,224,...) — Shell Lock primary is #d0bcff, not old #7c6fe0.
   Keep "Add Expense" button somewhere sensible (Topbar or a slim action row using btn-primary only).
   Do not put full marketing copy header on every page.

3. SubscriptionWidget.jsx — replace mock "Upcoming" with real next-billing compute from start_date + frequency:
   - monthly: advance start_date by months until > today
   - weekly: advance by weeks until > today
   - yearly: advance by years until > today
   - unknown frequency: fall back to start_date or "—"
   Display as short date (e.g. "Apr 12") not "Upcoming".
   Letter initial avatar only (already correct). Do not add brand logos.

4. MonthlySpendingChart.jsx — ensure chart actually renders:
   - For vertical category bars, use default vertical layout (NOT layout="horizontal" without YAxis).
   - Include XAxis (category names) + YAxis (hide or narrow) + Bar.
   - Neon colors from tokens (primary/secondary/tertiary), not random hex if avoidable.
   - getChartCategoryBreakdown may return { name, value, color } — keep compatible.

5. DashboardPage.jsx — delete the long developer comment block about App.jsx props (lines ~33-42). Keep clean component.

DOES NOT:
- Do not implement Phase 3 or 4
- Do not modify REUSABLE hooks/lib/utils
- Do not change nav items
- Do not touch Supabase schema

ACCEPTANCE:
- Unauthenticated user sees LoginPage (no shell)
- Authenticated user sees AppShell + routes
- Build succeeds: npm run build
- No old purple #7c6fe0 / rgba(124,111,224) in App.jsx header chrome

COMMIT (only after build green), message:

Phase 1/2 fix: wire AuthGuard, billing compute, chart, token cleanup

Tasks: 1F AuthGuard wiring; 2.x polish
Design decisions: next billing frontend compute from start_date+frequency
Deviations from spec: none
Flags for review: none

Report: files changed, git log -1 --oneline, confirm login gate works in code path.
