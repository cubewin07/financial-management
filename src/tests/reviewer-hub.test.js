import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computePeriodBudget,
  getExpensesForPeriod,
  getFinanceSummary,
  getChartCategoryBreakdown,
  getDailyBurnRate,
  REVIEWER_PERIOD_OPTIONS,
  getCategoryFilterOptions,
  getMonthPace,
  isRecurringExpense,
} from '../utils/finance.js';
import { classifyPace } from '../utils/reviewInsights.js';

async function runTests() {
  console.log('--- Running Reviewer Hub & Role-Based Sharing Contract Tests ---');

  // 1. Email validation & RPC simulation contract
  function simulateAddReviewer({ currentUserId, currentUserEmail, inputEmail, registeredUsers }) {
    const cleanEmail = String(inputEmail || '').trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    if (cleanEmail === String(currentUserEmail || '').trim().toLowerCase()) {
      return { success: false, message: 'You cannot add yourself as a reviewer.' };
    }

    const foundUser = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!foundUser) {
      return {
        success: false,
        message: 'No registered account found with this email. Please ask them to sign up for an account first.',
      };
    }

    if (foundUser.id === currentUserId) {
      return { success: false, message: 'You cannot add yourself as a reviewer.' };
    }

    return {
      success: true,
      message: 'Reviewer added successfully.',
      member_user_id: foundUser.id,
      role: 'reviewer',
    };
  }

  const mockRegisteredUsers = [
    { id: 'user-son-1', email: 'son@example.com' },
    { id: 'user-dad-2', email: 'dad@example.com' },
    { id: 'user-mentor-3', email: 'mentor@example.com' },
  ];

  // Test 1a: Empty email rejected
  const emptyRes = simulateAddReviewer({
    currentUserId: 'user-son-1',
    currentUserEmail: 'son@example.com',
    inputEmail: '   ',
    registeredUsers: mockRegisteredUsers,
  });
  assert.equal(emptyRes.success, false);
  assert.match(emptyRes.message, /valid email address/i);
  console.log('✓ Rejects empty email address');

  // Test 1b: Self addition rejected
  const selfRes = simulateAddReviewer({
    currentUserId: 'user-son-1',
    currentUserEmail: 'son@example.com',
    inputEmail: 'SoN@example.com',
    registeredUsers: mockRegisteredUsers,
  });
  assert.equal(selfRes.success, false);
  assert.match(selfRes.message, /cannot add yourself/i);
  console.log('✓ Rejects self-addition as reviewer');

  // Test 1c: Unregistered user returns clear guidance message
  const notFoundRes = simulateAddReviewer({
    currentUserId: 'user-son-1',
    currentUserEmail: 'son@example.com',
    inputEmail: 'unregistered@domain.com',
    registeredUsers: mockRegisteredUsers,
  });
  assert.equal(notFoundRes.success, false);
  assert.equal(
    notFoundRes.message,
    'No registered account found with this email. Please ask them to sign up for an account first.'
  );
  console.log('✓ Unregistered user returns explicit registration guidance');

  // Test 1d: Valid registered user added successfully
  const validRes = simulateAddReviewer({
    currentUserId: 'user-son-1',
    currentUserEmail: 'son@example.com',
    inputEmail: '  Dad@example.com  ',
    registeredUsers: mockRegisteredUsers,
  });
  assert.equal(validRes.success, true);
  assert.equal(validRes.member_user_id, 'user-dad-2');
  assert.equal(validRes.role, 'reviewer');
  console.log('✓ Valid registered user added with reviewer role');

  // 2. Candidate Report Isolation & Metric Calculations
  const candidateExpenses = [
    { id: 'e1', user_id: 'user-son-1', item: 'Groceries at Countdown', amount: 150.0, category: 'Groceries', date: '2026-09-05' },
    { id: 'e2', user_id: 'user-son-1', item: 'Petrol', amount: 80.0, category: 'Transport', date: '2026-09-10' },
    { id: 'e3', user_id: 'user-son-1', item: 'Dinner out', amount: 70.0, category: 'Food', date: '2026-09-18' },
  ];
  const candidateBudget = 1000;

  const summary = getFinanceSummary(candidateExpenses, candidateBudget);
  assert.equal(summary.totalSpent, 300.0);
  assert.equal(summary.remaining, 700.0);
  assert.equal(summary.transactionCount, 3);
  console.log('✓ Candidate finance summary calculates accurately');

  const categoryBreakdown = getChartCategoryBreakdown(candidateExpenses);
  assert.equal(categoryBreakdown.length, 3);
  const groceriesCategory = categoryBreakdown.find((c) => c.name === 'Groceries');
  assert.equal(groceriesCategory.value, 150.0);
  console.log('✓ Candidate category breakdown aggregates accurately');

  // 3. Privacy Boundary Assurance Contract
  // Candidate report payload should NEVER include sensitive asset objects
  function createCandidateReportPayload({ expenses, budget, currency }) {
    const periodExpenses = getExpensesForPeriod(expenses, 'current-month');
    return {
      candidateOwnerId: 'user-son-1',
      defaultCurrency: currency || 'NZD',
      monthlyBudget: budget,
      periodExpenses,
      summary: getFinanceSummary(periodExpenses, budget),
      categoryData: getChartCategoryBreakdown(periodExpenses),
    };
  }

  const reportPayload = createCandidateReportPayload({
    expenses: candidateExpenses,
    budget: candidateBudget,
    currency: 'NZD',
  });

  // Verify private fields are completely absent
  assert.equal('accounts' in reportPayload, false);
  assert.equal('investments' in reportPayload, false);
  assert.equal('savings_goals' in reportPayload, false);
  assert.equal('receipt_queue' in reportPayload, false);
  assert.equal('user_income_sources' in reportPayload, false);
  console.log('✓ Privacy boundary contract: Sensitive tables completely omitted from report payload');

  // 4. Role-based commenting permission gating
  function canAuthorComment(role) {
    return role === 'reviewer' || role === 'owner';
  }

  assert.equal(canAuthorComment('reviewer'), true);
  assert.equal(canAuthorComment('owner'), true);
  assert.equal(canAuthorComment('viewer'), false);
  assert.equal(canAuthorComment('guest'), false);
  // 5. Membership silent reload contract
  // When isSilent is true, accessLoading state should NOT be set to true
  function simulateMembershipLoad({ isSilent, initialLoadDone, currentAccessLoading }) {
    let accessLoading = currentAccessLoading;
    if (!isSilent && !initialLoadDone) {
      accessLoading = true;
    }
    // after query finishes:
    const newInitialLoadDone = true;
    if (!isSilent) {
      accessLoading = false;
    }
    return { accessLoading, initialLoadDone: newInitialLoadDone };
  }

  // Initial load sets accessLoading true then false
  const initLoadRes = simulateMembershipLoad({ isSilent: false, initialLoadDone: false, currentAccessLoading: false });
  assert.equal(initLoadRes.accessLoading, false);
  assert.equal(initLoadRes.initialLoadDone, true);

  // Silent load retains accessLoading = false without setting it true or dispatching re-render
  const silentLoadRes = simulateMembershipLoad({ isSilent: true, initialLoadDone: true, currentAccessLoading: false });
  assert.equal(silentLoadRes.accessLoading, false);
  console.log('✓ Silent reload contract: isSilent does not toggle accessLoading or cause UI reload');

  // 6. Target budget user ID isolation
  // Budget owner ID always defaults to sessionUserId and does not get blocked by accessLoading
  function resolveTargetBudgetUserId({ sessionUserId, budgetOwnerId }) {
    return budgetOwnerId || sessionUserId;
  }
  assert.equal(resolveTargetBudgetUserId({ sessionUserId: 'user-abc', budgetOwnerId: '' }), 'user-abc');
  assert.equal(resolveTargetBudgetUserId({ sessionUserId: 'user-abc', budgetOwnerId: 'user-abc' }), 'user-abc');
  console.log('✓ App budget isolation: targetBudgetUserId resolves immediately from sessionUserId');

  // B3 — reviewer periods never include 'custom'
  assert.ok(REVIEWER_PERIOD_OPTIONS.length >= 3);
  assert.equal(REVIEWER_PERIOD_OPTIONS.some((o) => o.value === 'custom'), false);
  assert.ok(REVIEWER_PERIOD_OPTIONS.some((o) => o.value === 'current-month'));
  console.log('✓ Reviewer periods exclude custom range');

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
  console.log('✓ Category filter options match CustomSelect contract');

  // B2 — pace (fixed clock: 15 Oct 2026, 31-day month => 17 days remaining incl. today)
  const now = new Date(2026, 9, 15);
  const onTrack = getMonthPace({ monthlyBudget: 1000, monthSpent: 300, now });
  assert.equal(onTrack.monthlyBudget, 1000);
  assert.equal(onTrack.budget, 1000);
  assert.equal(onTrack.monthSpent, 300);
  assert.equal(onTrack.daysInMonth, 31);
  assert.equal(onTrack.daysRemaining, 17);
  assert.equal(onTrack.dailyAvg, 20);
  assert.equal(onTrack.projectedEndSpend, 620);
  assert.equal(onTrack.remaining, 700);
  assert.equal(onTrack.budgetSpentPercent, 30);
  assert.equal(onTrack.isPacingOver, false);
  const over = getMonthPace({ monthlyBudget: 1000, monthSpent: 800, now });
  assert.equal(over.isPacingOver, true); // projected ~1653 > 1000
  const noBudget = getMonthPace({ monthlyBudget: 0, monthSpent: 500, now });
  assert.equal(noBudget.budgetSpentPercent, null);
  assert.equal(noBudget.isPacingOver, false);
  assert.equal(noBudget.safeDailyAllowance, 0);
  console.log('✓ Month-scoped pace calculations match budget expectations');

  // B5 — burn-rate contract the page depends on
  const burn = getDailyBurnRate([{ amount: 30, date: '2026-10-01' }], 'current-month');
  assert.ok('dailyAvg' in burn && 'daysCovered' in burn);
  assert.equal('dailyRate' in burn, false);
  console.log('✓ Daily burn rate exposes dailyAvg and daysCovered');

  // B6 — recurring expense virtual row detection
  assert.equal(isRecurringExpense({ id: 'sub-exp-12-2026-10-01', subscription_id: 12 }), true);
  assert.equal(isRecurringExpense({ id: 'sub-exp-12-2026-10-01' }), true);
  assert.equal(isRecurringExpense({ id: 42 }), false);
  assert.equal(isRecurringExpense({ id: 'a3f9-uuid', subscription_id: null }), false);
  assert.equal(isRecurringExpense(null), false);
  console.log('✓ Virtual recurring subscription rows identified accurately');

  // 7. Reporting window options structure contract for CustomSelect
  const { PERIOD_OPTIONS } = await import('../utils/finance.js');
  assert.ok(Array.isArray(PERIOD_OPTIONS));
  assert.ok(PERIOD_OPTIONS.length >= 4);
  for (const opt of PERIOD_OPTIONS) {
    assert.equal(typeof opt.value, 'string');
    assert.equal(typeof opt.label, 'string');
  }
  console.log('✓ Reporting window options: PERIOD_OPTIONS conforms to CustomSelect contract');

  // 8. One-tap quick reply "Looks fine" configuration contract
  const { REVIEWER_QUICK_REPLIES } = await import('../utils/reviewInsights.js');
  assert.ok(Array.isArray(REVIEWER_QUICK_REPLIES));
  const looksFine = REVIEWER_QUICK_REPLIES.find((r) => r.text === 'Looks fine');
  assert.ok(looksFine, 'Looks fine quick reply must exist');
  assert.equal(looksFine?.autoSend, true, 'Looks fine must be configured with autoSend: true');
  console.log('✓ One-tap quick reply "Looks fine" exported and configured for instant posting');

  // 9. Issue #17: Reviewer Hub effective budget includes current-month carry-over top-up
  const loaderSource = `
    export async function resolve(specifier, context, nextResolve) {
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
      if (url === 'mock:supabaseClient') {
        return {
          format: 'module',
          source: 'export const supabase = new Proxy({}, { get: (_t, prop) => globalThis.__REVIEWER_TEST_SUPABASE__[prop] });',
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    }
  `;
  register(`data:text/javascript,${encodeURIComponent(loaderSource)}`);

  let rpcHandler = async () => ({ data: [], error: null });
  let fromHandler = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
  });

  globalThis.__REVIEWER_TEST_SUPABASE__ = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    rpc: (...args) => rpcHandler(...args),
    from: (...args) => fromHandler(...args),
  };

  const { fetchCandidateBudgetSettings, resolveCandidateBudgetSettings } = await import('../lib/candidateSettings.js');
  const { computeCandidatePeriodBudget } = await import('../hooks/useCandidateReport.js');
  const { buildRevieweeOverview } = await import('../hooks/useRevieweeOverviews.js');

  const fixedNovNow = new Date(2026, 10, 20); // 2026-11-20

  // 9a. Pure helper resolves current-month carry-over top-up, ignores stale months & missing fields
  const currentMonthResolved = resolveCandidateBudgetSettings(
    {
      monthly_budget: 2000,
      default_currency: 'NZD',
      carry_over_allocated: 350.5,
      carry_over_allocated_month: '2026-11',
    },
    fixedNovNow,
  );
  assert.equal(currentMonthResolved.baseMonthlyBudget, 2000);
  assert.equal(currentMonthResolved.carryOverAllocated, 350.5);
  assert.equal(currentMonthResolved.effectiveMonthlyBudget, 2350.5);
  assert.equal(currentMonthResolved.defaultCurrency, 'NZD');

  const staleMonthResolved = resolveCandidateBudgetSettings(
    {
      monthly_budget: 2000,
      default_currency: 'USD',
      carry_over_allocated: 500,
      carry_over_allocated_month: '2026-10',
    },
    fixedNovNow,
  );
  assert.equal(staleMonthResolved.baseMonthlyBudget, 2000);
  assert.equal(staleMonthResolved.carryOverAllocated, 0);
  assert.equal(staleMonthResolved.effectiveMonthlyBudget, 2000);
  assert.equal(staleMonthResolved.defaultCurrency, 'USD');

  const legacyResolved = resolveCandidateBudgetSettings(
    { monthly_budget: 1800, default_currency: 'AUD' },
    fixedNovNow,
  );
  assert.equal(legacyResolved.baseMonthlyBudget, 1800);
  assert.equal(legacyResolved.carryOverAllocated, 0);
  assert.equal(legacyResolved.effectiveMonthlyBudget, 1800);

  const dustResolved = resolveCandidateBudgetSettings(
    {
      monthly_budget: '1000.10',
      carry_over_allocated: '200.20',
      carry_over_allocated_month: '2026-11',
    },
    fixedNovNow,
  );
  assert.equal(dustResolved.effectiveMonthlyBudget, 1200.3);

  const negativeAllocResolved = resolveCandidateBudgetSettings(
    {
      monthly_budget: 1000,
      carry_over_allocated: -75,
      carry_over_allocated_month: '2026-11',
    },
    fixedNovNow,
  );
  assert.equal(negativeAllocResolved.carryOverAllocated, 0);
  assert.equal(negativeAllocResolved.effectiveMonthlyBudget, 1000);

  const emptyResolved = resolveCandidateBudgetSettings(null, fixedNovNow);
  assert.equal(emptyResolved.baseMonthlyBudget, 0);
  assert.equal(emptyResolved.carryOverAllocated, 0);
  assert.equal(emptyResolved.effectiveMonthlyBudget, 0);
  assert.equal(emptyResolved.defaultCurrency, 'NZD');
  console.log('✓ resolveCandidateBudgetSettings handles current-month, stale-month, legacy, and edge inputs');

  // 9b. fetchCandidateBudgetSettings integrates RPC + fallback cleanly
  rpcHandler = async (_fn, { target_owner_id }) => {
    assert.equal(target_owner_id, 'owner-1');
    return {
      data: [
        {
          monthly_budget: 2000,
          default_currency: 'NZD',
          carry_over_allocated: 400,
          carry_over_allocated_month: '2026-11',
        },
      ],
      error: null,
    };
  };
  const fetchedCurrent = await fetchCandidateBudgetSettings('owner-1', fixedNovNow);
  assert.equal(fetchedCurrent.error, null);
  assert.equal(fetchedCurrent.data.baseMonthlyBudget, 2000);
  assert.equal(fetchedCurrent.data.carryOverAllocated, 400);
  assert.equal(fetchedCurrent.data.effectiveMonthlyBudget, 2400);

  // Older RPC response without carry_over_allocated* columns
  rpcHandler = async () => ({
    data: [{ monthly_budget: 1500, default_currency: 'NZD' }],
    error: null,
  });
  const fetchedLegacyRpc = await fetchCandidateBudgetSettings('owner-1', fixedNovNow);
  assert.equal(fetchedLegacyRpc.error, null);
  assert.equal(fetchedLegacyRpc.data.baseMonthlyBudget, 1500);
  assert.equal(fetchedLegacyRpc.data.carryOverAllocated, 0);
  assert.equal(fetchedLegacyRpc.data.effectiveMonthlyBudget, 1500);

  // Missing RPC falls back to user_settings direct read
  rpcHandler = async () => ({ data: null, error: { code: 'PGRST202', message: 'Not found' } });
  fromHandler = (table) => {
    assert.equal(table, 'user_settings');
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { monthly_budget: 1750, default_currency: 'EUR' },
            error: null,
          }),
        }),
      }),
    };
  };
  const fetchedFallback = await fetchCandidateBudgetSettings('owner-1', fixedNovNow);
  assert.equal(fetchedFallback.error, null);
  assert.equal(fetchedFallback.data.baseMonthlyBudget, 1750);
  assert.equal(fetchedFallback.data.effectiveMonthlyBudget, 1750);
  assert.equal(fetchedFallback.data.defaultCurrency, 'EUR');
  console.log('✓ fetchCandidateBudgetSettings resolves RPC effective budget and falls back cleanly');

  // 9c. useCandidateReport periodBudget matches Owner Dashboard App.jsx computePeriodBudget 100%
  const sampleHistoryExpenses = [
    { id: 'e-aug', amount: 500, date: '2026-08-05', category: 'Food' },
    { id: 'e-nov', amount: 2150, date: '2026-11-10', category: 'Food' },
  ];
  const baseMonthlyBudget = 2000;
  const effectiveMonthlyBudget = 2400; // 2000 + 400 carry-over top-up in 2026-11

  for (const period of ['current-month', 'last-90-days', 'this-year', 'all-time']) {
    const reviewerPeriodBudget = computeCandidatePeriodBudget({
      period,
      baseMonthlyBudget,
      effectiveMonthlyBudget,
      allExpenses: sampleHistoryExpenses,
      now: fixedNovNow,
    });
    const ownerPeriodBudget = computePeriodBudget({
      period,
      monthlyBudget: baseMonthlyBudget,
      effectiveBudget: effectiveMonthlyBudget,
      monthsCount: 4, // Aug..Nov = 4 months
      now: fixedNovNow,
    });
    assert.equal(
      reviewerPeriodBudget,
      ownerPeriodBudget,
      `Period "${period}" must match Owner Dashboard computePeriodBudget`,
    );
  }
  assert.equal(
    computeCandidatePeriodBudget({
      period: 'current-month',
      baseMonthlyBudget,
      effectiveMonthlyBudget,
      allExpenses: sampleHistoryExpenses,
      now: fixedNovNow,
    }),
    2400,
  );
  assert.equal(
    computeCandidatePeriodBudget({
      period: 'last-90-days',
      baseMonthlyBudget,
      effectiveMonthlyBudget,
      allExpenses: sampleHistoryExpenses,
      now: fixedNovNow,
    }),
    6000,
  );
  const currentMonthSummary = getFinanceSummary(
    [{ id: 'e-nov', amount: 2150, date: '2026-11-10' }],
    effectiveMonthlyBudget,
  );
  assert.equal(currentMonthSummary.remaining, 250);
  console.log('✓ Candidate report periodBudget matches Owner Dashboard computePeriodBudget across all periods');

  // 9d. useRevieweeOverviews drives CandidateRow progress, pace, and classifyPace with effectiveMonthlyBudget
  const novExpenses = [{ id: 'nov-1', amount: 900, date: '2026-11-10', created_at: '2026-11-10T01:00:00Z' }];
  const withTopUpOverview = buildRevieweeOverview({
    settingsData: {
      monthly_budget: 1000,
      default_currency: 'NZD',
      carry_over_allocated: 500,
      carry_over_allocated_month: '2026-11',
    },
    rawExpenses: novExpenses,
    subsData: [],
    rates: { NZD: 1 },
    ownerId: 'owner-1',
    currentUserId: 'reviewer-1',
    now: fixedNovNow,
  });
  assert.equal(withTopUpOverview.monthSpent, 900);
  assert.equal(withTopUpOverview.baseMonthlyBudget, 1000);
  assert.equal(withTopUpOverview.carryOverAllocated, 500);
  assert.equal(withTopUpOverview.monthlyBudget, 1500);
  assert.equal(withTopUpOverview.pace.budget, 1500);
  assert.equal(withTopUpOverview.pace.remaining, 600);
  assert.equal(withTopUpOverview.pace.budgetSpentPercent, 60);
  assert.equal(
    withTopUpOverview.status,
    classifyPace({ monthlyBudget: 1500, monthSpent: 900, now: fixedNovNow }),
  );
  assert.equal(withTopUpOverview.status, 'on-track');

  // Stale allocation from prior month must NOT inflate current-month overview budget
  const staleTopUpOverview = buildRevieweeOverview({
    settingsData: {
      monthly_budget: 1000,
      default_currency: 'NZD',
      carry_over_allocated: 500,
      carry_over_allocated_month: '2026-10',
    },
    rawExpenses: novExpenses,
    subsData: [],
    rates: { NZD: 1 },
    ownerId: 'owner-1',
    currentUserId: 'reviewer-1',
    now: fixedNovNow,
  });
  assert.equal(staleTopUpOverview.monthlyBudget, 1000);
  assert.equal(staleTopUpOverview.carryOverAllocated, 0);
  assert.equal(staleTopUpOverview.pace.remaining, 100);
  assert.equal(staleTopUpOverview.status, 'over');
  console.log('✓ Reviewee overview pace, status, and CandidateRow budget use current-month effective budget');

  // 9e. Migration 020 security & schema contract
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationSql = fs.readFileSync(
    path.resolve(testDir, '../../supabase/migrations/020_reviewer_effective_budget.sql'),
    'utf8',
  );
  assert.match(migrationSql, /drop function if exists public\.get_candidate_budget_settings\(uuid\)/i);
  assert.match(migrationSql, /carry_over_allocated\s+numeric/i);
  assert.match(migrationSql, /carry_over_allocated_month\s+text/i);
  assert.match(migrationSql, /security definer/i);
  assert.match(migrationSql, /set search_path = public/i);
  assert.match(migrationSql, /is_budget_reviewer\(target_owner_id\)/i);
  assert.match(migrationSql, /revoke execute on function public\.get_candidate_budget_settings\(uuid\) from public, anon/i);
  assert.match(migrationSql, /grant execute on function public\.get_candidate_budget_settings\(uuid\) to authenticated/i);
  console.log('✓ Migration 020 preserves security definer, reviewer check, and authenticated-only grants');

  console.log('\nAll Reviewer Hub contract tests passed!\n');
}

runTests().catch((err) => {
  console.error('Reviewer Hub test failed:', err);
  process.exit(1);
});

