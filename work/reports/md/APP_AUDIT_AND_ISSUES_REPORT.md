# Luminous Financial Management — Comprehensive Codebase Audit & Issue Backlog

**Generated:** 2026-11-03  
**Scope:** Full component, hook, utility, state, algorithm, and UI/UX audit across `src/`  
**Design Target:** Luminous Velocity (Premium Minimal Dark UI, Mobile-First `< sm` High-Density Rows, Desktop `>= sm` Spacious Cards, Mathematically Sound Financial Engine)

---

## Executive Summary

After inspecting every page, component, hook, and utility in `src/`, the application has a strong visual identity ("Luminous Velocity") and a well-thought-out Reviewer Hub. However, **12 algorithmic/data-integrity bugs**, **10 UI/UX & mobile-first (`< sm`) density issues**, and **6 architectural/accessibility issues** were verified directly in the source code.

| Category | Count | Highest-Impact Highlights |
| :--- | :---: | :--- |
| **1. Algorithmic & Financial Logic Bugs (`ALG`)** | **12** | Future-dated virtual subscriptions inflate current-month spend & daily burn rate (`ALG-01`); manual expenses fail to deduplicate virtual subscriptions due to `e.item` vs `e.note` mismatch (`ALG-02`); weekly subscriptions are summed without `× 4.33` on the Dashboard (`ALG-03`); `useCarryOver` synthesizes a 1-item `snapshots` array causing "All-Time Monthly Avg" to divide multi-year spend by `1` (`ALG-04`). |
| **2. Mobile-First (`< sm`) & Premium Minimal UI/UX (`UX`)** | **10** | Hover-only delete buttons invisible on iPhone in `InvestmentsPage` (`UX-01`); grouped recurring expenses in `TopExpensesRow` hide the delete button and attach comments to only 1 of `N` transactions (`UX-02`); ~750px of stacked metric cards above tabs on mobile in `SpendingBreakdownPage` (`UX-03`). |
| **3. Architecture, Duplication & Dead Code (`ARCH`)** | **6** | 3 competing sets of `EmptyState`/`LoadingState`/`ErrorState` (`ARCH-01`); dead breakdown components (`CategoryComparisonTable`, `CategoryHealthCard`) (`ARCH-02`); disconnected `src/utils/carryOver.js` engine (`ARCH-03`); duplicate/conflicting CSS rules (`ARCH-04`). |
| **4. Accessibility & Modern Web Polish (`A11Y`)** | **5** | Global `:focus-visible { outline: none !important; }` in `src/index.css` strips keyboard focus rings (`A11Y-01`); custom modals lack `<dialog>` / `inert` focus trapping (`A11Y-02`); form `<label>` elements are not programmatically linked via `htmlFor`/`id` (`A11Y-03`). |

---

## Part 1: Algorithmic & Financial Logic Bugs (`ALG-01` – `ALG-12`)

### `[ALG-01]` Critical: Subscription Cutoff Inconsistency (`endOfMonth` vs `now`) Inflates Current-Month Spend, Daily Burn Rate, and End-of-Month Projection
- **Severity:** Critical (Incorrect Financial Math & Cross-View Discrepancy)
- **Files Involved:**
  - `src/App.jsx` (lines 99–101)
  - `src/utils/subscriptions.js` (`generateSubscriptionExpenseOccurrences`, line 293)
  - `src/utils/finance.js` (`getCurrentMonthExpenses` lines 138–144, `getDailyBurnRate` lines 589–610, `getDailyTrend` lines 214–250)
  - `src/hooks/useCandidateReport.js` (line 112) & `src/hooks/useRevieweeOverviews.js` (line 42)
- **Why It Is True (Verification):**
  1. In `src/App.jsx:100`, `generateSubscriptionExpenseOccurrences(subscriptions)` is called with no second argument, defaulting `cutoff` to `endOfMonth(new Date())` (`src/utils/subscriptions.js:293`). This injects **future-dated subscription bills** for the rest of the current month into `expenses`.
  2. `getCurrentMonthExpenses` (`src/utils/finance.js:141`) and `getExpensesForPeriod` (`'current-month'`, line 298) filter using `isSameMonth(expenseDate, today)` without checking `expenseDate <= today`. Thus, a \$100 subscription due on the 28th is already counted as "Spent" on the 3rd of the month.
  3. **Projection Explosion:** `getDailyBurnRate` (`src/utils/finance.js:598`) divides `totalSpent` (which already includes full-month future subscriptions) by `daysElapsed = now.getDate()`, and `VerdictBlock.jsx:23` / `FinancialPaceCard.jsx:23` multiply `dailyAvg * daysInMonth`. On Day 3 of a 30-day month, a single \$100 subscription due on Day 28 produces a daily burn rate of `\$100 / 3 = \$33.33/day` and a projected monthly spend of **\$1,000**!
  4. **Chart vs. Card Mismatch:** `getDailyTrend` (`src/utils/finance.js:228`) stops its loop at `endDate = now` (today). As a result, `DailyTrendChart` cumulative spend stops at today's date, while `SummaryMetricCard` ("Total Spent") and `BalanceHero` include future dates in the same month—so the chart total and card total do not match.
  5. **Owner vs. Reviewer Mismatch:** `useCandidateReport.js:112` and `useRevieweeOverviews.js:42` call `generateSubscriptionExpenseOccurrences(subs, now)` with `now` instead of `endOfMonth(now)`. Consequently, the Owner's Dashboard and the Reviewer's Report show **different `monthSpent` and `pace` numbers** for the exact same user on the same day.
- **Recommended Fix:**
  - Cap virtual subscription occurrence generation at `now` (today) everywhere, **or** separate `committedUpcomingSubscriptions` from `realizedSpendToDate` so `getDailyBurnRate` only extrapolates variable/discretionary spend (`(discretionarySpent / daysElapsed) * daysInMonth + monthlyFixedSubscriptions`).

---

### `[ALG-02]` Critical: Virtual Subscription Deduplication Fails in `App.jsx` (`e.item` vs `e.note`)
- **Severity:** Critical (Duplicate Expense Counting)
- **Files Involved:**
  - `src/App.jsx` (lines 99–111, 250, 318)
  - Contrast with `src/hooks/useCandidateReport.js` (line 116)
