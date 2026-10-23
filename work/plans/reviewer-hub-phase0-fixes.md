# Reviewer Hub — Phase 0 (bug fixes in PR #8) — Agent Handoff

> **Branch:** `feat/reviewer-hub-sharing` (PR #8) · **Role split:** the planner/reviewer wrote this; a **coder agent** finishes it.
> **Skills to load:** `tooling/skills/shared/karpathy-coding-principles.md`, `tooling/skills/workflow/mattpocock-tdd.md`, `tooling/skills/workflow/superpowers-executing-plans.md`.
> **Scope rule:** surgical. Do **not** restyle, split components, or touch migrations here. The redesign lives in a *separate stacked PR* — see [`reviewer-hub-redesign-spec.md`](./reviewer-hub-redesign-spec.md).

## Decisions already made by the user
- Bug fixes go into PR #8. The redesign goes into a **new PR stacked on top of PR #8**.
- Instant reviewer access is **fine** (the candidate invites the reviewer). So the "neutral invite message / consent flow" item is **dropped**. Do not change `add_budget_reviewer_by_email`.
- Migration `015_change_id_from_uuid_to_increment.sql`: **leave untouched in this PR.** Whether to split it out of PR #8 is still the user's call; do not move or edit it without asking.

## Bugs being fixed
| ID | Bug | Where |
|---|---|---|
| B1 | Category filter dropdown is empty and throws on select. `CustomSelect` takes `options` + `onChange(value)`; page passed `<option>` children + `e.target.value`. | `ReviewerHubPage.jsx` |
| B2 | Pace verdict, "% Consumed" and "Remaining" compared **90-day / yearly / all-time** spend with the **monthly** budget. | `ReviewerHubPage.jsx` |
| B3 | "Custom range" period offered but there is no date picker and `customRange` is never passed. | `ReviewerHubPage.jsx`, `finance.js` |
| B4 | RPC-fallback membership rows have no email, so cards render a blank title / initial `U`. | `useMembership.js` |
| **B5 (new)** | **"Daily Burn Rate" card always showed $0.00/day.** Page read `burnRate.dailyRate` / `burnRate.projectedSpend`, but `getDailyBurnRate()` returns `{ dailyAvg, daysCovered, totalSpent }`. | `ReviewerHubPage.jsx` |
| **B6 (new)** | **Recurring (subscription) rows look commentable but can't be.** `useCandidateReport` merges virtual rows (`id: sub-exp-<subId>-<date>`, `subscription_id` set) into the list. `expense_comments.expense_id` is a foreign key to `expenses`, so a reviewer comment on one cannot be stored. *(Verify by attempting it once; expect an insert error.)* | `ReviewerHubPage.jsx`, `finance.js` |

## Status

### ✅ Already edited in the working tree (uncommitted, **not yet tested or built**)
- [`src/utils/finance.js`](../../src/utils/finance.js)
  - `REVIEWER_PERIOD_OPTIONS` = `PERIOD_OPTIONS` minus `custom` (B3)
  - `getCategoryFilterOptions(expenses)` → `[{value:'all',label:'All Categories'}, ...unique categories]` (B1)
  - `getMonthPace({ monthlyBudget, monthSpent, now })` — pure, current-month pace (B2)
- [`src/pages/ReviewerHubPage.jsx`](../../src/pages/ReviewerHubPage.jsx)
  - Category `CustomSelect` now uses `options={categoryOptions}` and `onChange={setCategoryFilter}`; hidden when only "All" exists (B1)
  - Period select uses `REVIEWER_PERIOD_OPTIONS`; changing period resets `categoryFilter` to `'all'` (B1/B3)
  - `pacingAnalysis` = `getMonthPace({ monthlyBudget, monthSpent: <current-month spend from allExpenses> })` (B2)
  - "Remaining Buffer" card → **"Remaining This Month"**, driven by `pacingAnalysis.remaining` (B2)
  - Burn-rate card uses `burnRate.dailyAvg`; sub-text is `Projected month-end: …` for `current-month`, otherwise `Averaged over N days` (B5)
- [`src/hooks/useMembership.js`](../../src/hooks/useMembership.js)
  - Exports `FALLBACK_OWNER_LABEL = 'Shared budget'` and `FALLBACK_MEMBER_LABEL = 'Authorized reviewer'`; fallback rows get these as `owner_email` / `member_email`; RPC failure is `console.warn`ed (B4)

### ⬜ Remaining tasks for the coder agent

**P0-1 — Review the edits above.** Run `git diff -- src` and confirm nothing else changed. Confirm `uniqueCategories` / `PERIOD_OPTIONS` have no leftover references in `ReviewerHubPage.jsx` (`grep -n "uniqueCategories\|PERIOD_OPTIONS" src/pages/ReviewerHubPage.jsx`).

**P0-2 — Add tests** to [`src/tests/reviewer-hub.test.js`](../../src/tests/reviewer-hub.test.js). Tests here are plain `node` scripts with `node:assert/strict` (no DOM / jsdom), so test **pure helpers only**. Add the new imports to the existing import block, and put the new checks inside `runTests()` **before** the final dynamic `import(...).then(...)` block.

```js
import {
  getExpensesForPeriod, getFinanceSummary, getChartCategoryBreakdown, getDailyBurnRate,
  REVIEWER_PERIOD_OPTIONS, getCategoryFilterOptions, getMonthPace,
} from '../utils/finance.js';

// B3 — reviewer periods never include 'custom'
assert.ok(REVIEWER_PERIOD_OPTIONS.length >= 3);
assert.equal(REVIEWER_PERIOD_OPTIONS.some((o) => o.value === 'custom'), false);
assert.ok(REVIEWER_PERIOD_OPTIONS.some((o) => o.value === 'current-month'));

// B1 — category options match the CustomSelect contract
const catOpts = getCategoryFilterOptions([
  { category: 'Food' }, { category: 'Food' }, { category: 'Transport' }, { category: null }, {},
]);
assert.deepEqual(catOpts, [
  { value: 'all', label: 'All Categories' },
  { value: 'Food', label: 'Food' },
  { value: 'Transport', label: 'Transport' },
]);
assert.deepEqual(getCategoryFilterOptions([]), [{ value: 'all', label: 'All Categories' }]);

// B2 — pace (fixed clock: 15 Oct 2026, 31-day month => 17 days remaining incl. today)
const now = new Date(2026, 9, 15);
const onTrack = getMonthPace({ monthlyBudget: 1000, monthSpent: 300, now });
assert.equal(onTrack.daysInMonth, 31);
assert.equal(onTrack.daysRemaining, 17);
assert.equal(onTrack.dailyAvg, 20);
assert.equal(onTrack.projectedEndSpend, 620);
assert.equal(onTrack.remaining, 700);
assert.equal(onTrack.budgetSpentPercent, 30);
assert.equal(onTrack.isPacingOver, false);
const over = getMonthPace({ monthlyBudget: 1000, monthSpent: 800, now });
assert.equal(over.isPacingOver, true);               // projected ~1653 > 1000
const noBudget = getMonthPace({ monthlyBudget: 0, monthSpent: 500, now });
assert.equal(noBudget.budgetSpentPercent, null);
assert.equal(noBudget.isPacingOver, false);
assert.equal(noBudget.safeDailyAllowance, 0);

// B5 — burn-rate contract the page depends on
const burn = getDailyBurnRate([{ amount: 30, date: '2026-10-01' }], 'current-month');
assert.ok('dailyAvg' in burn && 'daysCovered' in burn);
assert.equal('dailyRate' in burn, false);
```
Add a `console.log('✓ …')` line per block to match the file's style.

**P0-2b — Fix B6 (recurring rows).**
1. Add to `src/utils/finance.js` (the redesign PR reuses it — do **not** inline the check elsewhere):
```js
// Virtual rows generated from subscriptions have no row in `expenses`, so they cannot hold comments.
export function isRecurringExpense(expense) {
  return Boolean(expense?.subscription_id) || String(expense?.id ?? '').startsWith('sub-exp-');
}
```
2. In the "Transaction Audit" list in `ReviewerHubPage.jsx` (`filteredExpenses.map`): for recurring rows, **omit** the `onClick`, the `cursor-pointer`/hover classes and the right-hand `MessageCircle` button; show a small muted `Recurring` tag instead (same size as the comment-count badge). Keep the row visible so totals still reconcile. Add `aria-disabled="true"` on those rows.
3. Make the `"Has Comments"` filter and `getExpenseComments(e.id)` calls skip recurring rows (they have none).
4. Test (add to `reviewer-hub.test.js`, import `isRecurringExpense`):
```js
assert.equal(isRecurringExpense({ id: 'sub-exp-12-2026-10-01', subscription_id: 12 }), true);
assert.equal(isRecurringExpense({ id: 'sub-exp-12-2026-10-01' }), true);
assert.equal(isRecurringExpense({ id: 42 }), false);
assert.equal(isRecurringExpense({ id: 'a3f9-uuid', subscription_id: null }), false);
assert.equal(isRecurringExpense(null), false);
```

**P0-3 — (Small, low-risk) `useCandidateReport` loading behaviour** — [`src/hooks/useCandidateReport.js`](../../src/hooks/useCandidateReport.js)
- Run the 4 independent Supabase queries with `Promise.all` instead of 4 sequential `await`s. Keep the same error semantics: `expenses`, `subscriptions`, `monthly_snapshots` errors throw; `user_settings` error is ignored (current behaviour, uses `.maybeSingle()`).
- Do **not** change the returned object shape.
- Replace `select('*')` on `expenses` with the explicit columns the app uses. **Check `src/lib/transactions.ts` and `src/hooks/useExpenses*`/App for the exact column list first** — do not guess. If unsure, leave `select('*')` and note it in the PR.
- Silent refresh: only call `setLoading(true)` when no data has loaded yet for this `candidateOwnerId` (mirror the `initialLoadDone` ref pattern in `useMembership.js`).

**P0-4 — Verify.**
```bash
node src/tests/reviewer-hub.test.js   # new assertions pass
npm test                              # all suites green (there is no `npm run lint` script in this repo)
npm run build                         # vite build compiles
```

**P0-5 — Manual check** with a reviewer account that has ≥1 shared budget, at **390px** and **1280px** widths:
1. Open `/review-hub/<ownerId>`. Open the category dropdown → it lists categories; picking one filters the list; switching the period resets it to "All Categories" (B1).
2. Period dropdown has **no** "Custom range" (B3).
3. Switch to "Last 90 days": the pace banner still shows **this month's** verdict; the "Remaining This Month" value does **not** change vs "This month" (B2).
4. "Daily Burn Rate" shows a real non-zero number when there are expenses (B5).
5. (Optional) Temporarily make `get_my_reviewee_candidates` fail (rename in dev) and confirm cards show "Shared budget" instead of blank (B4).

**P0-6 — Commit.** Stage **only** these files — the working tree also contains unrelated changes (`src/.DS_Store`, deleted `work/plans/supabase-resilience-circuit-breaker.md`, deleted `work/reports/md/supabase-circuit-breaker-review.md`) that must **not** go into this PR:
```bash
git add src/utils/finance.js src/pages/ReviewerHubPage.jsx src/hooks/useMembership.js \
        src/hooks/useCandidateReport.js src/tests/reviewer-hub.test.js
git commit -m "fix(reviewer-hub): category filter, month-scoped pace, burn-rate fields, fallback labels"
```
Do **not** commit `work/plans/reviewer-hub-redesign-spec.md` or `work/plans/assets/` on this branch — they belong to the stacked redesign branch (see the spec's "Branching" section).

## Explicitly out of scope for this PR (tracked for later)
| Item | Where it goes |
|---|---|
| R1 Migration 015 risk | User decision pending. Do not edit. |
| R2 Invite message / consent | Dropped — user accepted instant access. |
| R4 Duplicate reviewer UI in Settings + Hub | Redesign PR (`ReviewerManager`). |
| R5 Category bar overflow >100% | Redesign PR (`CategoryBar`). |
| R6 1,170-line page monolith | Redesign PR. |
| R7 Jargon copy ("RLS Protected", "Telemetry", emoji icons) | Redesign PR. |
| Surface membership `error` + Retry in the hub | Redesign PR (needs `App.jsx` prop plumbing). |
| `getMonthPace` includes future-dated subscription occurrences in "this month" spend (same as the existing `current-month` period) | Note only; revisit with owner-side pace card for consistency. |
