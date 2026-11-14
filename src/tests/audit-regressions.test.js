import assert from 'node:assert/strict';
import { format, subDays } from 'date-fns';
import {
  computePeriodBudget,
  computeReadyReceiptsTotal,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  getBudgetRemainingPercent,
  getCategorySideBySideComparison,
  getCurrentMonthExpenses,
  getDailyBurnRate,
  getDailyTrend,
  getDateRangeMeta,
  getDayOfWeekPattern,
  getFinanceSummary,
  getFixedVsDiscretionarySplit,
  getGoalsTotals,
  getMonthPace,
  getProjectedDailyTrend,
  getWeekOverWeekBreakdown,
  roundCurrency,
  sortExpenses,
} from '../utils/finance.js';
import { classifyPace } from '../utils/reviewInsights.js';
import {
  computeSkipPayload,
  generateSubscriptionExpenseOccurrences,
  getBillingAmount,
  getMonthRecurringBreakdown,
  getSubscriptionBudgetShare,
  getUpcomingBillingAlerts,
  mergeSubscriptionOccurrences,
  skipNextBillingCycle,
} from '../utils/subscriptions.js';

const iso = (d) => format(d, 'yyyy-MM-dd');
const today = new Date();

console.log('--- Running Audit Regression Tests ---');

// Burn rate must average over the selected period, not over the days that happen to hold expenses.
{
  const expenses = [{ amount: 900, date: iso(today) }];
  assert.equal(getDailyBurnRate(expenses, 'last-90-days').daysCovered, 90);
  assert.equal(getDailyBurnRate(expenses, 'last-90-days').dailyAvg, 10);
  const custom = getDailyBurnRate(expenses, 'custom', { start: '2024-03-01', end: '2024-03-10' });
  assert.equal(custom.daysCovered, 10);
  assert.equal(custom.dailyAvg, 90);
  console.log('✓ burn rate covers the whole selected period');
}

// A recurring item in a flexible category is still a fixed cost.
{
  const split = getFixedVsDiscretionarySplit([
    { amount: 20, category: 'Entertainment', isSubscription: true, id: 'sub-exp-1-2024-01-01' },
    { amount: 20, category: 'Entertainment', id: 'a' },
    { amount: 60, category: 'Bills', id: 'b' },
  ]);
  assert.equal(split.fixedTotal, 80);
  assert.equal(split.discretionaryTotal, 20);
  console.log('✓ recurring charges count as fixed');
}

// Part of this period must be compared with the same part of the previous one.
{
  const now = new Date(2026, 10, 7);
  const items = getCategorySideBySideComparison(
    [{ amount: 50, category: 'Food', date: '2026-11-05' }],
    'current-month',
    null,
    [
      { amount: 50, category: 'Food', date: '2026-11-05' },
      { amount: 40, category: 'Food', date: '2026-10-07' },
      { amount: 900, category: 'Food', date: '2026-10-08' },
    ],
    now,
  );
  assert.equal(items[0].prevVal, 40, 'October is cut off at the 7th to match November so far');

  const year = getCategorySideBySideComparison(
    [{ amount: 50, category: 'Food', date: '2026-02-01' }],
    'this-year',
    null,
    [
      { amount: 10, category: 'Food', date: '2025-11-07' },
      { amount: 900, category: 'Food', date: '2025-11-08' },
    ],
    now,
  );
  assert.equal(year[0].prevVal, 10, 'Last year is cut off at the same calendar date');

  // The previous 90-day window must include its first day.
  const firstDayOfPrevWindow = iso(subDays(today, 179));
  const ninety = getCategorySideBySideComparison(
    [],
    'last-90-days',
    null,
    [{ amount: 25, category: 'Food', date: firstDayOfPrevWindow }],
  );
  assert.equal(ninety[0].prevVal, 25);
  console.log('✓ period comparisons are like-for-like');
}

// Over-funding one goal must not hide what another goal still needs.
{
  const totals = getGoalsTotals([
    { current_amount: 200, target_amount: 100 },
    { current_amount: 0, target_amount: 100 },
  ]);
  assert.equal(totals.saved, 200);
  assert.equal(totals.target, 200);
  assert.equal(totals.percent, 50);
  assert.equal(totals.remaining, 100);
  assert.equal(getGoalsTotals([]).percent, 0);
  console.log('✓ goal totals cap each goal at its target');
}

