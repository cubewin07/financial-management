import assert from 'node:assert/strict';
import { format, subDays } from 'date-fns';
import {
  getCategorySideBySideComparison,
  getDailyBurnRate,
  getFixedVsDiscretionarySplit,
  getGoalsTotals,
  getMonthPace,
} from '../utils/finance.js';
import { classifyPace } from '../utils/reviewInsights.js';
import {
  computeSkipPayload,
  generateSubscriptionExpenseOccurrences,
  getMonthRecurringBreakdown,
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

console.log('\nAll audit regression tests passed!');