- **Why It Is True (Verification):**
  - In `src/App.jsx:103–105`:
    ```js
    const manualKeys = new Set(
      supabaseExpenses.map((e) => `${(e.item || '').toLowerCase().trim()}_${e.date}`)
    );
    ```
  - However, `EXPENSE_Columns` in `src/App.jsx:250` is `'id,user_id,amount,category,date,note,created_at'`. Supabase rows do **not** have an `item` column—their label is stored in `e.note`!
  - Because `e.item` is always `undefined`, every entry in `manualKeys` is literally `"_${e.date}"`, which never matches `sub_${sub.label.toLowerCase().trim()}_${occ.date}`.
  - Note that `useCandidateReport.js:116` fixed this (`(e.note || e.item || '')`), but `App.jsx:104` still uses `e.item || ''`.
- **Recommended Fix:**
  - Update `src/App.jsx:104` to use `${(e.note || e.item || '').toLowerCase().trim()}_${e.date}`.

---

### `[ALG-03]` High: Weekly Subscriptions Are Not Normalized to Monthly Cost on the Dashboard (`FinancialPaceCard` & `SubscriptionWidget`)
- **Severity:** High (Inconsistent Subscription Totals Across Pages)
- **Files Involved:**
  - `src/components/dashboard/FinancialPaceCard.jsx` (lines 43–45)
  - `src/components/dashboard/SubscriptionWidget.jsx` (line 36)
  - `src/utils/subscriptions.js` (`projectSubscriptionCost`, lines 32–54)
- **Why It Is True (Verification):**
  - `SubscriptionsPage.jsx` and `SubscriptionCard.jsx` use `projectSubscriptionCost(sub)`, which multiplies weekly subscriptions by `4.33` (`src/utils/subscriptions.js:48`).
  - However, on the Dashboard:
    - `FinancialPaceCard.jsx:43–45` calculates `activeSubsBurden` via `.reduce((acc, s) => acc + Number(s.amount || 0), 0)`.
    - `SubscriptionWidget.jsx:36` calculates `totalMonthly` via `.reduce((sum, sub) => sum + (Number(sub.amount) || 0), 0)`.
  - If a user has a \$25/week subscription (e.g., gym or meal prep), `SubscriptionsPage` reports **\$108.25/mo**, whereas the Dashboard `SubscriptionWidget` and `FinancialPaceCard` ("Fixed Bills") report **\$25.00/mo**.
- **Recommended Fix:**
  - Replace `Number(s.amount || 0)` with `projectSubscriptionCost(s)` in both `FinancialPaceCard.jsx` and `SubscriptionWidget.jsx`.

---

### `[ALG-04]` Critical: `useCarryOver.js` Synthesizes a 1-Element `snapshots` Array, Breaking "All-Time Monthly Average", "All-Time Budget", and Historical Rollovers
- **Severity:** Critical (Broken Multi-Month Math & Dead Rollover Engine)
- **Files Involved:**
  - `src/hooks/useCarryOver.js` (lines 10, 212–220)
  - `src/App.jsx` (lines 202–205)
  - `src/pages/SpendingBreakdownPage.jsx` (lines 107–109, 130–142)
  - `src/utils/carryOver.js` (lines 50–127)
- **Why It Is True (Verification):**
  1. `useCarryOver(userId, budget, expenses)` accepts `expenses` as its 3rd parameter (`src/hooks/useCarryOver.js:10`) but **never reads `expenses` anywhere in the hook**.
  2. At lines 212–220, `useCarryOver` hardcodes `snapshots` as a 1-element array containing only `currentMonth` with `total_spent: 0`:
     ```js
     const snapshots = currentMonth ? [{
       month: currentMonth,
       budget: Number(budget) || 0,
       total_spent: 0,
       carry_over: carryOver,
     }] : [];
     ```
  3. Downstream impact in `SpendingBreakdownPage.jsx:107–109` and `App.jsx:202–205`:
     - When the user selects the **"All Time"** period, `periodBudget` is calculated as `budget * Math.max(1, snapshots.length)` → since `snapshots.length` is always `1`, "All-Time Budget" equals **1 single month's budget**!
     - In `SpendingBreakdownPage.jsx:138`, the "Monthly Avg" card for `all-time` divides `allTimeTotal` by `Math.max(1, snapshots.length)` (`1`) — so if you spent \$15,000 across 12 months, "Monthly Avg" displays **\$15,000** ("Across 1 mo")!
     - In `getMonthOverMonthDelta` (`src/utils/finance.js:449`), the fallback to `snapshots` for previous months never finds `prevSnapshot` because `snapshots` only contains `currentMonth`.
  4. Furthermore, even if `buildMonthlySnapshots` in `src/utils/carryOver.js:100–102` were wired up, line 100 overwrites every historical month's snapshot budget with the current `budget` (`budget: Number(budget) || 0`).
- **Recommended Fix:**
  - Compute distinct active months from `allExpenses` (`new Set(allExpenses.map(e => e.date?.slice(0, 7)).filter(Boolean)).size`) for `all-time` month counts, and either wire `buildMonthlySnapshots` properly (preserving historical `existing.budget`) or remove the fake 1-element `snapshots` array.

---

### `[ALG-05]` High: Timezone Bugs (`toISOString().slice(0, 10)` vs Local Date) Shift Dates by 1 Day in New Zealand (`UTC+12`/`UTC+13`)
- **Severity:** High (Wrong Default Dates & Off-by-One Day Chart/Range Filtering in NZT)
- **Files Involved:**
  - `src/App.jsx` (lines 194, 311)
  - `src/components/expenses/ExpenseForm.jsx` (line 42)
  - `src/components/expenses/BulkReviewForm.jsx` (lines 12, 34)
  - `src/components/expenses/ReceiptReviewDrawer.jsx` (lines 36, 73)
  - `src/hooks/useReceiptQueue.js` (lines 158, 224)
  - `src/components/subscriptions/AddSubscriptionModal.jsx` (line 9)
  - `src/components/subscriptions/SubscriptionDetailModal.jsx` (line 31)
  - `src/components/breakdown/DailyTrendChart.jsx` (line 33)
  - `src/pages/SpendingBreakdownPage.jsx` (line 102)
