import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import CommentDrawer from './components/comments/CommentDrawer';
import useCarryOver from './hooks/useCarryOver';
import useComments from './hooks/useComments';
import useSubscriptions from './hooks/useSubscriptions';
import useUserSettings from './hooks/useUserSettings';
import useSavingsGoals from './hooks/useSavingsGoals';
import { supabase } from './lib/supabaseClient';
import AddExpenseModal from './components/AddExpenseModal';
import PasswordRecoveryModal from './components/auth/PasswordRecoveryModal';
import DashboardPage from './pages/DashboardPage';
import LoadingState from './components/shell/LoadingState';
import DatabasePausedBanner from './components/shell/DatabasePausedBanner';

// Lazy-loaded routes to minimize initial mobile bundle size
const SpendingBreakdownPage = lazy(() => import('./pages/SpendingBreakdownPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const SavingsGoalsPage = lazy(() => import('./pages/SavingsGoalsPage'));
const BudgetSettingsPage = lazy(() => import('./pages/BudgetSettingsPage'));
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ReviewerHubPage = lazy(() => import('./pages/ReviewerHubPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

import AppShell from './components/shell/AppShell';
import { useAuth } from './components/auth/AuthGuard';
import {
  getCurrentMonthExpenses,
  getFinanceSummary,
  getExpensesForPeriod,
  sortExpenses,
  getLocalDateString,
} from './utils/finance';
import { parseISO } from 'date-fns';
import { getTotalSubscriptionBurden, mergeSubscriptionOccurrences } from './utils/subscriptions';
import { withConvertedAmounts } from './utils/exchangeRates';
import useExchangeRates from './hooks/useExchangeRates';

import useMembership from './hooks/useMembership';
import useReceiptQueue from './hooks/useReceiptQueue';
import { countUnreadFeedback } from './utils/reviewInsights';

function App() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  const [supabaseExpenses, setSupabaseExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState('');

  const authUserId = session?.user?.id || '';
  const {
    myReviewers,
    revieweeCandidates,
    addReviewer,
    removeReviewer,
    refreshMembership,
    accessLoading,
    error: membershipError,
  } = useMembership({ sessionUserId: authUserId });


  const {
    subscriptions: rawSubscriptions,
    allSubscriptions,
    isLoaded: subscriptionsLoaded,
    addSubscription,
    toggleSubscription,
    updateSubscription,
    removeSubscription,
    error: subscriptionsError,
  } = useSubscriptions({
    userId: authUserId,
  });

  const {
    settings: userSettings,
    isLoading: userSettingsLoading,
    error: userSettingsError,
    updateUserSettings,
  } = useUserSettings({
    userId: authUserId,
  });

  const { rates: exchangeRates, ready: exchangeRatesReady } = useExchangeRates();
  const budgetCurrency = userSettings?.default_currency || 'NZD';
  const subscriptions = useMemo(
    () => withConvertedAmounts(rawSubscriptions, budgetCurrency, exchangeRates),
    [rawSubscriptions, budgetCurrency, exchangeRates],
  );
  // Includes removed subscriptions, whose recent charges stay in history.
  const billingSubscriptions = useMemo(
    () => withConvertedAmounts(allSubscriptions, budgetCurrency, exchangeRates),
    [allSubscriptions, budgetCurrency, exchangeRates],
  );
  const totalMonthlyBurden = useMemo(() => getTotalSubscriptionBurden(subscriptions), [subscriptions]);

  const {
    goals: savingsGoals,
    addGoal: handleAddGoal,
    deleteGoal: handleDeleteGoal,
    addDeposit: handleAddDeposit,
    error: savingsGoalsError,
  } = useSavingsGoals({
    userId: authUserId,
  });

  const monthlyBudget = Number(userSettings?.monthly_budget) || 0;

  const expenses = useMemo(() => {
    return sortExpenses(mergeSubscriptionOccurrences(supabaseExpenses, billingSubscriptions));
  }, [supabaseExpenses, billingSubscriptions]);

  const {
    snapshots,
    effectiveBudget,
    previousCarryOver,
    currentMonth,
    categoryLimits,
    updateCategoryLimits,
    allocateCarryOver,
    updateCarryOver,
    carryOver,
    error: carryOverError,
  } = useCarryOver({
    expenses,
    baseBudget: monthlyBudget,
    userId: authUserId,
  });

  const handleAllocateCarryOver = async (goalId, amount) => {
    // Take it from carry-over first, and put it back if the deposit fails, so money is never counted twice or lost.
    const balanceBefore = carryOver;
    if ((await allocateCarryOver(amount)) === false) {
      throw new Error('Could not update your carry-over balance. Please try again.');
    }
    try {
      await handleAddDeposit(goalId, amount);
    } catch (err) {
      await updateCarryOver(balanceBefore);
      throw err;
    }
  };

  const {
    expenseComments,
    monthComments,
    commentCounts,
    getExpenseComments,
    addCommentToExpense,
    getReviewerMonthComment,
    error: commentsError,
  } = useComments({
    userId: authUserId,
  });

  const [ownerSeenIso, setOwnerSeenIso] = useState(null);

  useEffect(() => {
    try {
      setOwnerSeenIso(authUserId ? localStorage.getItem(`reviewerHub:ownerSeen:${authUserId}`) : null);
    } catch {
      setOwnerSeenIso(null);
    }
  }, [authUserId]);

  const markOwnerFeedbackSeen = useCallback(() => {
    const nowIso = new Date().toISOString();
    try {
      localStorage.setItem(`reviewerHub:ownerSeen:${authUserId}`, nowIso);
    } catch { /* ignore */ }
    setOwnerSeenIso(nowIso);
  }, [authUserId]);

  const unreadFeedbackCount = useMemo(() => {
    // Ignore any comments left by the user themselves.
    return countUnreadFeedback({
      expenseComments,
      monthComments,
      seenIso: ownerSeenIso,
      currentUserId: authUserId,
    });
  }, [expenseComments, monthComments, ownerSeenIso, authUserId]);

  const activeSupabaseError = supabaseError || subscriptionsError || carryOverError || commentsError || membershipError || userSettingsError || savingsGoalsError;

  const monthlyExpenses = getCurrentMonthExpenses(expenses);
  const summary = getFinanceSummary(monthlyExpenses, effectiveBudget);
  const periodExpenses = getExpensesForPeriod(expenses, selectedPeriod, customRange);

  const periodBudget = useMemo(() => {
    if (selectedPeriod === 'current-month') {
      return effectiveBudget;
    }
    if (selectedPeriod === 'last-90-days') {
      return monthlyBudget * 3;
    }
    if (selectedPeriod === 'this-year') {
      const monthsElapsed = new Date().getMonth() + 1;
      return monthlyBudget * monthsElapsed;
    }
    if (selectedPeriod === 'custom' && customRange?.start && customRange?.end) {
      const startDate = parseISO(customRange.start);
      const endDate = parseISO(customRange.end);
      const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const monthsCount = Math.max(1, diffDays / 30);
      return monthlyBudget * monthsCount;
    }
    // all-time or fallback
    if (snapshots && snapshots.length > 0) {
      return monthlyBudget * Math.max(1, snapshots.length);
    }
    return monthlyBudget;
  }, [selectedPeriod, effectiveBudget, monthlyBudget, customRange, snapshots]);

  const periodSummary = getFinanceSummary(
    periodExpenses,
    periodBudget,
  );

  const currentCategoryLimits = useMemo(() => {
    if (categoryLimits && Object.keys(categoryLimits).length > 0) return categoryLimits;
    if (!snapshots || snapshots.length === 0) return {};
    const currentSnapshot = snapshots.find((s) => s.month === currentMonth);
    return currentSnapshot?.category_limits || snapshots[0]?.category_limits || {};
  }, [categoryLimits, snapshots, currentMonth]);

  const selectedExpenseComments = selectedExpense ? getExpenseComments(selectedExpense.id) : [];
  const reviewerMonthComment = getReviewerMonthComment(currentMonth);



  useEffect(() => {
    if (!authUserId) {
      setSupabaseExpenses([]);
      setExpensesLoading(false);
      return;
    }

    let isMounted = true;

    const loadExpenses = async () => {
      setExpensesLoading(true);

      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('id,user_id,amount,category,date,note,created_at')
          .eq('user_id', authUserId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (error) {
          setSupabaseError(error.message);
          setSupabaseExpenses([]);
          return;
        }

        const normalizedExpenses = (data || []).map((expense) => ({
          ...expense,
          amount: Number(expense.amount),
          note: expense.note || '',
        }));

        setSupabaseExpenses(sortExpenses(normalizedExpenses));
        setSupabaseError('');
      } catch (err) {
        if (!isMounted) return;
        setSupabaseError(err.message || 'Unable to load expenses');
        setSupabaseExpenses([]);
      } finally {
        if (isMounted) {
          setExpensesLoading(false);
        }
      }
    };

    loadExpenses();

    return () => {
      isMounted = false;
    };
  }, [authUserId]);

  const handleAddExpense = async (expenseOrExpenses) => {
    const isArray = Array.isArray(expenseOrExpenses);
    const expensesArray = isArray ? expenseOrExpenses : [expenseOrExpenses];

    const userId = session?.user?.id;

    if (!userId) {
      const msg = 'Sign in before adding an expense.';
      setSupabaseError(msg);
      throw new Error(msg);
    }

    const rowsToInsert = expensesArray.map((expense) => ({
      user_id: userId,
      amount: Number(expense.amount),
      category: expense.category,
      date: (expense.date && expense.date !== 'Today') ? expense.date : getLocalDateString(),
      note: expense.note?.trim() || null,
    }));

    const { data, error } = await supabase
      .from('expenses')
      .insert(rowsToInsert)
      .select('id,user_id,amount,category,date,note,created_at');

    if (error) {
      setSupabaseError(error.message);
      throw error;
    }

    const normalizedExpenses = (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount),
      note: row.note || '',
    }));

    setSupabaseExpenses((current) => sortExpenses([...normalizedExpenses, ...current]));
    setSupabaseError('');
    setAddExpenseOpen(false);
    return normalizedExpenses;
  };

  const {
    readyReceipts,
    pendingCount,
    failedReceipts,
    totalReadyAmount,
    pendingStorageBytes,
    pendingStorageSize,
    isApproving: isApprovingReceipts,
    approveReceipt,
    approveAll: approveAllReceipts,
    dismissReceipt,
    dismissFailedReceipt,
    refreshQueue,
  } = useReceiptQueue({
    userId: authUserId,
    onExpensesAdded: handleAddExpense,
  });

  const canDeleteExpense = (expense) => {
    const userId = session?.user?.id;
    return Boolean(userId && expense?.user_id === userId);
  };

  const handleDeleteExpense = async (expenseId) => {
    const userId = session?.user?.id;

    if (!userId) {
      setSupabaseError('Sign in before deleting an expense.');
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId);

    if (error) {
      setSupabaseError(error.message);
      return;
    }

    setSupabaseExpenses((current) => current.filter((expense) => expense.id !== expenseId));
    setSelectedExpense((current) => (current?.id === expenseId ? null : current));
    setSupabaseError('');
  };

  const handleAddSubscription = async (input) => {
    await addSubscription(input);
  };

  const handleToggleSubscription = async (subscriptionId) => {
    await toggleSubscription(subscriptionId);
  };

  const handleUpdateSubscription = async (subscriptionId, updates) => {
    await updateSubscription(subscriptionId, updates);
  };

  const handleRemoveSubscription = async (subscriptionId) => {
    await removeSubscription(subscriptionId);
  };


  const reviewerHubPage = (
    <ReviewerHubPage
      revieweeCandidates={revieweeCandidates}
      myReviewers={myReviewers}
      onAddReviewer={addReviewer}
      onRemoveReviewer={removeReviewer}
      expenses={expenses}
      expenseComments={expenseComments}
      monthComments={monthComments}
      onOpenExpenseComments={(exp) => setSelectedExpense(exp)}
      defaultCurrency={userSettings?.default_currency}
      accessLoading={accessLoading}
      membershipError={membershipError}
      onRetryMembership={refreshMembership}
      ownerSeenIso={ownerSeenIso}
      onMarkOwnerFeedbackSeen={markOwnerFeedbackSeen}
      currentUserId={authUserId}
    />
  );

  return (
    <AppShell
      userEmail={session?.user?.email}
      subscriptions={subscriptions}
      defaultCurrency={userSettings?.default_currency}
      isProMember={userSettings?.is_pro_member}
      onAddExpense={() => setAddExpenseOpen(true)}
      revieweeCandidates={revieweeCandidates}
      unreadFeedbackCount={unreadFeedbackCount}
    >
      <DatabasePausedBanner />

      <AnimatePresence mode="wait">
        {activeSupabaseError ? (
          <motion.div
            key={activeSupabaseError}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="mb-6 rounded-2xl border border-[rgba(255,180,171,0.2)] bg-[rgba(255,180,171,0.1)] px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="text-sm">
                <p className="font-medium text-[var(--error)]">Sync issue detected</p>
                <p className="mt-0.5 text-[var(--error)]">{activeSupabaseError}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {expensesLoading ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface-container)] px-4 py-3"
          >
            <div className="flex items-center gap-3 text-sm text-[var(--on-surface-variant)]">
              <div className="w-4 h-4 rounded-full border-2 border-[rgba(208,188,255,0.2)] border-t-[var(--primary)] animate-spin" />
              <span>Syncing shared expenses...</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Routes setup with route-level lazy loading and Suspense boundary */}
      <Suspense fallback={<LoadingState message="Loading view..." />}>
        <Routes>
          <Route path="/" element={
            <DashboardPage
              effectiveBudget={effectiveBudget}
              expenses={expenses}
              monthlyExpenses={monthlyExpenses}
              summary={summary}
              previousCarryOver={previousCarryOver}
              currentMonth={currentMonth}
              reviewerMonthComment={reviewerMonthComment}
              myReviewers={myReviewers}
              loading={expensesLoading && supabaseExpenses.length === 0}
              onOpenSpendingBreakdown={() => navigate('/breakdown')}
              onOpenComments={(expense) => setSelectedExpense(expense)}
              commentCounts={commentCounts}
              subscriptions={subscriptions}
              savingsGoals={savingsGoals}
              defaultCurrency={userSettings?.default_currency}
              receiptQueue={{
                readyReceipts,
                pendingCount,
                failedReceipts,
                totalReadyAmount,
                pendingStorageBytes,
                pendingStorageSize,
                isApproving: isApprovingReceipts,
                approveReceipt,
                approveAll: approveAllReceipts,
                dismissReceipt,
                dismissFailedReceipt,
              }}
            />
          } />
          <Route path="/subscriptions" element={
            <SubscriptionsPage
              subscriptions={subscriptions}
              totalMonthlyBurden={totalMonthlyBurden}
              budget={monthlyBudget}
              onToggleSubscription={handleToggleSubscription}
              onAddSubscription={handleAddSubscription}
              onUpdateSubscription={handleUpdateSubscription}
              onRemoveSubscription={handleRemoveSubscription}
              defaultCurrency={userSettings?.default_currency}
            />
          } />
          <Route path="/breakdown" element={
            <SpendingBreakdownPage
              expenses={periodExpenses}
              allExpenses={expenses}
              period={selectedPeriod}
              summary={periodSummary}
              customRange={customRange}
              snapshots={snapshots}
              subscriptions={subscriptions}
              isLoading={expensesLoading}
              onBack={() => navigate('/')}
              onPeriodChange={setSelectedPeriod}
              onCustomRangeChange={setCustomRange}
              onOpenComments={(expense) => setSelectedExpense(expense)}
              commentCounts={commentCounts}
              onDeleteExpense={handleDeleteExpense}
              canDeleteExpense={canDeleteExpense}
              defaultCurrency={userSettings?.default_currency}
              onSaveCategoryLimits={updateCategoryLimits}
            />
          } />
          <Route path="/savings" element={
            <SavingsGoalsPage
              goals={savingsGoals}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
              onAddDeposit={handleAddDeposit}
              onAllocateCarryOver={handleAllocateCarryOver}
              previousCarryOver={previousCarryOver}
              defaultCurrency={userSettings?.default_currency}
            />
          } />
          <Route path="/settings" element={
            <BudgetSettingsPage
              baseBudget={monthlyBudget}
              userSettings={userSettings}
              onSaveUserSettings={updateUserSettings}
              categoryLimits={currentCategoryLimits}
              onSaveCategoryLimits={updateCategoryLimits}
              defaultCurrency={userSettings?.default_currency}
            />
          } />
          <Route path="/review-hub" element={reviewerHubPage} />
          <Route path="/review-hub/:candidateId" element={reviewerHubPage} />
          <Route path="/investments" element={
            <InvestmentsPage defaultCurrency={userSettings?.default_currency} />
          } />
          <Route path="/notifications" element={
            <NotificationsPage subscriptions={subscriptions} defaultCurrency={userSettings?.default_currency} />
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpenseComments}
        role="owner"
        onSubmitComment={(body) => {
          if (!selectedExpense) return;
          return addCommentToExpense(selectedExpense.id, body, 'owner');
        }}
      />
      <PasswordRecoveryModal />
      <AddExpenseModal
        defaultCurrency={userSettings?.default_currency}
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onAddExpense={handleAddExpense}
        userId={authUserId}
        onReceiptQueued={refreshQueue}
      />
    </AppShell>
  );
}

export default App;
