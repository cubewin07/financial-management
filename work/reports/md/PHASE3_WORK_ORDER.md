TASK 3.0: Phase 3 — Subscriptions page (Luminous Velocity)

You own the SUBSCRIPTIONS lane only. SUBAGENT BUDGET: 0. Do not spawn subagents.
Do not touch Dashboard, Breakdown, shell, auth, or App.jsx unless a prop type is broken (prefer keeping App.jsx prop interface identical).

SCOPE (only these paths):
- src/pages/SubscriptionsPage.jsx (REWRITE)
- src/components/subscriptions/SubscriptionCard.jsx (NEW — do not use stale src/components/SubscriptionCard.jsx)
- src/components/subscriptions/SubscriptionDetailModal.jsx (NEW)
- src/components/subscriptions/AddSubscriptionModal.jsx (NEW)
- src/utils/subscriptions.js (APPEND ONLY: add getNextBillingDate + formatNextBilling helpers; do not change existing exports' behavior)

DOES NOT:
- No brand logos / service catalog / logo grid (❌ NOT POSSIBLE)
- No multi-currency selector (❌)
- No "Remind me before billing" (❌)
- No "Change Plan" button (❌ cut — Q13)
- No plan_tier column — use `label` as service name only
- No schema migrations
- No Investments/Savings nav
- Do not rewrite hooks (import useSubscriptions via parent props only)
- Do not edit src/App.jsx if current props already suffice: subscriptions, totalMonthlyBurden, budget, onToggleSubscription, onAddSubscription, onRemoveSubscription, canManage

ORCHESTRATOR DECISIONS (locked):
- Icons: letter-initial avatar from label[0], glass circle, secondary/primary tokens
- Next billing: compute from start_date + frequency (monthly/weekly/yearly) — advance until date > today; display "MMM d"
- Budget impact: % of TOTAL budget (getSubscriptionBudgetShare already does this) — NOT per-category
- Cancel in detail modal: call onRemoveSubscription(id) after confirm OR deactivate via onToggleSubscription if active — prefer toggle to inactive for soft cancel if canManage; provide "Remove" as destructive secondary that calls onRemoveSubscription
- Annual total: monthly → amount*12; weekly → amount*52; yearly → amount
- Grid layout only for v1 (no grid/list toggle — defer Q optional)
- Free-form Add form: label, amount, frequency select (weekly|monthly|yearly), start_date — no service search

LOCKED TOKENS (verbatim):
- background/surface #15121b; surface-container-lowest #0f0d15; surface-container #211e27 / low #1d1a23 / high #2c2832 / highest #37333d
- on-surface #e7e0ed; on-surface-variant #cbc3d7; outline #958ea0; outline-variant #494454
- primary #d0bcff; on-primary #3b0091; primary-container #9f78ff
- secondary #d3fbff / container #00eefc; tertiary #ffb0ca / container #f15999
- error #ffb4ab / container #93000a
- Plus Jakarta Sans; rounded-xl 1.5rem cards; rounded-lg 1rem controls
- Glass: rgba(255,255,255,0.05) + blur(20px); border 1px rgba(255,255,255,0.1) + top inner highlight
- Use .glass-card, .btn-primary, .btn-secondary, .input-shell from design-tokens.css

IMPLEMENT:
3.1 SubscriptionsPage — header stats using SummaryMetricCard OR glass metric cards: Monthly obligation (totalMonthlyBurden), Budget impact % (getSubscriptionBudgetShare). "Add subscription" btn-primary if canManage. Responsive card grid of SubscriptionCard.
3.2 SubscriptionCard — initial avatar, label, amount/mo (projectSubscriptionCost), next billing, Active/Inactive badge (primary tint if active). Click opens detail modal. Toggle active if canManage.
3.3 SubscriptionDetailModal — glass modal overlay (surface-container-lowest backdrop). Shows label, amount, frequency, next billing, annual total, budget impact % of total budget, Close, soft Cancel (toggle inactive), Remove (delete).
3.4 AddSubscriptionModal — glass modal form fields above; submit calls onAddSubscription({ label, amount, frequency, start_date }).

Wire SubscriptionsPage to import NEW components from components/subscriptions/* only (leave old SubscriptionCard.jsx unused).

ACCEPTANCE:
- Tokens match Shell Lock (no old --accent-purple / rgba(124,111,224) / amber section-shell)
- No logo catalog / currency / reminders / Change Plan
- npm run build succeeds
- Keep parent prop interface stable

COMMIT only your Phase 3 files (do not stage work/reports, dist, DESIGN_PLAN, dashboard, breakdown):

Phase 3: Subscriptions — cards, detail modal, add modal

Tasks: 3.1, 3.2, 3.3, 3.4
Design decisions: letter avatars; next billing from start_date+frequency; cancel=toggle inactive; remove=delete; no logos/currency/reminders
Deviations from spec: none (or list)
Flags for review: none

Report: files changed; git log -1 --oneline.
Read work/plans/Luminous_Velocity_Shell_Lock.md before coding.