- **Why It Is True (Verification):**
  - `new Date().toISOString().slice(0, 10)` returns the **UTC** date string. In New Zealand (`UTC+13` during daylight saving, `UTC+12` standard), between **12:00 AM and 1:00 PM local time**, UTC is still on **yesterday's date**. Any expense added or receipt scanned before 1:00 PM defaults to yesterday!
  - In `DailyTrendChart.jsx:33`, `new Date(item.isoDate).getDate()` parses `'YYYY-MM-DD'` as **UTC midnight**, whereas `parseISO(item.isoDate)` in `date-fns` parses as local time. In negative UTC offsets (e.g. Americas), `new Date('2026-11-01').getDate()` returns `31`!
  - Similarly, `new Date(customRange.start)` in `App.jsx:194` and `SpendingBreakdownPage.jsx:102` parses `'YYYY-MM-DD'` as UTC midnight instead of local midnight (`parseISO`).
- **Recommended Fix:**
  - Use `format(new Date(), 'yyyy-MM-dd')` from `date-fns` for all local "today" defaults, and `parseISO(dateStr)` for all `'YYYY-MM-DD'` string parsing.

---

### `[ALG-06]` High: Disabling Subscription Reminders (`remind_days_before = null`) Causes `getUpcomingBillingAlerts` to Alert for 30 Days in `Topbar`, and Editing a Subscription Drops `remind_days_before`
- **Severity:** High (Inverted Notification Logic & Data Loss on Edit)
- **Files Involved:**
  - `src/components/subscriptions/AddSubscriptionModal.jsx` (line 43)
  - `src/components/subscriptions/SubscriptionDetailModal.jsx` (lines 97–107, 209–231)
  - `src/utils/subscriptions.js` (`getUpcomingBillingAlerts`, line 183)
  - `src/components/shell/Topbar.jsx` (line 74)
- **Why It Is True (Verification):**
  1. **Data loss on edit:** `SubscriptionDetailModal.jsx` renders the "Remind me before billing" checkbox (`editRemindEnabled`) and days input (`editRemindDays`) at lines 209–231, but `handleSaveUpdate` (lines 97–107) constructs `updates` **without `remind_days_before`**! Saving an edit silently discards any change to reminder settings.
  2. **Null-coalescing bug when reminders are disabled:** When a user unchecks "Remind me before billing" in `AddSubscriptionModal.jsx:43`, it stores `remind_days_before: null`.
  3. However, `getUpcomingBillingAlerts` (`src/utils/subscriptions.js:183`) computes:
     ```js
     const threshold = sub.remind_days_before ?? daysAhead;
     ```
     Because `null ?? daysAhead` falls back to `daysAhead` (`3` on `NotificationsPage`, and **`30` in `Topbar.jsx:74`**), a subscription with reminders **disabled** (`null`) triggers alerts in the Topbar bell for 30 days prior, whereas a subscription with reminders **enabled** (`remind_days_before: 3`) only alerts in the Topbar for 3 days prior!
- **Recommended Fix:**
  - Include `remind_days_before: editRemindEnabled ? Number(editRemindDays) || 3 : 0` (or `null`) in `SubscriptionDetailModal.jsx:107`.
  - In `getUpcomingBillingAlerts`, if `sub.remind_days_before === null` (or `0`), treat reminders as disabled unless `ignoreReminderPreference: true` is explicitly passed by `Topbar` (and if `Topbar` wants all bills due within 30 days, ignore `sub.remind_days_before` consistently for all subscriptions in `Topbar`).

---

### `[ALG-07]` High: `ReceiptLLMProvider.js` Hardcodes Non-Existent `gemini-3.5-flash` Model & `ExpenseForm.jsx` Skips Image/HEIC Compression Before AI Scan
- **Severity:** High (Broken Instant AI Receipt Scan)
- **Files Involved:**
  - `src/lib/ReceiptLLMProvider.js` (line 14)
  - `src/components/expenses/ExpenseForm.jsx` (lines 184–206)
- **Why It Is True (Verification):**
  1. `src/lib/ReceiptLLMProvider.js:14` calls `ai.models.generateContent({ model: "gemini-3.5-flash", ... })`. There is no `gemini-3.5-flash` model in the Google Gen AI API (valid models are e.g. `gemini-2.5-flash` or `gemini-2.0-flash`), causing API calls to fail and fall back to mock data or throw an error.
  2. In `ExpenseForm.jsx:189`, `handleProcessFiles` passes raw `files` directly to `llmProvider.parseReceipt(f)` without calling `compressReceiptImage(f)` from `src/utils/imageCompression.js`. On iPhone (`< sm`), photos are often `.heic` or 5–12 MB JPEGs; while `useReceiptUploader.js:48` converts HEIC and compresses to WebP, `ExpenseForm.jsx` sends raw uncompressed/HEIC base64 strings directly to the browser `FileReader`.
- **Recommended Fix:**
  - Update the model identifier in `ReceiptLLMProvider.js:14` (e.g., `import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'`) and run `compressReceiptImage(f)` before `llmProvider.parseReceipt` in `ExpenseForm.jsx`.

---

### `[ALG-08]` Medium: `TimePatternVerdict.jsx` Hardcodes `/ 5` Weekdays and `/ 2` Weekend Days Regardless of Actual Days Elapsed in Period
- **Severity:** Medium (Incorrect Weekend vs. Weekday Multiplier)
- **Files Involved:**
  - `src/components/breakdown/TimePatternVerdict.jsx` (lines 20–23)
  - `src/utils/finance.js` (`getWeekdayVsWeekendSplit`, lines 803–825)
- **Why It Is True (Verification):**
  - `TimePatternVerdict.jsx:20–21` computes:
    ```js
    const weekdayAvg = split.weekdayTotal / 5;
    const weekendAvg = split.weekendTotal / 2;
    ```
  - Firstly, `weekdayTotal / 5` and `weekendTotal / 2` is only a valid ratio if the selected period has an exact 5:2 ratio of weekdays to weekend days (which is false early in `current-month`, e.g., on the 3rd of a month that started on Saturday, there have been 2 weekend days and only 1 weekday!).
  - Secondly, `weekdayAvg` is displayed or used as if it were the average per weekday, when in fact for a 30-day month (`~22` weekdays and `~8` weekend days), dividing by `5` and `2` inflates both averages by `~4.3×`!
