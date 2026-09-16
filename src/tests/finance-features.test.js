import assert from 'node:assert/strict';
import {
  formatCurrency,
  getTotalAccountBalance,
  getGoalProgress,
  getYearlySavingsProgress,
  getCategoryBudgetImpact,
  getDailyBurnRate,
  getCategoryHealthAlerts,
} from '../utils/finance.js';
import {
  getNextBillingDate,
  getUpcomingBillingAlerts,
  getServicePresentation,
  formatNextBilling
} from '../utils/subscriptions.js';
import { format } from 'date-fns';

async function runTests() {
  console.log('--- Running finance-features tests ---');

  // 1. Currency-Aware Formatting
  const usdFormat = formatCurrency(1234.56, 'USD', 'en-US');
  assert.ok(usdFormat.includes('1,234.56') && usdFormat.includes('$'), 'USD formatting');

  // 2. Manual account balance
  const accounts = [
    { balance: 100, currency: 'USD' },
    { balance: 200, currency: 'USD' },
    { balance: 50, currency: 'EUR' }
  ];
  const resBalance = getTotalAccountBalance(accounts, 'USD');
  assert.equal(resBalance.totalBalance, 300);
  assert.equal(resBalance.excludedCount, 1);

  // 3. Goal progress
  const g1 = getGoalProgress({ current_amount: 5000, target_amount: 10000 });
  assert.equal(g1.rawValue, 50);
  assert.equal(g1.clampedRenderPercent, 50);

  const g2 = getGoalProgress({ current_amount: 6000, target_amount: 5000 });
  assert.equal(g2.rawValue, 120);
  assert.equal(g2.clampedRenderPercent, 100);

  // Yearly savings progress
  const ys = getYearlySavingsProgress({ goalAmount: 10000, carriedOver: 5000, totalSpent: 0, monthIndex: 6 });
  assert.equal(ys.rawValue, 50);
  assert.equal(ys.clampedRenderPercent, 50);
  assert.equal(ys.isTracked, true);

  // 4. Category budget impact
  const impact1 = getCategoryBudgetImpact({ spent: 400, monthlyLimit: 500 });
  assert.equal(impact1.utilization, 80);
  assert.equal(impact1.remaining, 100);

  // 5. Safe next billing date (Object signature)
  const anchor = '2024-01-31';
  const now = '2024-02-15';
  const next1 = getNextBillingDate({ startDate: anchor, frequency: 'monthly', fromDate: now });
  assert.equal(format(next1, 'yyyy-MM-dd'), '2024-02-29', 'Leap year clamping to Feb 29');

  // 6. Upcoming alerts
  const subs = [
    { id: '1', start_date: '2024-03-01', frequency: 'monthly', active: true, remind_days_before: null }, // Null reminder - skip
    { id: '2', start_date: '2024-03-01', frequency: 'monthly', active: false, remind_days_before: 3 }, // Inactive - skip
    { id: '3', start_date: '2024-03-04', frequency: 'monthly', active: true, remind_days_before: 3 }, // nextBilling: Apr 4. Alert Date: Apr 1 (inside today -> today+3)
    { id: '4', start_date: '2024-04-01', frequency: 'monthly', active: true, remind_days_before: 0 }, // nextBilling: Apr 1. Alert Date: Apr 1 (inside today -> today+3)
    { id: '5', start_date: '2024-03-10', frequency: 'monthly', active: true, remind_days_before: 3 }, // nextBilling: Apr 10. Alert Date: Apr 7 (outside window)
  ];
  const alerts = getUpcomingBillingAlerts(subs, { today: '2024-03-29', daysAhead: 3 });
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].id, '4');
  assert.equal(alerts[1].id, '3');

  // 7. Service catalog
  const s1 = getServicePresentation({ brand_key: 'netflix', label: 'Netflix' });
  assert.equal(s1.name, 'Netflix');
  assert.equal(s1.icon, 'netflix');

  const s2 = getServicePresentation({ label: 'My Gym' });
  assert.equal(s2.name, 'My Gym');
  assert.equal(s2.initials, 'MY');
  assert.equal(s2.icon, null);

  // 1) Same-day billing returns today
  const sameDay = getNextBillingDate({ startDate: '2024-07-01T00:00:00', frequency: 'monthly', fromDate: '2024-07-01T00:00:00' });
  assert.equal(format(sameDay, 'yyyy-MM-dd'), '2024-07-01', 'Same-day billing should return today');

  // 2) West-of-UTC-style date-only handling (e.g. YYYY-MM-DD parsing)
  // Safely parsing local time without appending T00:00:00 avoids the issue where
  // '2024-08-01' (treated as midnight UTC natively) becomes '2024-07-31' in timezones west of UTC.
  const localDate = getNextBillingDate({ startDate: '2024-08-01', frequency: 'monthly', fromDate: '2024-08-01' });
  assert.equal(format(localDate, 'yyyy-MM-dd'), '2024-08-01', 'Local date parsing remains stable');

  // 3) DST crossing (using differenceInCalendarDays)
  const { differenceInCalendarDays } = await import('date-fns');
  const dstStart = new Date('2024-03-09T00:00:00');
  const dstEnd = new Date('2024-03-11T00:00:00');
  assert.equal(
    differenceInCalendarDays(dstEnd, dstStart),
    2,
    'differenceInCalendarDays counts days correctly across 23-hour DST days'
  );

  // 4) Inactive/null/0/3-day reminders
  const reminderSubs = [
    { id: 'inactive', start_date: '2024-04-15T00:00:00', frequency: 'monthly', active: false, remind_days_before: 3 },
    { id: 'null-remind', start_date: '2024-04-15T00:00:00', frequency: 'monthly', active: true, remind_days_before: null },
    { id: '0-day', start_date: '2024-04-15T00:00:00', frequency: 'monthly', active: true, remind_days_before: 0 },
    { id: '3-day', start_date: '2024-04-18T00:00:00', frequency: 'monthly', active: true, remind_days_before: 3 }
  ];
  // Alert window for 3 days ahead from April 15: April 15 -> April 18
  const upcoming = getUpcomingBillingAlerts(reminderSubs, { today: '2024-04-15T00:00:00', daysAhead: 3 });

  assert.equal(upcoming.length, 2, 'Should only pick up active and valid reminders');
  assert.equal(upcoming[0].id, '0-day', '0-day reminder for Apr 15 triggers on Apr 15');
  assert.equal(upcoming[1].id, '3-day', '3-day reminder for Apr 18 triggers on Apr 15');

  // 5) Malformed and null date regression handling
  const invalidDate = getNextBillingDate({ startDate: 'not-a-date', frequency: 'monthly', fromDate: '2024-01-01' });
  assert.equal(invalidDate, null, 'Invalid start date should return null');

  const nullDate = getNextBillingDate({ startDate: null, frequency: 'monthly', fromDate: '2024-01-01' });
  assert.equal(nullDate, null, 'Null start date should return null');

  const invalidFormat = formatNextBilling(invalidDate);
  assert.equal(invalidFormat, '—', 'Formatting invalid date should return em dash');

  const malformedSubs = [
    { id: 'bad-date', start_date: 'invalid', frequency: 'monthly', active: true, remind_days_before: 3 },
    { id: 'null-date', start_date: null, frequency: 'monthly', active: true, remind_days_before: 3 },
    { id: 'good-date', start_date: '2024-01-05', frequency: 'monthly', active: true, remind_days_before: 3 }
  ];

  const malformedAlerts = getUpcomingBillingAlerts(malformedSubs, { today: '2024-01-02', daysAhead: 3 });
  assert.equal(malformedAlerts.length, 1, 'Should exclude malformed and null dates from alerts');
  assert.equal(malformedAlerts[0].id, 'good-date', 'Only valid dates should produce alerts');

  // 8) Daily Burn Rate calculation
  const sampleExpenses = [
    { amount: 50, date: '2024-03-01', category: 'Food' },
    { amount: 150, date: '2024-03-05', category: 'Groceries' },
  ];
  const burn = getDailyBurnRate(sampleExpenses);
  assert.equal(burn.totalSpent, 200);
  assert.equal(burn.daysCovered, 5); // March 1 to March 5 inclusive = 5 days
  assert.equal(burn.dailyAvg, 40); // 200 / 5 = 40

  // 9) Category Health Alerts calculation
  const limits = { Food: 40, Groceries: 200 };
  const health = getCategoryHealthAlerts(sampleExpenses, limits);
  assert.equal(health.alertCount, 1, 'Food at 50/40 (125%) is over budget alert');
  assert.equal(health.items[0].name, 'Food');
  assert.equal(health.items[0].isOverBudget, true);

  // 10) Fixed vs Discretionary split
  const { getFixedVsDiscretionarySplit, getDayOfWeekPattern, getDailyTrend } = await import('../utils/finance.js');
  const split = getFixedVsDiscretionarySplit([
    { amount: 100, category: 'Bills' },
    { amount: 50, category: 'Food' }
  ]);
  assert.equal(split.fixedTotal, 100);
  assert.equal(split.discretionaryTotal, 50);
  assert.equal(split.fixedPercent, 67);

  // 11) Day-of-week pattern
  const dow = getDayOfWeekPattern(sampleExpenses);
  assert.equal(dow.length, 7, 'Returns 7 days');

  // 12) Zero-filled daily trend
  const trendResult = getDailyTrend(sampleExpenses, 'custom', { start: '2024-03-01', end: '2024-03-05' });
  assert.equal(trendResult.actualTrend.length, 5, 'Daily trend zero-fills all 5 days from Mar 1 to Mar 5');

  // 13) Subscription Expense Occurrences Generator (Respects start_date & frequency)
  const { generateSubscriptionExpenseOccurrences } = await import('../utils/subscriptions.js');
  const sampleSubs = [
    { id: 'sub-1', label: 'Cellular data', amount: 20, frequency: 'monthly', start_date: '2024-01-15', active: true },
    { id: 'sub-2', label: 'Gym', amount: 15, frequency: 'weekly', start_date: '2024-03-01', active: true },
    { id: 'sub-3', label: 'Old Gym', amount: 50, frequency: 'monthly', start_date: '2024-01-01', active: false },
  ];
  const cutoff = '2024-03-15';
  const subOccurrences = generateSubscriptionExpenseOccurrences(sampleSubs, cutoff);
  
  // Cellular data (Jan 15, Feb 15, Mar 15) = 3 occurrences
  const cellularData = subOccurrences.filter(o => o.subscription_id === 'sub-1');
  assert.equal(cellularData.length, 3, 'Monthly subscription starting Jan 15 has 3 occurrences by Mar 15');
  assert.equal(cellularData[0].date, '2024-01-15');

  // Gym weekly (Mar 1, Mar 8, Mar 15) = 3 occurrences
  const gymData = subOccurrences.filter(o => o.subscription_id === 'sub-2');
  assert.equal(gymData.length, 3, 'Weekly subscription starting Mar 1 has 3 occurrences by Mar 15');

  // Inactive sub (sub-3) = 0 occurrences
  const inactiveData = subOccurrences.filter(o => o.subscription_id === 'sub-3');
  assert.equal(inactiveData.length, 0, 'Inactive subscriptions generate 0 occurrences');

  // Subscription with initial_start_date and skipped_dates (preserves past history, omits skipped cycle)
  const subWithSkips = [
    {
      id: 'sub-skip',
      label: 'Cloud Storage',
      amount: 10,
      frequency: 'monthly',
      start_date: '2024-03-01',
      initial_start_date: '2024-01-01',
      skipped_dates: ['2024-02-01'],
      active: true,
    },
  ];
  const skipOccurrences = generateSubscriptionExpenseOccurrences(subWithSkips, '2024-03-15');
  assert.equal(skipOccurrences.length, 2, 'Generates occurrences for Jan 1 and Mar 1, omitting skipped Feb 1');
  assert.equal(skipOccurrences[0].date, '2024-01-01');
  assert.equal(skipOccurrences[1].date, '2024-03-01');

  // 14) New Breakdown Refinements Tests
  const {
    getExpenseStats,
    getWeekdayVsWeekendSplit,
    getWeekOverWeekBreakdown,
    getCategorySideBySideComparison,
  } = await import('../utils/finance.js');

  const testExps = [
    { amount: 10, category: 'Food', date: '2024-03-01', note: 'Coffee' }, // Fri
    { amount: 50, category: 'Food', date: '2024-03-02', note: 'Dinner' }, // Sat
    { amount: 100, category: 'Bills', date: '2024-03-10', note: 'Power' }, // Sun
    { amount: 40, category: 'Groceries', date: '2024-03-15', note: 'Market' }, // Fri
  ];

  // Test getExpenseStats
  const stats = getExpenseStats(testExps);
  assert.equal(stats.count, 4);
  assert.equal(stats.median, 45); // Amounts: 10, 40, 50, 100 -> (40+50)/2 = 45
  assert.equal(stats.average, 50); // (200 / 4) = 50
  assert.equal(stats.maxTransaction.amount, 100);
  assert.equal(stats.maxTransaction.category, 'Bills');

  // Test getWeekdayVsWeekendSplit
  const splitRes = getWeekdayVsWeekendSplit(testExps);
  assert.equal(splitRes.weekdayTotal, 50); // 10 (Fri Mar 1) + 40 (Fri Mar 15)
  assert.equal(splitRes.weekendTotal, 150); // 50 (Sat Mar 2) + 100 (Sun Mar 10)
  assert.equal(splitRes.weekdayPercent, 25);
  assert.equal(splitRes.weekendPercent, 75);

  // Test getWeekOverWeekBreakdown
  const wow = getWeekOverWeekBreakdown(testExps);
  assert.equal(wow[0].total, 60); // Mar 1 ($10) + Mar 2 ($50) = 60
  assert.equal(wow[1].total, 100); // Mar 10 ($100) = 100
  assert.equal(wow[2].total, 40); // Mar 15 ($40) = 40

  // Test formatStorageMb
  const { formatStorageMb } = await import('../utils/finance.js');
  assert.equal(formatStorageMb(0), '0 MB');
  assert.equal(formatStorageMb(null), '0 MB');
  assert.equal(formatStorageMb(undefined), '0 MB');
  assert.equal(formatStorageMb(500), '< 0.01 MB');
  assert.equal(formatStorageMb(25000), '0.02 MB');
  assert.equal(formatStorageMb(250000), '0.24 MB');
  assert.equal(formatStorageMb(1048576), '1 MB');
  assert.equal(formatStorageMb(1572864), '1.5 MB');
  assert.equal(formatStorageMb(2411724), '2.3 MB');
  assert.equal(formatStorageMb(5242880), '5 MB');

  console.log('All finance-features tests passed!');
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