// Monthly bills stay on the anchor day and do not drift after a short month.
{
  const sub = { id: 'x', label: 'Rent', amount: 10, frequency: 'monthly', start_date: '2024-01-31' };
  const dates = generateSubscriptionExpenseOccurrences([sub], '2024-05-31').map((o) => o.date);
  assert.deepEqual(dates, ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30', '2024-05-31']);

  assert.equal(skipNextBillingCycle(sub, '2024-02-15'), '2024-03-31');
  const payload = computeSkipPayload(sub, '2024-02-15');
  assert.equal(payload.skippedDate, '2024-02-29');
  assert.equal(payload.start_date, '2024-03-31');
  console.log('✓ month-end subscriptions keep their billing day');
}

// A bill paid on day 1 is not a daily rate.
{
  const now = new Date(2026, 10, 10); // 30-day month
  const subscriptions = [
    { id: 'rent', label: 'Rent', amount: 1000, frequency: 'monthly', start_date: '2026-01-01' },
    { id: 'gym', label: 'Gym', amount: 50, frequency: 'monthly', start_date: '2026-01-20' },
    { id: 'off', label: 'Old', amount: 500, frequency: 'monthly', start_date: '2026-01-25', active: false },
  ];
  const monthExpenses = [
    { id: 'sub-exp-rent-2026-11-01', isSubscription: true, amount: 1000, date: '2026-11-01' },
    { id: 'coffee', amount: 100, date: '2026-11-05' },
  ];
  const recurring = getMonthRecurringBreakdown(monthExpenses, subscriptions, now);
  assert.deepEqual(recurring, { recurringSpent: 1000, upcomingRecurring: 50 });

  const pace = getMonthPace({ monthlyBudget: 2000, monthSpent: 1100, now, ...recurring });
  assert.equal(pace.projectedEndSpend, 1350, '1000 rent + 50 gym + 100/10 days over 30 days');
  assert.equal(pace.isPacingOver, false);

  // Linear extrapolation stays the default, and would have reported 3300 here.
  assert.equal(getMonthPace({ monthlyBudget: 2000, monthSpent: 1100, now }).projectedEndSpend, 3300);
  assert.equal(classifyPace({ monthlyBudget: 2000, monthSpent: 1100, now }), 'over');
  assert.equal(classifyPace({ monthlyBudget: 2000, monthSpent: 1100, now, ...recurring }), 'on-track');
  console.log('✓ month-end projection treats recurring bills as one-off amounts');
}

// ---------------------------------------------------------------------------
// Core math audit regressions: rounding, invalid budgets/dates, DST, trend cap
// ---------------------------------------------------------------------------
{
  assert.equal(Object.is(roundCurrency(-0.001), 0), true, 'roundCurrency should normalize -0 to +0');
  assert.equal(roundCurrency(NaN), 0);
  assert.equal(roundCurrency(Infinity), 0);
  assert.equal(roundCurrency(1.005), 1.01);
  assert.equal(roundCurrency(-1.005), -1.01);

  const dustyExpenses = [
    { amount: 100.1 },
    { amount: 200.2 },
    { amount: NaN },
    { amount: 'not-a-number' },
    { amount: null },
  ];
  const zeroBudgetSummary = getFinanceSummary(dustyExpenses, null);
  assert.equal(zeroBudgetSummary.totalSpent, 300.3);
  assert.equal(zeroBudgetSummary.remaining, -300.3);
  assert.equal(zeroBudgetSummary.percentSpent, 0);
  assert.equal(zeroBudgetSummary.transactionCount, 5);

  const exactSummary = getFinanceSummary(dustyExpenses, 300.3);
  assert.equal(exactSummary.remaining, 0);
  assert.equal(exactSummary.percentSpent, 100);

  assert.equal(getBudgetRemainingPercent(0, 0), 0);
  assert.equal(getBudgetRemainingPercent(50, NaN), 0);
  assert.equal(getBudgetRemainingPercent(50, 200), 25);
  console.log('✓ roundCurrency, getFinanceSummary, and getBudgetRemainingPercent handle NaN/null/float dust');
}

{
  assert.equal(
    computePeriodBudget({ period: 'current-month', monthlyBudget: 2000, effectiveBudget: 2500 }),
    2500
  );
  assert.equal(
    computePeriodBudget({ period: 'current-month', monthlyBudget: 2000, effectiveBudget: null }),
    2000
  );
  assert.equal(
    computePeriodBudget({ period: 'last-90-days', monthlyBudget: 2000 }),
    6000
  );
  assert.equal(
    computePeriodBudget({ period: 'this-year', monthlyBudget: 2000, now: new Date(2026, 4, 15) }),
    10000
  );
  assert.equal(
    computePeriodBudget({ period: 'all-time', monthlyBudget: 2000, monthsCount: 4 }),
    8000
  );
  assert.equal(
    computePeriodBudget({ period: 'all-time', monthlyBudget: 2000, monthsCount: 0 }),
    2000
  );
  // DST-safe inclusive calendar day scaling (Sept 5 - Nov 3 = 60 days = 2 months)
  assert.equal(
    computePeriodBudget({
      period: 'custom',
      monthlyBudget: 2000,
      customRange: { start: '2026-09-05', end: '2026-11-03' },
    }),
    4000
  );
  // Partial start-only range falls back to inclusive [start, now] (60 days -> 2 months)
  assert.equal(
    computePeriodBudget({
      period: 'custom',
      monthlyBudget: 2000,
      customRange: { start: '2026-09-05' },
      now: new Date(2026, 10, 3),
    }),
    4000
  );
  // Short (<30 days) or reversed custom range floors cleanly at 1-month budget
  assert.equal(
    computePeriodBudget({
      period: 'custom',
      monthlyBudget: 3000,
      customRange: { start: '2026-03-07', end: '2026-03-09' },
    }),
    3000
  );
  assert.equal(
    computePeriodBudget({
      period: 'custom',
      monthlyBudget: 3000,
      customRange: { start: '2026-04-10', end: '2026-04-01' },
    }),
    3000
  );
  console.log('✓ computePeriodBudget scales custom (DST-safe), multi-month, and malformed ranges cleanly');
}

{
  const total = computeReadyReceiptsTotal([
    { extracted_data: { total: '12.34' } },
    { extracted_data: { total: NaN, items: [{ amount: 10.1 }, { amount: 20.2 }] } },
    { extracted_data: { total: null, items: [{ amount: '5.555' }] } },
    { extracted_data: { total: 0, items: [] } },
    { extracted_data: null },
  ]);
  assert.equal(total, 48.2);
  console.log('✓ computeReadyReceiptsTotal normalizes string totals, NaN totals, and item fallbacks');
}

{
  // March (31 days) vs February (28 days): previousMonthTrend must stop at Feb 28 (no Mar 1..3 overflow)
  const marchNow = new Date(2026, 2, 31);
  const marchAll = [
    { date: '2026-03-05T23:30:00Z', amount: 42 },
    { date: '2026-02-28', amount: 19 },
  ];
  const marchTrend = getDailyTrend(
    [marchAll[0]],
    'current-month',
    null,
    marchAll,
    marchNow
  );
  assert.equal(marchTrend.actualTrend.length, 31);
  assert.equal(marchTrend.actualTrend[4].isoDate, '2026-03-05');
  assert.equal(marchTrend.actualTrend[4].total, 42, 'ISO timestamp normalizes to March 5 local day');
  assert.equal(marchTrend.previousMonthTrend.length, 28, 'previousMonth stops at Feb 28 instead of Mar 1..3');
  assert.equal(marchTrend.previousMonthTrend[27].total, 19);

  // Float-equal spend == budget on final day must not trigger false over-budget alert
  const dustPace = getMonthPace({
    monthlyBudget: 300.3,
    monthSpent: 100.1 + 200.2,
    now: new Date(2026, 3, 30),
  });
  assert.equal(dustPace.monthSpent, 300.3);
  assert.equal(dustPace.remaining, 0);
  assert.equal(dustPace.projectedEndSpend, 300.3);
  assert.equal(dustPace.isPacingOver, false);

  // Projected daily trend with recurring split aligns with getMonthPace
  const aprilNow = new Date(2026, 3, 10);
  const aprilTrend = getDailyTrend(
    [
      { date: '2026-04-01', amount: 1000 },
      { date: '2026-04-10', amount: 100 },
    ],
    'current-month',
    null,
    [],
    aprilNow
  );
  const projected = getProjectedDailyTrend(
    aprilTrend.actualTrend,
    { recurringSpent: 1000, upcomingRecurring: 50 },
    aprilNow
  );
  assert.equal(projected.at(-1).total, 1350);
  assert.equal(aprilNow.getDate(), 10, 'must not mutate caller Date');
  console.log('✓ getDailyTrend, getProjectedDailyTrend, and getMonthPace handle short Feb, ISO timestamps, and float dust');
}

{
  assert.equal(formatShortDate('not-a-date'), '—');
  assert.equal(formatLongDate(null), '—');
  assert.equal(formatMonthLabel('invalid'), '—');

  const mixedDates = [
    { id: 'bad-1', date: 'not-a-date', amount: 999 },
    { id: 'bad-2', date: null, amount: 123 },
    { id: 'ok-1', date: '2026-04-06', amount: 25 }, // Monday, Week 1
  ];
  const sorted = sortExpenses(mixedDates);
  assert.equal(sorted.length, 3);
  assert.doesNotThrow(() => getCurrentMonthExpenses(mixedDates));
  assert.doesNotThrow(() => getDateRangeMeta(mixedDates));

  const dow = getDayOfWeekPattern(mixedDates);
  const dowValues = Array.isArray(dow) ? dow.map((d) => d.total ?? d.amount ?? 0) : Object.values(dow);
  const dowSum = dowValues.reduce((s, v) => s + v, 0);
  assert.equal(dowSum, 25, 'malformed dates must not leak into day-of-week totals');
  assert.equal('undefined' in (Array.isArray(dow) ? {} : dow), false);

  const wow = getWeekOverWeekBreakdown(mixedDates);
  const wowSum = wow.reduce((s, w) => s + w.total, 0);
  assert.equal(wowSum, 25, 'malformed dates must not spill into Week 5 (29+)');
  console.log('✓ date helpers and aggregations ignore malformed dates safely');
}

{
  assert.equal(getBillingAmount({ amount: NaN }), 0);
  assert.equal(getBillingAmount({ amount: '49.99' }), 49.99);
  assert.equal(
    getSubscriptionBudgetShare([{ amount: 100, frequency: 'monthly', is_active: true }], NaN),
    0
  );

  // Negative daysAhead clamps to 0; invalid/negative remind_days_before does not trigger spurious alerts
  const alertsNow = new Date(2026, 3, 10);
  const badSub = {
    id: 's-neg',
    label: 'Broken Reminder',
    amount: 10,
    frequency: 'monthly',
    start_date: '2026-03-11',
    remind_days_before: -5,
    is_active: true,
  };
  assert.deepEqual(getUpcomingBillingAlerts([badSub], { today: alertsNow, daysAhead: -2 }), []);
  assert.deepEqual(getUpcomingBillingAlerts([badSub], { today: alertsNow, daysAhead: 3 }), []);

  // Zero remind_days_before triggers on billing day itself (daysUntil === 0)
  const dueTodaySub = {
    id: 's-zero',
    label: 'Due Today',
    amount: 15,
    frequency: 'monthly',
    start_date: '2026-03-10',
    remind_days_before: 0,
    is_active: true,
  };
  assert.equal(getUpcomingBillingAlerts([dueTodaySub], { today: alertsNow, daysAhead: 3 }).length, 1);

  // Deterministic anchor date & subscription_id/timestamp deduplication
  const anchor = new Date(2026, 3, 20);
  const endedSub = {
    id: 'sub-ended',
    label: 'Ended Plan',
    amount: 30,
    frequency: 'monthly',
    start_date: '2026-04-05',
    ended_on: '2026-04-12',
    is_active: true,
    created_at: '2026-04-01T00:00:00Z',
  };
  const merged = mergeSubscriptionOccurrences(
    [{ id: 'm1', date: '2026-04-05T10:00:00Z', amount: 30, subscription_id: 'sub-ended' }],
    [endedSub],
    anchor
  );
  assert.equal(merged.length, 1, 'timestamped manual payment deduplicates matching subscription occurrence');
  const rec = getMonthRecurringBreakdown(
    [{ id: 'm1', date: '2026-04-05T10:00:00Z', amount: 30, subscription_id: 'sub-ended' }],
    [endedSub],
    anchor
  );
  assert.deepEqual(rec, { recurringSpent: 30, upcomingRecurring: 0 });
  console.log('✓ subscriptions handle NaN amounts, negative remind_days_before, timestamps, and ended_on deterministically');
}

console.log('\nAll audit regression tests passed!');