- **Recommended Fix:**
  - Count the actual number of elapsed weekdays and weekend days in the active period (or active expense dates) and divide `weekdayTotal` and `weekendTotal` by the true weekday/weekend day counts.

---

### `[ALG-09]` Medium: `getWeekOverWeekBreakdown` Buckets by Day-of-Month (`1–7`, `8–14`, etc.) Even for `last-90-days`, `this-year`, and `all-time`
- **Severity:** Medium (Misleading "Week-over-Week Pace" Table in Multi-Month Views)
- **Files Involved:**
  - `src/utils/finance.js` (`getWeekOverWeekBreakdown`, lines 834–867)
  - `src/pages/SpendingBreakdownPage.jsx` (lines 125, 424–452)
- **Why It Is True (Verification):**
  - `getWeekOverWeekBreakdown` checks `const dayOfMonth = date.getDate()` and puts every expense on days `1–7` of *any* month into `Week 1 (1-7)`.
  - When the user switches `SpendingBreakdownPage` to **Last 90 Days**, **This Year**, or **All Time**, the table titled **"Week-over-Week Pace"** actually sums Days 1–7 across all 3 to 12+ months combined, rather than showing chronological weeks or labeling it "Time-of-Month Pattern (Days 1–7 vs 22–28)".
- **Recommended Fix:**
  - Either relabel the section for multi-month periods as **"Intra-Month Spending Rhythm (By Day of Month)"** or restrict "Week-over-Week Pace" to single-month views.

---

### `[ALG-10]` Medium: Stale Closure Race Condition in `useSavingsGoals.js` (`addDeposit` & `allocateCarryOver`)
- **Severity:** Medium (Lost Updates on Rapid `+50` / `+100` Taps)
- **Files Involved:**
  - `src/hooks/useSavingsGoals.js` (lines 109–163)
  - `src/pages/SavingsGoalsPage.jsx` (lines 500–515, 667–679)
- **Why It Is True (Verification):**
  - In `useSavingsGoals.js:141–150`, `addDeposit` looks up `const targetGoal = goals.find((g) => g.id === goalId)` from the render closure and sends `const newAmount = (Number(targetGoal.current_amount) || 0) + depositAmount` to Supabase `.update({ current_amount: newAmount })`.
  - If the user taps the quick-deposit pills (`+$50`, `+$100`) twice in quick succession before the first Supabase round-trip finishes, the second call reads the **same stale `targetGoal.current_amount`** and overwrites the first deposit in the database!
- **Recommended Fix:**
  - Track the latest goal amounts in a `useRef` (updated optimistically before awaiting Supabase) or disable deposit buttons while a deposit for that `goalId` is in flight. Also remove the dead duplicate `allocateCarryOver` method inside `useSavingsGoals.js:109–134` (`App.jsx:233` uses `handleAddDeposit` + `useCarryOver.allocateCarryOver`).

---

### `[ALG-11]` Low: `SummaryMetricCard.jsx` Styles `"0% vs last month"` as a Green Decrease (or Amber Increase) Instead of Neutral
- **Severity:** Low (Misleading Semantic Color on Zero Delta)
- **Files Involved:**
  - `src/components/SummaryMetricCard.jsx` (lines 144–155)
- **Why It Is True (Verification):**
  - Line 145 checks `const isIncrease = typeof delta === 'string' && delta.trim().startsWith('+');`.
  - When `delta` is `"0% vs last month"`, `isIncrease` is `false`. The ternary `isGoodChange = invertDeltaColor ? !isIncrease : isIncrease` evaluates to `true` when `invertDeltaColor` is true, styling `"0% vs last month"` in **emerald green** with a downward `TrendingDown` arrow!
- **Recommended Fix:**
  - Check for `const isZero = typeof delta === 'string' && /^0(\.0+)?%/.test(delta.trim());` and style zero deltas with a neutral slate badge (`bg-white/5 text-slate-400 border-white/10`) and a horizontal `Minus` icon.

---

### `[ALG-12]` Low: Intentional Bug / Unchecked Division by Zero in `src/utils/mathUtils.js`
- **Severity:** Low (Unused Utility with Known Bugs)
- **Files Involved:**
  - `src/utils/mathUtils.js` (lines 1–35)
- **Why It Is True (Verification):**
  - Contains `calculatePercentage`, `calculateCompoundInterest`, and `daysToReachGoal` with explicit comments like `// Bug: Potential division by zero if annualRate is 0` (line 27). It is not imported by any component, appearing to be a sandbox/test file left in `src/utils/`.
- **Recommended Fix:**
  - Either fix the zero-guards (`if (total === 0) return 0; if (annualRate <= 0) ...`) or remove `src/utils/mathUtils.js` if it was only for testing.

---

## Part 2: Mobile-First (`< sm`) & Premium Minimal UI/UX Issues (`UX-01` – `UX-10`)

Per `AGENTS.md` Rule 7, the app is primarily used on **iPhone (`< sm`)** where convenience, high information density, touch-friendly controls, and low scroll fatigue are paramount.

### `[UX-01]` High: `InvestmentsPage.jsx` Delete Button Uses `opacity-0 group-hover:opacity-100` (Invisible on iPhone Touchscreens) & Lacks Mobile Compact Stat Strip
- **Severity:** High (Unusable Control on Mobile + Excessive Vertical Scroll)
- **Files Involved:**
  - `src/pages/InvestmentsPage.jsx` (lines 196–259, 341)
- **Why It Is True (Verification):**
  1. At line 341, the asset delete button has class `opacity-0 group-hover:opacity-100`. On iOS Safari (touch devices without hover), this button is invisible, forcing users to guess and tap blank space on the right edge of the row.
  2. At lines 196–259, the 3 summary cards (`Total Net Worth`, `Active Assets`, `Largest Holding`) stack vertically in a `grid-cols-1 sm:grid-cols-3` layout, consuming ~360px of vertical height on iPhone before the user even sees their portfolio list (whereas `SavingsGoalsPage.jsx:297` and `SubscriptionsPage.jsx:57` condense their mobile metrics into a single sleek 3-column horizontal strip).
