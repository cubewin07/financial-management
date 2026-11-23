import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import { format, subDays } from 'date-fns';
import {
  computePeriodBudget,
  computeReadyReceiptsTotal,
  formatCompactCurrency,
  formatCurrency,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  getBudgetRemainingPercent,
  getCategoryHealthAlerts,
  getCategorySideBySideComparison,
  getCurrentMonthExpenses,
  getDailyBurnRate,
  getDailyTrend,
  getDateRangeMeta,
  getDayOfWeekPattern,
  getFinanceSummary,
  getFixedVsDiscretionarySplit,
  getGoalsTotals,
  getMonthOverMonthDelta,
  getMonthPace,
  getProjectedDailyTrend,
  getWeekdayVsWeekendSplit,
  getWeekOverWeekBreakdown,
  normalizeCustomRange,
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
    getSubscriptionBudgetShare([{ amount: 100, frequency: 'monthly', active: true }], NaN),
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
    active: true,
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
    active: true,
  };
  assert.equal(getUpcomingBillingAlerts([dueTodaySub], { today: alertsNow, daysAhead: 3 }).length, 1);

  // Deterministic anchor date & subscription_id/timestamp deduplication
  const anchor = new Date(2026, 3, 20);
  const endedSub = {
    id: 'sub-ended',
    label: 'Ended Plan',
    amount: 30,
    frequency: 'weekly',
    start_date: '2026-04-05',
    ended_on: '2026-04-10',
    active: false,
    created_at: '2026-04-01T00:00:00Z',
  };
  const merged = mergeSubscriptionOccurrences(
    [{ id: 'm1', date: '2026-04-05T10:00:00Z', amount: 30, subscription_id: 'sub-ended' }],
    [endedSub],
    anchor
  );
  assert.equal(merged.length, 1, 'timestamped manual payment deduplicates and stops after ended_on');
  const rec = getMonthRecurringBreakdown(
    [{ id: 'm1', date: '2026-04-05T10:00:00Z', amount: 30, subscription_id: 'sub-ended' }],
    [endedSub],
    anchor
  );
  assert.deepEqual(rec, { recurringSpent: 30, upcomingRecurring: 0 });
  console.log('✓ subscriptions handle NaN amounts, negative remind_days_before, timestamps, and ended_on deterministically');
}

