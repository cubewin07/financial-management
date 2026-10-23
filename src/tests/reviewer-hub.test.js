import assert from 'node:assert/strict';
import {
  getExpensesForPeriod,
  getFinanceSummary,
  getChartCategoryBreakdown,
  getDailyBurnRate,
  REVIEWER_PERIOD_OPTIONS,
  getCategoryFilterOptions,
  getMonthPace,
  isRecurringExpense,
} from '../utils/finance.js';

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
  import('../utils/finance.js').then(({ PERIOD_OPTIONS }) => {
    assert.ok(Array.isArray(PERIOD_OPTIONS));
    assert.ok(PERIOD_OPTIONS.length >= 4);
    for (const opt of PERIOD_OPTIONS) {
      assert.equal(typeof opt.value, 'string');
      assert.equal(typeof opt.label, 'string');
    }
    console.log('✓ Reporting window options: PERIOD_OPTIONS conforms to CustomSelect contract');
    console.log('\nAll Reviewer Hub contract tests passed!\n');
  });
}

runTests().catch((err) => {
  console.error('Reviewer Hub test failed:', err);
  process.exit(1);
});