- **Recommended Fix:**
  - Make the delete action visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`) and condense the 3 top cards on `< sm` into a compact 3-column summary strip matching `SubscriptionsPage`.

---

### `[UX-02]` High: `TopExpensesRow.jsx` Default "Group Recurring" Mode Hides the Delete Button and Misroutes Comments on Grouped Rows
- **Severity:** High (Broken Interaction on Default Breakdown View)
- **Files Involved:**
  - `src/components/breakdown/TopExpensesRow.jsx` (lines 11, 14–54, 152–176)
- **Why It Is True (Verification):**
  - `groupRecurring` defaults to `true` (`line 11`). Any expenses sharing the same `category` and `note` are merged into a single row with `isGrouped: true` (`line 36`) and `originalExpense: exp` set to only the first matching expense (`line 27`).
  - At line 166 (`{!expense.isGrouped && canManage && onRemoveExpense && (...)}`), the delete button is completely hidden whenever `isGrouped` is `true`—even for a single transaction! Wait: look at line 36:
    ```js
    isGrouped: true,
    ```
    In `processedExpenses` (`lines 29–39`), **every single item** pushed into `groupedMap` has `isGrouped: true` hardcoded—even when `count === 1`!
  - Let's double check line 36 of `TopExpensesRow.jsx`:
    ```js
    groupedMap.set(key, {
      ...exp,
      amount: Number(exp.amount) || 0,
      count: 1,
      latestDate: exp.date,
      isGrouped: true,
      originalExpense: exp
    });
    ```
    Because `isGrouped: true` is set unconditionally when `groupRecurring` is `true` (the default!), **NO expense in `TopExpensesRow` ever shows a delete button unless the user manually unchecks "Group recurring"**!
  - Furthermore, when `count > 1`, clicking the Comment button (`line 157`) opens `CommentDrawer` for `expense.originalExpense` (only 1 of the `N` grouped transactions) without telling the user which date's transaction they are commenting on.
- **Recommended Fix:**
  - Change line 36 so `isGrouped` is only `true` when `existing.count > 1` (`isGrouped: false` initially, set `existing.isGrouped = true` inside the `if ( groupedMap.has(key) )` branch at line 21!).

---

### `[UX-03]` High: `SpendingBreakdownPage.jsx` Suffers from Severe Scroll Fatigue Above the Fold on Mobile (`< sm`)
- **Severity:** High (Mobile Scroll Fatigue — `AGENTS.md` Rule 7)
- **Files Involved:**
  - `src/pages/SpendingBreakdownPage.jsx` (lines 249–370)
  - `src/components/SummaryMetricCard.jsx` (line 130)
- **Why It Is True (Verification):**
  - On `< sm` viewports, `SpendingBreakdownPage` renders:
    1. Period Filter Bar + Export CSV button
    2. Featured Card 1 (`Total Spent`, `min-h-[120px]`) stacked full-width (`grid-cols-1 sm:grid-cols-2`)
    3. Featured Card 2 (`Daily Burn Rate`, `min-h-[120px]`) stacked full-width
    4. Secondary Card 1 (`Biggest Category`, `min-h-[96px]`) + Secondary Card 2 (`Monthly Avg`, `min-h-[96px]`)
    5. Secondary Card 3 (`Transactions`, `col-span-2`, `min-h-[96px]`)
    6. `VerdictBlock` banner (`~100px`)
  - Total vertical height before reaching the `[Overview | Categories | Time Patterns | Transactions]` tab bar is **~750px** on an iPhone screen (`844px` viewport height), forcing the user to scroll an entire screen height every time they switch tabs or periods.
- **Recommended Fix:**
  - On `< sm`, condense the 5 metric cards into a sleek 2×2 (or 1 hero + 3-col compact strip) layout, and move `VerdictBlock` inside the `Overview` tab panel rather than pinning it above the tab bar for all tabs.

---

### `[UX-04]` Medium: `DayOfWeekChart.jsx` Hides Dollar Amounts Behind Desktop Hover (`opacity-0 group-hover:opacity-100`)
- **Severity:** Medium (Unreadable Chart Values on Mobile Touchscreens)
- **Files Involved:**
  - `src/components/breakdown/DayOfWeekChart.jsx` (lines 28–31)
- **Why It Is True (Verification):**
  - Each day column renders its dollar amount in `<span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">`. On mobile touchscreens, there is no hover state and no Y-axis, so the user sees 7 bars with **zero dollar values** anywhere on the chart!