// ---------------------------------------------------------------------------
// Issue #26: BudgetSettingsPage legacy monthly_budget baseline & save order
// ---------------------------------------------------------------------------
async function loadBudgetSettingsPageModule() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const entryPath = path.resolve(__dirname, '../pages/BudgetSettingsPage.jsx');
  const financePath = path.resolve(__dirname, '../utils/finance.js');

  globalThis.__testReact = React;
  globalThis.__testJsxRuntime = jsxRuntime;

  const stubPlugin = {
    name: 'test-stubs',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'stub' }));
      build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: 'react/jsx-runtime', namespace: 'stub' }));
      build.onResolve({ filter: /^framer-motion$/ }, () => ({ path: 'framer-motion', namespace: 'stub' }));
      build.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide-react', namespace: 'stub' }));
      build.onResolve({ filter: /^\.\.\/components\/ui\/forms$/ }, () => ({ path: 'ui-forms', namespace: 'stub' }));
      build.onResolve({ filter: /^\.\.\/context\/ConfirmationContext$/ }, () => ({ path: 'confirm-ctx', namespace: 'stub' }));
      build.onResolve({ filter: /^\.\.\/utils\/finance$/ }, () => ({ path: financePath }));
      build.onResolve({ filter: /^date-fns$/ }, () => ({ path: 'date-fns', namespace: 'stub' }));

      build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
        if (args.path === 'react') {
          return {
            contents: `
              const R = globalThis.__testReact;
              export default R;
              export const { useState, useEffect, useMemo, useRef } = R;
            `,
            loader: 'js',
          };
        }
        if (args.path === 'react/jsx-runtime') {
          return {
            contents: `export const { jsx, jsxs, Fragment } = globalThis.__testJsxRuntime;`,
            loader: 'js',
          };
        }
        if (args.path === 'framer-motion') {
          return {
            contents: `
              const R = globalThis.__testReact;
              export const AnimatePresence = ({ children }) => children ?? null;
              export const motion = new Proxy({}, {
                get: (_t, tag) => ({ children, ...props }) => R.createElement(String(tag), props, children),
              });
            `,
            loader: 'js',
          };
        }
        if (args.path === 'lucide-react') {
          return {
            contents: `
              const R = globalThis.__testReact;
              const Icon = () => R.createElement('span');
              export const Sliders = Icon, CheckCircle2 = Icon, PieChart = Icon, Search = Icon, Plus = Icon, Trash2 = Icon, X = Icon, Wallet = Icon, Save = Icon, AlertTriangle = Icon;
            `,
            loader: 'js',
          };
        }
        if (args.path === 'ui-forms') {
          return {
            contents: `
              const R = globalThis.__testReact;
              export const CustomNumberInput = ({ label, value }) => R.createElement('input', { 'aria-label': label, defaultValue: value });
              export const CustomSelect = ({ label, value }) => R.createElement('select', { 'aria-label': label, defaultValue: value });
            `,
            loader: 'js',
          };
        }
        if (args.path === 'confirm-ctx') {
          return {
            contents: `export const useConfirm = () => async () => true;`,
            loader: 'js',
          };
        }
        if (args.path === 'date-fns') {
          return {
            contents: `
              export const addDays = (d) => d;
              export const endOfMonth = (d) => d;
              export const format = () => '';
              export const isAfter = () => false;
              export const isBefore = () => false;
              export const isSameMonth = () => false;
              export const parseISO = (s) => new Date(s);
              export const startOfDay = (d) => d;
              export const startOfMonth = (d) => d;
              export const subDays = (d) => d;
              export const differenceInCalendarDays = () => 0;
              export const isValid = () => true;
            `,
            loader: 'js',
          };
        }
        return null;
      });
    },
  };

  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: 'esm',
    jsx: 'automatic',
    plugins: [stubPlugin],
  });

  const code = result.outputFiles[0].text;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`;
  return import(dataUrl);
}

{
  const mod = await loadBudgetSettingsPageModule();
  const {
    default: BudgetSettingsPage,
    getHydratedIncomeBaseline,
    computeChangedUserSettings,
    normalizeCategoryLimits,
    haveCategoryLimitsChanged,
    saveBudgetSettingsAndLimits,
  } = mod;

  assert.equal(typeof getHydratedIncomeBaseline, 'function');
  assert.equal(typeof computeChangedUserSettings, 'function');
  assert.equal(typeof normalizeCategoryLimits, 'function');
  assert.equal(typeof haveCategoryLimitsChanged, 'function');
  assert.equal(typeof saveBudgetSettingsAndLimits, 'function');

  // 1. Legacy monthly_budget > 0 with zero income breakdown hydrates cleanly with NO unsaved changes
  const legacySettings = {
    fixed_budget: 0,
    salary_allocation: 0,
    part_time_hours: 0,
    part_time_rate: 0,
    monthly_budget: 3000,
    default_currency: 'NZD',
  };

  const legacyBaseline = getHydratedIncomeBaseline(legacySettings, 'NZD');
  assert.deepEqual(legacyBaseline, {
    fixedBudget: 3000,
    salaryAllocation: 0,
    partTimeHours: 0,
    partTimeRate: 0,
    monthlyBudget: 3000,
    currency: 'NZD',
    isLegacyMonthlyFallback: true,
  });

  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: legacySettings,
      defaultCurrency: 'NZD',
      fixedBudget: legacyBaseline.fixedBudget,
      salaryAllocation: legacyBaseline.salaryAllocation,
      partTimeHours: legacyBaseline.partTimeHours,
      partTimeRate: legacyBaseline.partTimeRate,
      currencySetting: legacyBaseline.currency,
    }),
    {},
    'legacy monthly_budget > 0 must not report unsaved changes on load'
  );

  // Rendered page must NOT show the Unsaved changes badge for legacy monthly_budget > 0
  const renderedHtml = ReactDOMServer.renderToString(
    React.createElement(BudgetSettingsPage, {
      baseBudget: 3000,
      userSettings: legacySettings,
      categoryLimits: { Groceries: 400 },
      defaultCurrency: 'NZD',
    })
  );
  assert.doesNotMatch(renderedHtml, /Unsaved changes/i);
  assert.match(renderedHtml, /3,000\.00/);

  // 2. Dirty-state transitions for legacy user: editing another field must persist migrated fixed_budget
  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: legacySettings,
      defaultCurrency: 'NZD',
      fixedBudget: legacyBaseline.fixedBudget,
      salaryAllocation: 0,
      partTimeHours: 0,
      partTimeRate: 0,
      currencySetting: 'USD',
    }),
    {
      default_currency: 'USD',
      fixed_budget: 3000,
      monthly_budget: 3000,
    },
    'editing currency on legacy budget persists hydrated fixed_budget alongside default_currency'
  );

  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: legacySettings,
      defaultCurrency: 'NZD',
      fixedBudget: legacyBaseline.fixedBudget,
      salaryAllocation: 500,
      partTimeHours: 0,
      partTimeRate: 0,
      currencySetting: 'NZD',
    }),
    {
      salary_allocation: 500,
      fixed_budget: 3000,
      monthly_budget: 3500,
    },
    'editing salary on legacy budget preserves hydrated fixed_budget and updates monthly_budget'
  );

  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: legacySettings,
      defaultCurrency: 'NZD',
      fixedBudget: 3500,
      salaryAllocation: 0,
      partTimeHours: 0,
      partTimeRate: 0,
      currencySetting: 'NZD',
    }),
    {
      fixed_budget: 3500,
      monthly_budget: 3500,
    }
  );

  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: legacySettings,
      defaultCurrency: 'NZD',
      fixedBudget: 0,
      salaryAllocation: 0,
      partTimeHours: 0,
      partTimeRate: 0,
      currencySetting: 'NZD',
    }),
    {
      fixed_budget: 0,
      monthly_budget: 0,
    },
    'explicitly zeroing a legacy fixed budget is detected as a real change'
  );

  // 3. Non-legacy user baseline and edits
  const modernSettings = {
    fixed_budget: 2000,
    salary_allocation: 1000,
    part_time_hours: 10,
    part_time_rate: 25,
    monthly_budget: 3250,
    default_currency: 'NZD',
  };
  const modernBaseline = getHydratedIncomeBaseline(modernSettings, 'NZD');
  assert.equal(modernBaseline.isLegacyMonthlyFallback, false);
  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: modernSettings,
      defaultCurrency: 'NZD',
      fixedBudget: modernBaseline.fixedBudget,
      salaryAllocation: modernBaseline.salaryAllocation,
      partTimeHours: modernBaseline.partTimeHours,
      partTimeRate: modernBaseline.partTimeRate,
      currencySetting: modernBaseline.currency,
    }),
    {}
  );
  assert.deepEqual(
    computeChangedUserSettings({
      userSettings: modernSettings,
      defaultCurrency: 'NZD',
      fixedBudget: modernBaseline.fixedBudget,
      salaryAllocation: modernBaseline.salaryAllocation,
      partTimeHours: modernBaseline.partTimeHours,
      partTimeRate: modernBaseline.partTimeRate,
      currencySetting: 'AUD',
    }),
    {
      default_currency: 'AUD',
      monthly_budget: 3250,
    }
  );

  // 4. Category limits normalization & change detection
  assert.deepEqual(normalizeCategoryLimits({ Groceries: '400.505', Dining: '', Utilities: 0 }), {
    Groceries: 400.51,
  });
  assert.equal(haveCategoryLimitsChanged({ Groceries: '400', Dining: '' }, { Groceries: 400 }), false);
  assert.equal(haveCategoryLimitsChanged({ Groceries: '450' }, { Groceries: 400 }), true);

  // 5. Save ordering & partial-save prevention
  {
    const calls = [];
    await saveBudgetSettingsAndLimits({
      changedFields: { fixed_budget: 3500, monthly_budget: 3500 },
      hasCategoryChanges: false,
      cleanedLimits: { Groceries: 400 },
      onSaveUserSettings: async (payload) => {
        calls.push(['user', payload]);
        return { data: payload };
      },
      onSaveCategoryLimits: async (limits) => {
        calls.push(['limits', limits]);
        return true;
      },
    });
    assert.deepEqual(calls, [['user', { fixed_budget: 3500, monthly_budget: 3500 }]]);
  }

  {
    const calls = [];
    await saveBudgetSettingsAndLimits({
      changedFields: {},
      hasCategoryChanges: true,
      cleanedLimits: { Groceries: 450 },
      onSaveUserSettings: async (payload) => {
        calls.push(['user', payload]);
        return { data: payload };
      },
      onSaveCategoryLimits: async (limits) => {
        calls.push(['limits', limits]);
        return true;
      },
    });
    assert.deepEqual(calls, [['limits', { Groceries: 450 }]]);
  }

  {
    const calls = [];
    await saveBudgetSettingsAndLimits({
      changedFields: { fixed_budget: 3500, monthly_budget: 3500 },
      hasCategoryChanges: true,
      cleanedLimits: { Groceries: 450 },
      onSaveUserSettings: async (payload) => {
        calls.push(['user', payload]);
        return { data: payload };
      },
      onSaveCategoryLimits: async (limits) => {
        calls.push(['limits', limits]);
        return true;
      },
    });
    assert.deepEqual(calls, [
      ['user', { fixed_budget: 3500, monthly_budget: 3500 }],
      ['limits', { Groceries: 450 }],
    ]);
  }

  {
    const calls = [];
    await assert.rejects(
      () =>
        saveBudgetSettingsAndLimits({
          changedFields: { fixed_budget: 3500, monthly_budget: 3500 },
          hasCategoryChanges: true,
          cleanedLimits: { Groceries: 450 },
          onSaveUserSettings: async (payload) => {
            calls.push(['user', payload]);
            return { error: new Error('DB write failed') };
          },
          onSaveCategoryLimits: async (limits) => {
            calls.push(['limits', limits]);
            return true;
          },
        }),
      /DB write failed/
    );
    assert.equal(calls.length, 1, 'category limits must not run when user settings save fails');
  }

  {
    await assert.rejects(
      () =>
        saveBudgetSettingsAndLimits({
          changedFields: { fixed_budget: 3500, monthly_budget: 3500 },
          hasCategoryChanges: true,
          cleanedLimits: { Groceries: 450 },
          onSaveUserSettings: async (payload) => ({ data: payload }),
          onSaveCategoryLimits: async () => false,
        }),
      /Budget settings were saved, but category limits could not be saved/
    );
  }

  {
    const calls = [];
    await saveBudgetSettingsAndLimits({
      changedFields: {},
      hasCategoryChanges: false,
      cleanedLimits: { Groceries: 400 },
      onSaveUserSettings: async () => {
        calls.push('user');
        return { data: {} };
      },
      onSaveCategoryLimits: async () => {
        calls.push('limits');
        return true;
      },
    });
    assert.deepEqual(calls, []);
  }

  console.log('✓ BudgetSettingsPage legacy baseline, dirty transitions, and atomic save order pass');
}

// ---------------------------------------------------------------------------
// Step 2 audit regressions: finance helpers (#24, #29, MoM, recurring pace)
// ---------------------------------------------------------------------------
{
  // Reversed and invalid custom ranges normalize cleanly (#24)
  const normRev = normalizeCustomRange({ start: '2026-10-20', end: '2026-10-05' }, [], new Date(2026, 9, 25));
  assert.equal(format(normRev.start, 'yyyy-MM-dd'), '2026-10-05');
  assert.equal(format(normRev.end, 'yyyy-MM-dd'), '2026-10-20');
  assert.equal(normRev.diffDays, 16);
  assert.equal(normalizeCustomRange({ start: 'bad-date', end: 'worse-date' }, [], new Date(2026, 9, 25)), null);

  // getMonthPace subtracts upcomingRecurring from remaining variable safeDailyAllowance
  const paceWithRec = getMonthPace({
    monthlyBudget: 1000,
    monthSpent: 400,
    now: new Date(2026, 9, 11), // Oct has 31 days -> 21 remaining inclusive days (11..31)
    recurringSpent: 200,
    upcomingRecurring: 180,
  });
  // Available after upcoming recurring: (1000 - 400 - 180) = 420 / 21 remainingDays = 20/day
  assert.equal(paceWithRec.safeDailyAllowance, 20);

  // getMonthOverMonthDelta compares previous month vs current month cleanly for past month keys
  const momPast = getMonthOverMonthDelta(
    [],
    '2026-09',
    [
      { date: '2026-08-25', amount: 800 },
      { date: '2026-09-25', amount: 1000 },
    ],
    new Date(2026, 10, 15) // now is Nov, comparing Sept vs Aug
  );
  assert.equal(momPast.value, 200);
  assert.equal(momPast.percent, 25);
  assert.equal(momPast.isIncrease, true);
  assert.equal(momPast.comparedDays, undefined);

  // Case-insensitive category limits in getCategoryHealthAlerts (#29)
  const alerts = getCategoryHealthAlerts(
    [{ category: 'dining out', amount: 180, date: '2026-10-05' }],
    { 'Dining Out': 200, Utilities: 100 }
  );
  const diningAlert = alerts.items.find((a) => a.name.toLowerCase() === 'dining out');
  assert.equal(Boolean(diningAlert), true);
  assert.equal(diningAlert.limit, 200);
  assert.equal(diningAlert.utilization, 90);

  // Weekday-only single-day range cleanly reports 0 weekendDays and 1 weekdayDay
  const monOnly = getWeekdayVsWeekendSplit(
    [{ date: '2026-10-05', amount: 50 }],
    { start: '2026-10-05', end: '2026-10-05' }
  );
  assert.equal(monOnly.weekdayDays, 1);
  assert.equal(monOnly.weekendDays, 0);

  // formatCurrency / formatCompactCurrency handle non-finite inputs gracefully
  assert.equal(formatCurrency(NaN, 'NZD'), '$0.00');
  assert.equal(formatCurrency(Infinity, 'NZD'), '$0.00');
  assert.equal(formatCompactCurrency(NaN, 'NZD'), '$0');

  console.log('✓ finance audit regressions (#24, #29, MoM, recurring pace, weekend guard, formatting) pass');
}

// ---------------------------------------------------------------------------
// PR #15 final review regressions: end-only custom range budget, PaceHeroCard early month, Receipt MIME inference
// ---------------------------------------------------------------------------
{
  const multiMonthExpenses = [
    { date: '2026-08-10', amount: 500 },
    { date: '2026-10-15', amount: 400 },
  ];
  const endOnlyBudget = computePeriodBudget({
    period: 'custom',
    monthlyBudget: 1000,
    effectiveBudget: 1000,
    customRange: { start: '', end: '2026-10-31' },
    monthsCount: 3,
    expenses: multiMonthExpenses,
  });
  // Aug 10 .. Oct 31 = 83 days (~2.68 months), matching getDailyTrend span (> 1000 single-month fallback)
  assert.ok(endOnlyBudget > 2500 && endOnlyBudget < 3000, `Expected multi-month budget, got ${endOnlyBudget}`);

  const { resolveReceiptMimeType } = await import('../lib/ReceiptLLMProvider.js');
  assert.equal(resolveReceiptMimeType({ name: 'scan.heic', type: '' }, ''), 'image/heic');
  assert.equal(resolveReceiptMimeType({ name: 'bill.pdf', type: '' }, ''), 'application/pdf');
  assert.equal(
    resolveReceiptMimeType({ name: 'upload.bin', type: '' }, 'data:image/png;base64,AAAA'),
    'image/png'
  );

  // PaceHeroCard early-month (days 1-6) must not show "$0.00 under target" when projectedEnd > budget
  const paceHeroBuild = await esbuild.build({
    entryPoints: [path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/reviewer/PaceHeroCard.jsx')],
    bundle: true,
    write: false,
    format: 'esm',
    jsx: 'automatic',
    plugins: [
      {
        name: 'react-global-stub',
        setup(build) {
          build.onResolve({ filter: /^react(\/jsx-runtime)?$/ }, (args) => ({
            path: args.path,
            namespace: 'react-global',
          }));
          build.onLoad({ filter: /.*/, namespace: 'react-global' }, (args) => {
            if (args.path === 'react/jsx-runtime') {
              return {
                contents: 'export const jsx = globalThis.__testJsxRuntime.jsx; export const jsxs = globalThis.__testJsxRuntime.jsxs; export const Fragment = globalThis.__testJsxRuntime.Fragment;',
                loader: 'js',
              };
            }
            return {
              contents:
                'const R = globalThis.__testReact; export default R; export const { createContext, useContext, useMemo, createElement, forwardRef, useState, useEffect, useRef, useCallback } = R;',
              loader: 'js',
            };
          });
        },
      },
    ],
  });
  const paceHeroUrl = `data:text/javascript;base64,${Buffer.from(paceHeroBuild.outputFiles[0].text, 'utf8').toString('base64')}`;
  const { default: PaceHeroCard } = await import(paceHeroUrl);
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(PaceHeroCard, {
      name: 'Alex',
      monthLabel: 'Nov 2026',
      status: 'on-track',
      currency: 'NZD',
      pace: {
        monthlyBudget: 1000,
        remaining: 800,
        monthSpent: 200,
        projectedEndSpend: 3000,
        currentDay: 2,
        budgetSpentPercent: 20,
        monthElapsedPercent: 7,
      },
    })
  );
  assert.equal(html.includes('$0.00 under target'), false);
  assert.equal(html.includes('$800.00 left this month'), true);

  console.log('✓ PR #15 final review UI & math regressions pass');
}

console.log('\nAll audit regression tests passed!');
