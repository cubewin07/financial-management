TASK 5.0: Phase 5 — Expense management (Add modal, receipt scan, bulk review)

SUBAGENT BUDGET: 0. Do this yourself. Do not freestyle Phase 6/7.

SCOPE (only these paths):
- src/components/AddExpenseModal.jsx (REWRITE in place — App.jsx imports this path)
- src/components/expenses/ExpenseForm.jsx (NEW)
- src/components/expenses/ReceiptScanner.jsx (NEW)
- src/components/expenses/BulkReviewForm.jsx (NEW)

Leave stale files at src/components/ExpenseForm.jsx, ReceiptScanner.jsx, BulkReviewForm.jsx unused (do not delete — Phase 7 cleanup).
Do NOT modify: App.jsx (keep props), shell, auth, dashboard, subscriptions, breakdown, hooks, lib/ReceiptLLMProvider.js (IMPORT only).

PUBLIC API (must stay identical for App.jsx):
```
<AddExpenseModal open onClose onAddExpense userId />
```
onAddExpense already accepts a single expense OR array (see App handleAddExpense).

ORCHESTRATOR DECISIONS (locked):
- Categories: keep CATEGORIES from utils/finance.js (Food, Groceries, Transport, Entertainment, Shopping, Bills, Health, Education, Other) — Q12
- Receipt scan: reuse ReceiptLLMProvider from lib/ exactly as old ExpenseForm did
- Modes inside modal/form: 'manual' | 'scanning' | 'reviewing'
- Manual fields: large amount, note/description, category (native select with input-shell — no AnimatedSelect purple), date (native date input or simple DatePicker restyled with tokens)
- Upload File + Scan Receipt buttons on scanner step
- Bulk review: editable rows for AI results, save calls onAddExpense(itemsArray) or createExpense-normalized objects matching old shape: { amount, category, date, note }
- No multi-currency. No brand logos.

LOCKED TOKENS:
- background #15121b; surface-container-lowest #0f0d15; surfaces #211e27/#1d1a23/#2c2832/#37333d
- on-surface #e7e0ed; on-surface-variant #cbc3d7; outline #958ea0; outline-variant #494454
- primary #d0bcff; primary-container #9f78ff; secondary #d3fbff/#00eefc; tertiary #ffb0ca/#f15999; error #ffb4ab
- glass-card, btn-primary, btn-secondary, input-shell from design-tokens.css
- NO --accent-purple, rgba(124,111,224), section-shell-purple, --text-primary/--text-secondary old tokens

IMPLEMENT:
5.1 AddExpenseModal — glass modal overlay (surface-container-lowest/80 + blur), title Add Expense, Close, hosts ExpenseForm
5.2 ExpenseForm — manual form + mode switch to ReceiptScanner; on successful scan → BulkReviewForm; wire ReceiptLLMProvider
5.3 BulkReviewForm — glass review list; edit amount/category/date/note; delete row; add row; Save all / Cancel

Study old ExpenseForm.jsx for ReceiptLLMProvider call patterns and createExpense usage — reimplement UI only, keep scan logic behavior.

ACCEPTANCE:
- npm run build succeeds
- App.jsx needs zero changes
- No old purple token classes in new files
- ReceiptLLMProvider imported not rewritten

COMMIT (stage only Phase 5 files):

Phase 5: Expense management — add modal, receipt scan, bulk review

Tasks: 5.1, 5.2, 5.3
Design decisions: keep CATEGORIES; native selects; reuse ReceiptLLMProvider
Deviations from spec: none
Flags for review: none

Report files changed + git log -1 --oneline.
Read work/plans/Luminous_Velocity_Shell_Lock.md and old ExpenseForm.jsx before coding.