- **Recommended Fix:**
  - Always show the compact formatted amount (`$45` / `$1.2k`) above non-zero bars on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`), or highlight the peak day + tapped day with a persistent label.

---

### `[UX-05]` Medium: Hardcoded `$` Symbols and `'en-US'` Locale Ignore User's Selected Currency (`EUR`, `GBP`, `VND`, etc.)
- **Severity:** Medium (Currency Localization Inconsistency)
- **Files Involved:**
  - `src/components/dashboard/MonthlySpendingChart.jsx` (line 53: `tickFormatter={(value) => `$${value}`}`)
  - `src/components/expenses/ReceiptReviewDrawer.jsx` (line 278: hardcoded `$` prefix inside amount input)
  - `src/components/ui/forms/CustomNumberInput.jsx` (line 11: defaults `prefix = '$'`)
  - `src/pages/SavingsGoalsPage.jsx` (lines 501–509, 673: hardcoded `+$50`, `+$100`, `+$250` labels)
  - `src/utils/subscriptions.js` (line 159: `toLocaleDateString('en-US', ...)` whereas `finance.js` uses `'en-NZ'`)
- **Why It Is True (Verification):**
  - Even if a user sets their default currency to `EUR (€)` or `VND (₫)` in `BudgetSettingsPage`, `MonthlySpendingChart` Y-axis ticks, `ReceiptReviewDrawer` amount inputs, `CustomNumberInput` fields (in `ExpenseForm`, `AddSubscriptionModal`, `BudgetSettingsPage`), and `SavingsGoalsPage` quick-deposit pills all hardcode `$`.
- **Recommended Fix:**
  - Derive the currency symbol via `Intl.NumberFormat` (or a small `getCurrencySymbol(currency)` helper in `src/utils/finance.js`) and pass it to chart tick formatters, `CustomNumberInput`, and quick-deposit pills.

---

### `[UX-06]` Medium: `AppShell.jsx` Mobile Navigation Duplication (Both Topbar Hamburger Sidebar AND Bottom Nav + "More" Sheet Exist on Mobile)
- **Severity:** Medium (Redundant Navigation Chrome on Mobile)
- **Files Involved:**
  - `src/components/shell/AppShell.jsx` (lines 70–115)
  - `src/components/shell/Topbar.jsx` (lines 145–151)
  - `src/components/shell/MobileBottomNav.jsx` (lines 18–225)
- **Why It Is True (Verification):**
  - On mobile (`< lg`), the user has **two separate complete navigation menus**:
    1. A hamburger button in `Topbar.jsx:145` that slides out the full desktop `Sidebar` from the left (`AppShell.jsx:71–99`).
    2. The iPhone `MobileBottomNav` at the bottom with `Home`, `Analytics`, `+`, `Subs`, and `More` (which slides up a bottom sheet containing `Review Hub`, `Savings Goals`, `Investments`, `Budget Settings`, `Notifications`).
  - Having both a top-left hamburger drawer AND a bottom-right "More" sheet with the exact same links adds visual noise in the Topbar and cognitive duplication.
- **Recommended Fix:**
  - On `< lg`, either remove the left hamburger button in `Topbar` (relying cleanly on the iPhone `MobileBottomNav` + `More` sheet, and placing a compact Sign Out / Profile pill in the `More` sheet or Topbar) or unify them into a single drawer.

---

### `[UX-07]` Medium: `MobileBottomNav.jsx` Collapses to a 4-Column Asymmetrical Bar When `canManageBudget` Is False
- **Severity:** Medium (Visual Balance on Mobile)
- **Files Involved:**
  - `src/components/shell/MobileBottomNav.jsx` (lines 164–175)
- **Why It Is True (Verification):**
  - Actually `canManageBudget` is currently hardcoded to `true` in `App.jsx:209`, which also means `canManageBudget` prop-drilling across 15+ components (`AppShell`, `Sidebar`, `MobileBottomNav`, `DashboardPage`, `TransactionList`, `SubscriptionsPage`, `SubscriptionCard`, `SubscriptionDetailModal`, `SpendingBreakdownPage`, `TopExpensesRow`, `BudgetSettingsPage`, `SavingsGoalsPage`, `InvestmentsPage`) is completely static because Reviewers view candidates inside `/review-hub/:ownerId` (`CandidateReport`), never through the owner's pages!

---

### `[UX-08]` Medium: `DashboardPage.jsx` Mobile Stack Order Pushes `TransactionList` Below `MonthlySpendingChart` and `SubscriptionWidget`
- **Severity:** Medium (Mobile Information Hierarchy)
- **Files Involved:**
  - `src/pages/DashboardPage.jsx` (lines 118–198)
- **Why It Is True (Verification):**
  - On mobile (`< lg`), the `grid-cols-1 lg:grid-cols-12` layout stacks the entire left 7-column rail (`BalanceHero` → `FinancialPaceCard` → `MonthlySpendingChart` → `SubscriptionWidget`) **before** the right 5-column rail (`TransactionList` → `SavingsGoalWidget`).
  - On an iPhone, checking or deleting a recent transaction or viewing `MonthCommentCard` (which is at the very bottom of the page at line 201!) requires scrolling past the hero card, pace card, 6-month bar chart, and subscription widget.
- **Recommended Fix:**
  - Surface `MonthCommentCard` (when unread or active) higher on the Dashboard, and consider placing `TransactionList` immediately after `FinancialPaceCard` on mobile viewports.

---

### `[UX-09]` Low: Visual Token Fragmentation Between "Luminous Purple/Teal" (`design-tokens.css`) and Hardcoded Hex Colors (`#100d17`, `#0e0a14`, `#161120`) in Reviewer & Modal Components
- **Severity:** Low (Design System Consistency)
- **Files Involved:**
  - `src/styles/design-tokens.css`
  - `src/components/reviewer/styles.js` (lines 3–12)
  - `src/components/comments/CommentDrawer.jsx` (line 119)
  - `src/components/auth/LoginPage.jsx` (lines 102–116)
- **Why It Is True (Verification):**
  - While `src/styles/design-tokens.css` defines `--surface-container-*`, `--primary` (`#d0bcff`), and `--secondary` (`#d3fbff`), newer components hardcode arbitrary hex backgrounds (`bg-[#100d17]/80`, `bg-[#161120]`, `bg-[#0b0a12]`) and mix `purple-600`, `cyan-400`, `teal-400`, and `indigo-600` for primary actions.
- **Recommended Fix:**
  - Consolidate surface and accent tokens in `src/styles/design-tokens.css` and map them into `tailwind.config.js` so `bg-surface-low`, `bg-surface-high`, and `text-primary` work uniformly with Tailwind opacity modifiers.

---

### `[UX-10]` Low: `BulkReviewForm.jsx` Uses Native Browser `<input>` and `<select>` While `ReceiptReviewDrawer.jsx` Uses Custom Form Components for the Same Task
- **Severity:** Low (UI Consistency)
- **Files Involved:**
  - `src/components/expenses/BulkReviewForm.jsx` (lines 89–158)
  - `src/components/expenses/ReceiptReviewDrawer.jsx`
- **Why It Is True (Verification):**
  - When scanning multiple receipts via "Instant AI Scan" inside `AddExpenseModal` (`ExpenseForm.jsx`), `BulkReviewForm.jsx` renders native `<select>` and `<input type="date">` controls, whereas background queue scanning uses `ReceiptReviewDrawer.jsx` with `CustomSelect`, `CustomDatePicker`, and image zoom preview.

---

## Part 3: Architecture, Duplication & Dead Code (`ARCH-01` – `ARCH-06`)

