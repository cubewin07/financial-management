import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  formatCurrency,
  getTotalAccountBalance,
  getGoalProgress,
  getYearlySavingsProgress,
  getCategoryBudgetImpact,
  getDailyBurnRate,
  getCategoryHealthAlerts,
  isPersistedGoal,
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

  // 6. Upcoming alerts (supports string, numeric sequence, and BigInt database IDs)
  const subs = [
    { id: '1', start_date: '2024-03-01', frequency: 'monthly', active: true, remind_days_before: null }, // Null reminder - skip
    { id: '2', start_date: '2024-03-01', frequency: 'monthly', active: false, remind_days_before: 3 }, // Inactive - skip
    { id: 1042, start_date: '2024-03-04', frequency: 'monthly', active: true, remind_days_before: 3 }, // Numeric database sequence ID
    { id: '4', start_date: '2024-04-01', frequency: 'monthly', active: true, remind_days_before: 0 }, // nextBilling: Apr 1. Alert Date: Apr 1 (inside today -> today+3)
    { id: 9007199254740993n, start_date: '2024-04-01', frequency: 'monthly', active: true, remind_days_before: 0 }, // BigInt database sequence ID
    { id: '5', start_date: '2024-03-10', frequency: 'monthly', active: true, remind_days_before: 3 }, // nextBilling: Apr 10. Alert Date: Apr 7 (outside window)
  ];
  const alerts = getUpcomingBillingAlerts(subs, { today: '2024-03-29', daysAhead: 3 });
  assert.equal(alerts.length, 3);
  assert.equal(alerts[0].id, '4');
  assert.equal(alerts[1].id, 9007199254740993n, 'Preserves BigInt database ID in alerts');
  assert.equal(alerts[2].id, 1042, 'Preserves numeric integer database ID in alerts');

  // 6b. Goal Persistence & Database ID Classification
  assert.equal(isPersistedGoal(1), true, 'Numeric sequence ID 1 is persisted');
  assert.equal(isPersistedGoal(1042), true, 'Numeric sequence ID 1042 is persisted');
  assert.equal(isPersistedGoal(9007199254740993n), true, 'BigInt database ID is persisted');
  assert.equal(isPersistedGoal('1042'), true, 'String numeric ID is persisted');
  assert.equal(isPersistedGoal('3fa85f64-5717-4562-b3fc-2c963f66afa6'), true, 'UUID is persisted');
  assert.equal(isPersistedGoal('starter-1'), false, 'starter-1 is rejected');
  assert.equal(isPersistedGoal('mock-999'), false, 'mock-999 is rejected');
  assert.equal(isPersistedGoal(null), false, 'null is rejected');
  assert.equal(isPersistedGoal(undefined), false, 'undefined is rejected');

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
  assert.equal(splitRes.weekdayDays, 11, 'Calculates actual elapsed weekdays between Mar 1 and Mar 15');
  assert.equal(splitRes.weekendDays, 4, 'Calculates actual elapsed weekend days between Mar 1 and Mar 15');

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

  // Test subscription sorting logic
  const { projectSubscriptionCost } = await import('../utils/subscriptions.js');
  const subsToSort = [
    { id: '1', label: 'Spotify', amount: 12, frequency: 'monthly' },
    { id: '2', label: 'Bus Pass', amount: 15, frequency: 'weekly' }, // 15 * 4.33 = 64.95
    { id: '3', label: 'Apple Music', amount: 10, frequency: 'monthly' },
  ];

  // Name sort using a.label
  const nameSorted = [...subsToSort].sort((a, b) =>
    (a.label || a.service_name || a.name || '').localeCompare(b.label || b.service_name || b.name || '')
  );
  assert.equal(nameSorted[0].label, 'Apple Music');
  assert.equal(nameSorted[1].label, 'Bus Pass');
  assert.equal(nameSorted[2].label, 'Spotify');

  // Cost sort using projectSubscriptionCost (Bus Pass weekly $64.95 > Spotify monthly $12 > Apple $10)
  const costSorted = [...subsToSort].sort((a, b) => projectSubscriptionCost(b) - projectSubscriptionCost(a));
  assert.equal(costSorted[0].label, 'Bus Pass');
  assert.equal(costSorted[1].label, 'Spotify');
  assert.equal(costSorted[2].label, 'Apple Music');

  // Test single-state carry-over allocation math
  let currentCarryOver = 350.00;
  const allocateFirst = 150.00;
  currentCarryOver = Math.max(0, Math.round((currentCarryOver - allocateFirst) * 100) / 100);
  assert.equal(currentCarryOver, 200.00);

  const allocateSecond = 200.00;
  currentCarryOver = Math.max(0, Math.round((currentCarryOver - allocateSecond) * 100) / 100);
  assert.equal(currentCarryOver, 0.00);

  // Over-allocation clamps safely to 0
  currentCarryOver = Math.max(0, Math.round((currentCarryOver - 50.00) * 100) / 100);
  assert.equal(currentCarryOver, 0.00);

  // Subscription occurrences stop today and de-duplicate against saved expenses by note + date (ALG-01, ALG-02)
  const { mergeSubscriptionOccurrences } = await import('../utils/subscriptions.js');
  const mergeSub = { id: 's1', label: 'Netflix', amount: 20, frequency: 'monthly', start_date: '2026-01-10', active: true };
  const mergeSaved = [{ id: 1, note: 'netflix ', amount: 20, date: '2026-02-10' }];
  const merged = mergeSubscriptionOccurrences(mergeSaved, [mergeSub], new Date(2026, 2, 9));
  assert.deepEqual(merged.map((e) => e.date).sort(), ['2026-01-10', '2026-02-10'], 'Saved match replaces its occurrence; next billing is after the cutoff');

  // A reminder stays active until the bill is due
  const dueTomorrow = [{ id: 'soon', start_date: '2024-04-16', frequency: 'monthly', active: true, remind_days_before: 3 }];
  assert.equal(getUpcomingBillingAlerts(dueTomorrow, { today: '2024-04-15', daysAhead: 3 }).length, 1);
  const remindersOff = [{ id: 'off', start_date: '2024-04-16', frequency: 'monthly', active: true, remind_days_before: null }];
  assert.equal(getUpcomingBillingAlerts(remindersOff, { today: '2024-04-15', daysAhead: 30 }).length, 0);

  // Month-over-month never compares a part month with a full snapshot
  const { getMonthOverMonthDelta } = await import('../utils/finance.js');
  const thisMonth = format(new Date(), 'yyyy-MM');
  assert.equal(
    getMonthOverMonthDelta([{ month: '2000-01', total_spent: 500 }], thisMonth, [{ date: `${thisMonth}-01`, amount: 50 }]),
    null,
  );

  // Day counts use the selected range when one is given
  const rangeSplit = getWeekdayVsWeekendSplit([{ date: '2024-03-02', amount: 10 }], { start: '2024-03-01', end: '2024-03-31' });
  assert.equal(rangeSplit.weekdayDays, 21);
  assert.equal(rangeSplit.weekendDays, 10);

  // Local date strings keep the calendar day (ALG-05)
  const { getLocalDateString } = await import('../utils/finance.js');
  assert.equal(getLocalDateString(new Date(2026, 0, 1, 23, 30)), '2026-01-01');
  assert.equal(getLocalDateString('2026-03-05'), '2026-03-05');

  // Currency helpers (UX-05)
  const { getCurrencySymbol, formatCompactCurrency } = await import('../utils/finance.js');
  assert.equal(getCurrencySymbol('NZD'), '$');
  assert.equal(getCurrencySymbol('EUR'), '€');
  assert.equal(getCurrencySymbol('NOT_A_CODE'), '$', 'Invalid codes fall back safely');
  assert.equal(formatCompactCurrency(950, 'NZD'), '$950');
  assert.equal(formatCompactCurrency(1234, 'NZD'), '$1.2K');

  // 15) Issue #25: useSavingsGoals deleteGoal error propagation, addGoal currency, addDeposit RPC new_total
  await runSavingsGoalsHookTests();

  console.log('All finance-features tests passed!');
}

