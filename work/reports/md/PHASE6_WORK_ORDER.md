TASK 6.0: Phase 6 — Comments drawer, monthly note modal, role-based UI gating

SUBAGENT BUDGET: 0. Do not freestyle Phase 7. Do not change Supabase RLS SQL/migrations unless absolutely required for UI to compile — prefer UI gating only. If you touch any RLS/policy SQL, MUST flag in commit message.

SCOPE (only these paths):
- src/components/comments/CommentDrawer.jsx (NEW luminous rewrite)
- src/components/comments/MonthlyNoteModal.jsx (NEW)
- src/components/CommentDrawer.jsx (thin re-export of new drawer OR rewrite in place to re-export — App currently imports ./components/CommentDrawer)
- src/hooks/useMembership.js (NEW — extract membership/role load from App.jsx)
- src/App.jsx (wire useMembership; keep CommentDrawer import working; ensure role gates)
- src/pages/DashboardPage.jsx (use MonthlyNoteModal; pass comment open handlers to TransactionList)
- src/components/dashboard/TransactionList.jsx (optional click → onOpenComments; show comment count badge if provided)
- src/pages/SpendingBreakdownPage.jsx (accept + pass onOpenComments/commentCounts to TopExpensesRow)
- src/components/breakdown/TopExpensesRow.jsx (click opens comments if handler provided)
- src/components/MonthCommentCard.jsx (restyle to luminous tokens OR leave and style only via parent — prefer restyle if still purple)

DO NOT:
- Rewrite useComments.js (import only)
- Touch expense scan, subscriptions cards, shell tokens
- Add Investments/Savings/plan tiers
- Delete stale components (Phase 7)

ROLE GATING (orchestrator decisions — implement in UI):
| Role | Add/Delete expense | Manage subs | Comment on expense | Monthly note |
|------|-------------------|-------------|--------------------|--------------|
| owner | yes | yes | yes | no (read display if exists) |
| reviewer | no | no | yes | yes (create/edit) |
| viewer | no | no | no (read comments if drawer open read-only) | no |

- canManageBudget / isOwner stays true only for owner
- Comment submit: owner OR reviewer (already in App)
- Monthly note save: reviewer only (already)
- Viewer: hide Add Expense; hide subscription add/toggle/remove; CommentDrawer shows list but no compose form

LOCKED TOKENS: same Shell Lock — glass-card, btn-primary/secondary, input-shell, primary #d0bcff, surface-container-lowest #0f0d15, on-surface #e7e0ed. NO --accent-purple / rgba(124,111,224) / section-shell.

IMPLEMENT:
6.1 CommentDrawer — right slide-out glass panel; expense summary header; comment list with author_role + relative time; compose form if canSubmit; empty state
6.2 MonthlyNoteModal — glass centered modal; textarea; Save/Close; props: open, monthLabel, initialBody, onSave, onClose
6.3 useMembership({ sessionUserId }) → { budgetOwnerId, role, accessLoading, error, reload? }; App uses it instead of inline membership useEffect
6.4 Wire comment entry points from recent transactions + top expenses (cursor pointer + optional MessageCircle badge with count)

Keep App CommentDrawer props: open, onClose, expense, comments, role, onSubmitComment

ACCEPTANCE:
- npm run build succeeds
- No purple token leaks in NEW comment components
- Role table above enforced in UI
- useComments not rewritten

COMMIT message:

Phase 6: Comments drawer, monthly note modal, role UI gating

Tasks: 6.1, 6.2, 6.3, 6.4
Design decisions: UI-only role gates; monthly notes reviewer-only; viewer read-only comments
Deviations from spec: none
Flags for review: <"none" OR mandatory note if any RLS/SQL changed — e.g. "6.3 RLS change — needs security review">

Report files + git log -1 --oneline.
Read Shell Lock + current App.jsx membership/comment blocks before coding.