### `[ARCH-01]` Medium: Three Competing Sets of `EmptyState`, `LoadingState`, and `ErrorState` Components
- **Files Involved:**
  - Set 1: `src/components/shell/EmptyState.jsx`, `src/components/shell/LoadingState.jsx`, `src/components/shell/ErrorState.jsx`
  - Set 2: `src/components/ui/StateComponents.jsx` (re-exported by `src/components/ui/EmptyState.jsx`, `src/components/ui/LoadingState.jsx`, `src/components/ui/ErrorState.jsx`)
  - Set 3: `src/components/common/States.jsx` (imported by `SavingsGoalsPage.jsx:5` and `SubscriptionsPage.jsx:8`)
- **Impact:**
  - `SavingsGoalsPage` and `SubscriptionsPage` render a completely different `EmptyState` (`src/components/common/States.jsx`) than `DashboardPage` and `SpendingBreakdownPage` (`src/components/shell/EmptyState.jsx`), and `src/components/ui/StateComponents.jsx` defines a 3rd `LoadingState` and `ErrorState`.
- **Recommended Fix:**
  - Consolidate all state views into `src/components/shell/` (or `src/components/ui/`), support both `action` (ReactNode) and `actionLabel` + `onAction` props, and delete the duplicates.

---

### `[ARCH-02]` Medium: Dead Breakdown Components (`CategoryComparisonTable.jsx` & `CategoryHealthCard.jsx`) and Unused Redirector Files
- **Files Involved:**
  - `src/components/breakdown/CategoryComparisonTable.jsx` (0 imports across `src/`)
  - `src/components/breakdown/CategoryHealthCard.jsx` (0 imports across `src/`)
  - `src/design-tokens.css` (0 imports across `src/`; `src/index.css` imports `./styles/design-tokens.css`)
  - `src/components/ui/SummaryMetricCard.jsx` (1-line re-export of `../SummaryMetricCard`)
  - `src/components/CommentDrawer.jsx` (1-line re-export of `./comments/CommentDrawer`)
- **Impact:**
  - Clutters the component tree and confuses maintenance when updating breakdown tables or design tokens.
- **Recommended Fix:**
  - Delete `CategoryComparisonTable.jsx`, `CategoryHealthCard.jsx`, and `src/design-tokens.css`, and standardize import paths for `SummaryMetricCard` and `CommentDrawer`.

---

### `[ARCH-03]` Medium: Disconnected Carry-Over Engine (`src/utils/carryOver.js` vs `src/hooks/useCarryOver.js`)
- **Files Involved:**
  - `src/utils/carryOver.js` (`computeCarryOver`, `getEffectiveBudget`, `buildMonthlySnapshots`, `getPreviousMonthCarryOver`)
  - `src/hooks/useCarryOver.js`
- **Impact:**
  - `src/utils/carryOver.js` implements a pure functional carry-over engine, but **none of its functions are imported anywhere in `src/`**! Instead, `useCarryOver.js` reads a single static `carry_over` column from `user_settings`.

---

### `[ARCH-04]` Low: Duplicate & Conflicting `.input-shell:focus` Rules in `src/index.css` and `src/styles/design-tokens.css`
- **Files Involved:**
  - `src/index.css` (lines 96–99)
  - `src/styles/design-tokens.css` (lines 184–187)
- **Impact:**
  - `design-tokens.css` sets `.input-shell:focus { border-color: var(--primary); box-shadow: 0 0 8px rgba(208, 188, 255, 0.5); }`, and then `index.css` immediately overrides it with `border-color: rgba(208, 188, 255, 0.35); box-shadow: 0 0 0 4px rgba(208, 188, 255, 0.12);`.

---

### `[ARCH-05]` Low: Static `canManageBudget = true` Prop Drilling Across 15+ Owner Components
- **Files Involved:**
  - `src/App.jsx` (line 209) and 15 child components
- **Impact:**
  - `canManageBudget` is hardcoded to `const canManageBudget = true;` in `App.jsx:209` and passed down through every page and modal. Because reviewer access is now isolated inside `/review-hub/:ownerId` (`CandidateReport`), this prop is always `true` in the main app.

---

### `[ARCH-06]` Low: Mixed TypeScript (`.ts`) and JavaScript (`.js`/`.jsx`) Without Shared Domain Types
- **Files Involved:**
  - `src/lib/supabaseClient.ts`, `src/lib/transactions.ts` vs `.js`/`.jsx` everywhere else
- **Impact:**
  - Schema mismatches like `e.item` vs `e.note` (`ALG-02`) happen because `Expense` and `Subscription` objects lack a single shared TypeScript interface or JSDoc typedef.

---

## Part 4: Accessibility & Modern Web Guidance Findings (`A11Y-01` – `A11Y-05`)

### `[A11Y-01]` High: Global `:focus-visible { outline: none !important; }` in `src/index.css` Breaks Keyboard Navigation Visibility
- **Standard:** WCAG 2.4.7 Focus Visible (Level AA)
- **File:** `src/index.css` (lines 72–74)
- **Why It Is True (Verification):**
  - `src/index.css:72–74` declares:
    ```css
    /* Eliminate native OS outline flashes */
    :focus-visible {
      outline: none !important;
    }
    ```
  - While `src/components/reviewer/styles.js` adds `focus-visible:ring-2` via `FOCUS`, dozens of interactive controls across `Sidebar.jsx`, `MobileBottomNav.jsx`, `DashboardPage.jsx`, `SpendingBreakdownPage.jsx`, `SubscriptionsPage.jsx`, and `SavingsGoalsPage.jsx` rely on default focus or `focus:outline-none` without a replacement `focus-visible:ring-*`, making keyboard `<Tab>` navigation invisible.
- **Recommended Fix:**
  - Replace `outline: none !important;` in `src/index.css` with a sleek high-contrast default focus ring (e.g., `:where(a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])):focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`).

---

### `[A11Y-02]` Medium: Custom Modal Overlays (`AddExpenseModal`, `AddSubscriptionModal`, `SubscriptionDetailModal`, `CategoryLimitsModal`, `SavingsGoalsPage` Modals) Lack `role="dialog"`, `aria-modal="true"`, Escape-Key Dismissal, and `inert` Background Isolation
- **Standard:** WCAG 2.4.3 Focus Order & 4.1.2 Name, Role, Value
- **Files Involved:**
  - `src/components/AddExpenseModal.jsx` (lines 10–41)
  - `src/components/subscriptions/AddSubscriptionModal.jsx` (lines 48–60)
  - `src/components/subscriptions/SubscriptionDetailModal.jsx` (lines 116–128)
  - `src/components/breakdown/CategoryLimitsModal.jsx` (lines 45–59)
  - `src/pages/SavingsGoalsPage.jsx` (lines 586–765)
