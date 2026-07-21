import assert from 'node:assert/strict';
import {
  formatCurrency,
  getTotalAccountBalance,
  getGoalProgress,
  getYearlySavingsProgress,
  getCategoryBudgetImpact
} from '../utils/finance.js';
import {
  getNextBillingDate,
  getUpcomingBillingAlerts,
  getServicePresentation
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

  console.log('All finance-features tests passed!');
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