async function runSavingsGoalsHookTests() {
  const loaderSource = `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === 'react') {
        return { url: 'mock:react', shortCircuit: true };
      }
      if (specifier.endsWith('supabaseClient')) {
        return { url: 'mock:supabaseClient', shortCircuit: true };
      }
      try {
        return await nextResolve(specifier, context);
      } catch (err) {
        if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.endsWith('.js')) {
          return nextResolve(specifier + '.js', context);
        }
        throw err;
      }
    }
    export async function load(url, context, nextLoad) {
      if (url === 'mock:react') {
        return {
          format: 'module',
          source: \`
            export function useState(init) { return globalThis.__TEST_REACT_HOOKS__.useState(init); }
            export function useEffect(fn, deps) { return globalThis.__TEST_REACT_HOOKS__.useEffect(fn, deps); }
            export function useRef(init) { return globalThis.__TEST_REACT_HOOKS__.useRef(init); }
          \`,
          shortCircuit: true,
        };
      }
      if (url === 'mock:supabaseClient') {
        return {
          format: 'module',
          source: 'export const supabase = new Proxy({}, { get(_t, prop) { return globalThis.__TEST_SUPABASE_MOCK__?.[prop]; } });',
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    }
  `;
  register(`data:text/javascript,${encodeURIComponent(loaderSource)}`);

  async function mountHook(hookFn, props) {
    const slots = [];
    const effects = [];
    let cursor = 0;
    let pendingEffects = [];
    let isRendering = false;
    let needsRender = false;
    let currentProps = props;
    let result;

    const depsChanged = (prevDeps, nextDeps) => {
      if (!prevDeps || !nextDeps) return true;
      if (prevDeps.length !== nextDeps.length) return true;
      return nextDeps.some((dep, i) => !Object.is(dep, prevDeps[i]));
    };

    const runCycle = () => {
      if (isRendering) {
        needsRender = true;
        return;
      }
      isRendering = true;
      try {
        do {
          needsRender = false;
          cursor = 0;
          pendingEffects = [];
          result = hookFn(currentProps);
          const toRun = pendingEffects;
          pendingEffects = [];
          for (const item of toRun) {
            if (typeof item.prevCleanup === 'function') {
              item.prevCleanup();
            }
            const cleanup = item.fn();
            effects[item.slotIdx] = { deps: item.deps, cleanup };
          }
        } while (needsRender);
      } finally {
        isRendering = false;
      }
    };

    globalThis.__TEST_REACT_HOOKS__ = {
      useState(initial) {
        const slotIdx = cursor++;
        if (!(slotIdx in slots)) {
          slots[slotIdx] = typeof initial === 'function' ? initial() : initial;
        }
        const setState = (updater) => {
          const nextValue = typeof updater === 'function' ? updater(slots[slotIdx]) : updater;
          if (!Object.is(nextValue, slots[slotIdx])) {
            slots[slotIdx] = nextValue;
            runCycle();
          }
        };
        return [slots[slotIdx], setState];
      },
      useRef(initial) {
        const slotIdx = cursor++;
        if (!(slotIdx in slots)) {
          slots[slotIdx] = { current: initial };
        }
        return slots[slotIdx];
      },
      useEffect(fn, deps) {
        const slotIdx = cursor++;
        const prev = effects[slotIdx];
        if (!prev || depsChanged(prev.deps, deps)) {
          pendingEffects.push({ slotIdx, fn, deps, prevCleanup: prev?.cleanup });
        }
      },
    };

    runCycle();
    await new Promise((resolve) => setTimeout(resolve, 0));

    return {
      get result() {
        return result;
      },
      unmount() {
        for (const eff of effects) {
          if (typeof eff?.cleanup === 'function') eff.cleanup();
        }
      },
    };
  }

  function createSavingsMockSupabase(initialGoals = []) {
    const goals = initialGoals.map((g) => ({ ...g }));
    let deleteError = null;
    let insertError = null;
    let rpcHandler = null;
    const insertedPayloads = [];
    const rpcCalls = [];

    const client = {
      _insertedPayloads: insertedPayloads,
      _rpcCalls: rpcCalls,
      setDeleteError(err) {
        deleteError = err;
      },
      setInsertError(err) {
        insertError = err;
      },
      setRpcHandler(fn) {
        rpcHandler = fn;
      },
      from(table) {
        assert.equal(table, 'savings_goals');
        return {
          select() {
            return {
              eq() {
                return {
                  async order() {
                    return { data: goals.map((g) => ({ ...g })), error: null };
                  },
                };
              },
            };
          },
          insert(rows) {
            insertedPayloads.push(...rows);
            return {
              select() {
                return {
                  async single() {
                    if (insertError) {
                      return { data: null, error: insertError };
                    }
                    const row = rows[0];
                    const created = {
                      id: 900 + goals.length + 1,
                      ...row,
                    };
                    goals.unshift(created);
                    return { data: { ...created }, error: null };
                  },
                };
              },
            };
          },
          delete() {
            const filters = [];
            const builder = {
              eq(col, val) {
                filters.push([col, val]);
                return builder;
              },
              then(onFulfilled, onRejected) {
                const run = async () => {
                  if (deleteError) {
                    return { error: deleteError };
                  }
                  const idx = goals.findIndex((g) =>
                    filters.every(([col, val]) => String(g[col]) === String(val))
                  );
                  if (idx >= 0) goals.splice(idx, 1);
                  return { error: null };
                };
                return run().then(onFulfilled, onRejected);
              },
            };
            return builder;
          },
          update(patch) {
            const filters = [];
            const builder = {
              eq(col, val) {
                filters.push([col, val]);
                return builder;
              },
              then(onFulfilled, onRejected) {
                const run = async () => {
                  const target = goals.find((g) =>
                    filters.every(([col, val]) => String(g[col]) === String(val))
                  );
                  if (target) Object.assign(target, patch);
                  return { error: null };
                };
                return run().then(onFulfilled, onRejected);
              },
            };
            return builder;
          },
        };
      },
      async rpc(fnName, args) {
        rpcCalls.push({ fnName, args });
        if (rpcHandler) {
          return rpcHandler(fnName, args);
        }
        const target = goals.find((g) => String(g.id) === String(args.goal_id));
        if (!target) {
          return { data: null, error: { message: 'Savings goal not found', code: 'P0002' } };
        }
        target.current_amount = Number(target.current_amount || 0) + Number(args.deposit_amount || 0);
        return { data: target.current_amount, error: null };
      },
    };

    return client;
  }

  const { default: useSavingsGoals } = await import('../hooks/useSavingsGoals.js');

  // 15.1 deleteGoal restores previousGoals and returns false on error, true on success
  {
    const mockDb = createSavingsMockSupabase([
      { id: 101, user_id: 'user-1', name: 'Emergency Fund', target_amount: 5000, current_amount: 200, currency: 'NZD', priority: 'high' },
    ]);
    globalThis.__TEST_SUPABASE_MOCK__ = mockDb;
    const mounted = await mountHook(useSavingsGoals, { userId: 'user-1' });
    assert.equal(mounted.result.goals.length, 1);

    mockDb.setDeleteError({ message: 'Permission denied' });
    const failedOk = await mounted.result.deleteGoal(101);
    assert.equal(failedOk, false, 'deleteGoal returns false when Supabase delete fails');
    assert.equal(mounted.result.goals.length, 1, 'deleteGoal restores previousGoals on error');
    assert.equal(mounted.result.goals[0].id, 101);
    assert.equal(mounted.result.error, 'Permission denied');

    mockDb.setDeleteError(null);
    // Cross-user delete must not delete user-1's goal
    const otherUserMounted = await mountHook(useSavingsGoals, { userId: 'user-other' });
    await otherUserMounted.result.deleteGoal(101);
    otherUserMounted.unmount();

    const successOk = await mounted.result.deleteGoal(101);
    assert.equal(successOk, true, 'deleteGoal returns true when delete succeeds');
    assert.equal(mounted.result.goals.length, 0);
    assert.equal(mounted.result.error, null);
    mounted.unmount();
  }

  // 15.2 addGoal normalizes & persists currency in Supabase insert and mock creation
  {
    const mockDb = createSavingsMockSupabase([]);
    globalThis.__TEST_SUPABASE_MOCK__ = mockDb;
    const mounted = await mountHook(useSavingsGoals, { userId: 'user-1' });

    const createdJpy = await mounted.result.addGoal({
      name: 'Japan Trip',
      target_amount: 4000,
      current_amount: 500,
      currency: ' jpy ',
    });
    assert.equal(mockDb._insertedPayloads[0].currency, 'JPY', 'Supabase insert persists normalized uppercase currency');
    assert.equal(createdJpy.currency, 'JPY');
    assert.equal(mounted.result.goals[0].currency, 'JPY');

    const createdDefault = await mounted.result.addGoal({
      name: 'Rainy Day',
      target_amount: 1000,
      currency: '   ',
    });
    assert.equal(mockDb._insertedPayloads[1].currency, 'NZD', 'Blank currency defaults to NZD');
    assert.equal(createdDefault.currency, 'NZD');
    mounted.unmount();

    const guestMounted = await mountHook(useSavingsGoals, { userId: null });
    const mockCreated = await guestMounted.result.addGoal({
      name: 'Laptop',
      target_amount: 2000,
      currency: 'eur',
    });
    assert.equal(mockCreated.currency, 'EUR', 'Mock goal creation normalizes and preserves currency');
    guestMounted.unmount();
  }

  // 15.3 addDeposit keeps optimistic update, reconciles to RPC new_total, and rolls back on error
  {
    const mockDb = createSavingsMockSupabase([
      { id: 201, user_id: 'user-1', name: 'House Deposit', target_amount: 10000, current_amount: 200, currency: 'NZD', priority: 'high' },
    ]);
    globalThis.__TEST_SUPABASE_MOCK__ = mockDb;
    const mounted = await mountHook(useSavingsGoals, { userId: 'user-1' });

    let resolveRpc;
    mockDb.setRpcHandler(
      () =>
        new Promise((resolve) => {
          resolveRpc = resolve;
        }),
    );

    const depositPromise = mounted.result.addDeposit(201, 50);
    assert.equal(
      mounted.result.goals.find((g) => g.id === 201).current_amount,
      250,
      'Optimistic update immediately increments current_amount',
    );
    await Promise.resolve();

    // Authoritative DB total reflects a prior concurrent deposit from another device (200 + 150 + 50 = 400)
    resolveRpc({ data: 400, error: null });
    await depositPromise;
    assert.equal(
      mounted.result.goals.find((g) => g.id === 201).current_amount,
      400,
      'addDeposit reconciles current_amount to authoritative RPC new_total',
    );

    // Numeric string new_total and queued concurrent deposit + partial failure rollback
    const resolvers = [];
    mockDb.setRpcHandler(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const p1 = mounted.result.addDeposit(201, 30);
    const p2 = mounted.result.addDeposit(201, 20);
    assert.equal(mounted.result.goals.find((g) => g.id === 201).current_amount, 450);

    await Promise.resolve();
    resolvers[0]({ data: '430.50', error: null });
    await p1;
    assert.equal(
      mounted.result.goals.find((g) => g.id === 201).current_amount,
      450.5,
      'First queued deposit reconciles authoritative string new_total while preserving second pending optimistic delta',
    );

    await Promise.resolve();
    resolvers[1]({ data: null, error: { message: 'Temporary failure', code: '50000' } });
    await assert.rejects(() => p2, { message: 'Temporary failure' });
    assert.equal(
      mounted.result.goals.find((g) => g.id === 201).current_amount,
      430.5,
      'Failed second deposit rolls back only its own delta, keeping first authoritative new_total',
    );

    // Error rollback preserves authoritative balance
    mockDb.setRpcHandler(async () => ({ data: null, error: { message: 'Savings goal not found', code: 'P0002' } }));
    await assert.rejects(
      () => mounted.result.addDeposit(201, 25),
      { message: 'Savings goal not found' },
    );
    assert.equal(
      mounted.result.goals.find((g) => g.id === 201).current_amount,
      430.5,
      'addDeposit rolls back optimistic increment when RPC fails',
    );
    assert.equal(mounted.result.error, 'Savings goal not found');
    mounted.unmount();
  }

  // 15.4 SavingsGoalsPage passes resolvedCurrency when adding goals and handles delete failures
  {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pageSource = fs.readFileSync(path.resolve(__dirname, '../pages/SavingsGoalsPage.jsx'), 'utf8');
    assert.match(pageSource, /const goalData = \{[\s\S]*?currency:\s*resolvedCurrency,/);
    assert.match(pageSource, /const result = await onDeleteGoal\(goal\.id\);\s*if \(result === false \|\| result\?\.error\)\s*\{\s*setQuickDepositError\(/);
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