- **Why It Is True (Verification):**
  - While `ConfirmationModal.jsx`, `AdviceSheet.jsx`, and `CommentDrawer.jsx` properly implement `role="dialog"` / `role="alertdialog"`, `aria-modal="true"`, and `Escape` key listeners, the 5 modals listed above are plain `div.fixed.inset-0` wrappers without `role="dialog"`, `aria-modal="true"`, or `Escape` key handlers.
  - **Extra Bug Effect in `AppShell.jsx:39`:** Look at `AppShell.jsx:39`:
    ```js
    // Ignore if a modal or dialog is already open
    if (document.querySelector('[role="dialog"]') || document.querySelector('[aria-modal="true"]')) {
      return;
    }
    ```
    Because `AddSubscriptionModal`, `SubscriptionDetailModal`, `CategoryLimitsModal`, and `AddExpenseModal` do **not** have `role="dialog"` or `aria-modal="true"`, pressing `E` on the keyboard (when focus is not inside an `<input>`) while viewing `SubscriptionDetailModal` or `CategoryLimitsModal` will open `AddExpenseModal` on top of the existing modal!
- **Recommended Fix:**
  - Use the native HTML `<dialog>` element (`.showModal()`) or add `role="dialog" aria-modal="true"` + `Escape` key handling to all modal containers.

---

### `[A11Y-03]` Medium: Custom Form Controls (`CustomInput`, `CustomNumberInput`, `CustomSelect`, `CustomDatePicker`, `CustomTextarea`) Do Not Associate `<label>` with Controls via `htmlFor`/`id`
- **Standard:** WCAG 1.3.1 Info and Relationships & 4.1.2 Name, Role, Value (Level A)
- **Files Involved:**
  - `src/components/ui/forms/CustomInput.jsx` (lines 35–60)
  - `src/components/ui/forms/CustomNumberInput.jsx` (lines 31–58)
  - `src/components/ui/forms/CustomSelect.jsx` (lines 40–71)
  - `src/components/ui/forms/CustomDatePicker.jsx` (lines 150–187)
  - `src/components/ui/forms/CustomTextarea.jsx` (lines 18–41)
- **Why It Is True (Verification):**
  - Each component renders `<label className="...">` as a sibling above `<input>` / `<button>` without `htmlFor` or `id` (`React.useId()`). Screen readers announce the inputs without their label text, and clicking the label does not focus the input.
- **Recommended Fix:**
  - Use `const generatedId = React.useId(); const inputId = props.id || generatedId;` in each form primitive and bind `<label htmlFor={inputId}>` to `<input id={inputId}>` (and `aria-labelledby` on custom `<button>` triggers in `CustomSelect` / `CustomDatePicker`).

---

### `[A11Y-04]` Low: Missing `autocomplete` Attributes on Authentication Inputs in `LoginPage.jsx`
- **Standard:** WCAG 1.3.5 Identify Input Purpose (Level AA)
- **File:** `src/components/auth/LoginPage.jsx` (lines 254–309)
- **Why It Is True (Verification):**
  - `LoginPage.jsx` renders `Email Address`, `Password`, and `Confirm Password` inputs without `autoComplete="email"`, `autoComplete="current-password"`, or `autoComplete="new-password"`, which degrades iOS Keychain / password manager autofill on iPhone.

---

### `[A11Y-05]` Low: Nested Interactive Controls in `CustomDatePicker.jsx` (`<span onClick>` Inside `<button>`)
- **Standard:** HTML5 Content Model & Keyboard Accessibility
- **File:** `src/components/ui/forms/CustomDatePicker.jsx` (lines 156–187)
- **Why It Is True (Verification):**
  - Inside the outer `<button>` of `CustomDatePicker`, lines 176–185 render an interactive `<span onClick={...} title="Clear date">` for clearing the date. This clear action cannot be reached or triggered via keyboard (`Tab`/`Enter`).

---

## Prioritized Action Plan (Suggested Execution Order for Later)

1. **Phase 1 — Financial Engine & Data Integrity (1–2 hours)**
   - Fix `ALG-02` (`e.note || e.item` in `App.jsx:104`).
   - Fix `ALG-01` (unify subscription occurrence cutoff and separate future fixed bills from elapsed daily burn rate).
   - Fix `ALG-03` (use `projectSubscriptionCost` in `FinancialPaceCard.jsx` & `SubscriptionWidget.jsx`).
   - Fix `ALG-04` (compute real month count from `allExpenses` for `all-time` averages/budgets).
   - Fix `ALG-05` (replace `new Date().toISOString().slice(0, 10)` with `format(new Date(), 'yyyy-MM-dd')`).
   - Fix `ALG-06` (include `remind_days_before` in `SubscriptionDetailModal` update payload and fix `null ?? daysAhead` in `getUpcomingBillingAlerts`).
   - Fix `ALG-07` (update Gemini model name in `ReceiptLLMProvider.js` and compress files in `ExpenseForm.jsx`).
2. **Phase 2 — Mobile-First (`< sm`) UX & Interaction Fixes (1–2 hours)**
   - Fix `UX-02` (`TopExpensesRow.jsx` setting `isGrouped: true` on ungrouped single items).
   - Fix `UX-01` (`InvestmentsPage.jsx` mobile delete visibility and compact summary strip).
   - Fix `UX-03` & `UX-04` (`SpendingBreakdownPage` mobile card density above tabs + `DayOfWeekChart` mobile bar labels).
   - Fix `UX-05` (dynamic currency symbol helper instead of hardcoded `$`).
3. **Phase 3 — Accessibility & Codebase Cleanup (1 hour)**
   - Fix `A11Y-01`, `A11Y-02`, `A11Y-03` (`:focus-visible`, modal `role="dialog" aria-modal="true"`, `useId()` in form components).
   - Clean up dead/duplicate files (`ARCH-01`, `ARCH-02`, `ARCH-04`).
