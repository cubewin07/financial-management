import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { endOfMonth } from 'date-fns';
import CommentDrawer from './components/CommentDrawer';
import useCarryOver from './hooks/useCarryOver';
import useComments from './hooks/useComments';
import useSubscriptions from './hooks/useSubscriptions';
import useUserSettings from './hooks/useUserSettings';
import useSavingsGoals from './hooks/useSavingsGoals';
import { supabase } from './lib/supabaseClient';
import AddExpenseModal from './components/AddExpenseModal';
import DashboardPage from './pages/DashboardPage';
import LoadingState from './components/shell/LoadingState';

// Lazy-loaded routes to minimize initial mobile bundle size
const SpendingBreakdownPage = lazy(() => import('./pages/SpendingBreakdownPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const SavingsGoalsPage = lazy(() => import('./pages/SavingsGoalsPage'));
const BudgetSettingsPage = lazy(() => import('./pages/BudgetSettingsPage'));
const InvestmentsPage = lazy(() => import('./pages/InvestmentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

import AppShell from './components/shell/AppShell';
import { useAuth } from './components/auth/AuthGuard';
import {
  getCurrentMonthExpenses,
  getFinanceSummary,
  getExpensesForPeriod,
  sortExpenses,
} from './utils/finance';
import { getSubscriptionBudgetShare, generateSubscriptionExpenseOccurrences } from './utils/subscriptions';

import useMembership from './hooks/useMembership';
import useReceiptQueue from './hooks/useReceiptQueue';

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
  const { budgetOwnerId, role, accessLoading, error: membershipError } = useMembership({ sessionUserId: authUserId });

  const isOwner = role === 'owner';
  const canManageBudget = isOwner;
  const targetBudgetUserId = budgetOwnerId;

  const {
    subscriptions,
    totalMonthlyBurden,
    addSubscription,
    toggleSubscription,
    updateSubscription,
    removeSubscription,
    error: subscriptionsError,
  } = useSubscriptions({
    userId: targetBudgetUserId,
  });

  const { settings: userSettings, error: userSettingsError, updateUserSettings } = useUserSettings({
    userId: targetBudgetUserId,
  });

  const {
    goals: savingsGoals,
    addGoal: handleAddGoal,
    deleteGoal: handleDeleteGoal,
    addDeposit: handleAddDeposit,
    allocateCarryOver: handleAllocateCarryOver,
  } = useSavingsGoals({
    userId: targetBudgetUserId,
  });

  const monthlyBudget = Number(userSettings?.monthly_budget) || 0;

  const expenses = useMemo(() => {
    const cutoff = selectedPeriod === 'current-month' ? endOfMonth(new Date()) : new Date();
    const subOccurrences = generateSubscriptionExpenseOccurrences(subscriptions, cutoff);
    const manualKeys = new Set(
      supabaseExpenses.map((e) => `${(e.item || '').toLowerCase().trim()}_${e.date}`)
    );

    const filteredSubOccurrences = subOccurrences.filter(
      (subExp) => !manualKeys.has(`${(subExp.item || '').toLowerCase().trim()}_${subExp.date}`)
    );

    return sortExpenses([...supabaseExpenses, ...filteredSubOccurrences]);
  }, [supabaseExpenses, subscriptions, selectedPeriod]);

  const {
    snapshots,
    effectiveBudget,
    previousCarryOver,
    currentMonth,
    updateCategoryLimits,
    error: carryOverError,
  } = useCarryOver({
    expenses,
    baseBudget: monthlyBudget,
    userId: targetBudgetUserId,
  });

  const {
    commentCounts,
    getExpenseComments,
    addCommentToExpense,
    getReviewerMonthComment,
    saveReviewerMonthComment,
    error: commentsError,
  } = useComments({
    userId: targetBudgetUserId,
  });

  const activeSupabaseError = supabaseError || subscriptionsError || carryOverError || commentsError || membershipError || userSettingsError;

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
      const startDate = new Date(customRange.start);
      const endDate = new Date(customRange.end);
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
    if (!snapshots || snapshots.length === 0) return {};
    const currentSnapshot = snapshots.find((s) => s.month === currentMonth);
    return currentSnapshot?.category_limits || snapshots[0]?.category_limits || {};
  }, [snapshots, currentMonth]);

  const selectedExpenseComments = selectedExpense ? getExpenseComments(selectedExpense.id) : [];
  const reviewerMonthComment = getReviewerMonthComment(currentMonth);
  const subscriptionBudgetShare = useMemo(
    () => getSubscriptionBudgetShare(subscriptions, monthlyBudget),
    [subscriptions],
  );

  useEffect(() => {
    if (!canManageBudget && addExpenseOpen) {
      setAddExpenseOpen(false);
    }
  }, [canManageBudget, addExpenseOpen]);



  useEffect(() => {
    if (accessLoading) {
      setExpensesLoading(true);
      return;
    }

    if (!targetBudgetUserId) {
      setSupabaseExpenses([]);
      setExpensesLoading(false);
      return;
    }

    let isMounted = true;

    const loadExpenses = async () => {
      setExpensesLoading(true);

      const { data, error } = await supabase
        .from('expenses')
        .select('id,user_id,amount,category,date,note,created_at')
        .eq('user_id', targetBudgetUserId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setSupabaseError(error.message);
        setSupabaseExpenses([]);
        setExpensesLoading(false);
        return;
      }

      const normalizedExpenses = (data || []).map((expense) => ({
        ...expense,
        amount: Number(expense.amount),
        note: expense.note || '',
      }));

      setSupabaseExpenses(sortExpenses(normalizedExpenses));
      setExpensesLoading(false);
      setSupabaseError('');
    };

    loadExpenses();

    return () => {
      isMounted = false;
    };
  }, [accessLoading, targetBudgetUserId]);

  const handleAddExpense = async (expenseOrExpenses) => {
    const isArray = Array.isArray(expenseOrExpenses);
    const expensesArray = isArray ? expenseOrExpenses : [expenseOrExpenses];

    const userId = session?.user?.id;

    if (!userId) {
      const msg = 'Sign in before adding an expense.';
      setSupabaseError(msg);
      throw new Error(msg);
    }

    if (!isOwner) {
      const msg = 'Only the owner account can add expenses.';
      setSupabaseError(msg);
      throw new Error(msg);
    }

    const rowsToInsert = expensesArray.map((expense) => ({
      user_id: userId,
      amount: Number(expense.amount),
      category: expense.category,
      date: expense.date,
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
  } = useReceiptQueue({
    userId: targetBudgetUserId,
    onExpensesAdded: handleAddExpense,
  });

  const canDeleteExpense = (expense) => {
    const userId = session?.user?.id;
    return Boolean(isOwner && userId && expense?.user_id === userId);
  };

  const handleDeleteExpense = async (expenseId) => {
    const userId = session?.user?.id;

    if (!userId) {
      setSupabaseError('Sign in before deleting an expense.');
      return;
    }

    if (!isOwner) {
      setSupabaseError('Only the owner account can delete expenses.');
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
    if (!canManageBudget) {
      setSupabaseError('Only the owner account can add subscriptions.');
      return;
    }
    await addSubscription(input);
  };

  const handleToggleSubscription = async (subscriptionId) => {
    if (!canManageBudget) {
      setSupabaseError('Only the owner account can update subscriptions.');
      return;
    }
    await toggleSubscription(subscriptionId);
  };

  const handleUpdateSubscription = async (subscriptionId, updates) => {
    if (!canManageBudget) {
      setSupabaseError('Only the owner account can update subscriptions.');
      return;
    }
    await updateSubscription(subscriptionId, updates);
  };

  const handleRemoveSubscription = async (subscriptionId) => {
    if (!canManageBudget) {
      setSupabaseError('Only the owner account can remove subscriptions.');
      return;
    }
    await removeSubscription(subscriptionId);
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-full border-4 border-[rgba(208,188,255,0.2)] border-t-[var(--primary)] animate-spin mb-4" />
          <p className="text-body-md text-[var(--on-surface)]">Preparing your shared budget access...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AppShell
      userEmail={session?.user?.email}
      subscriptions={subscriptions}
      defaultCurrency={userSettings?.default_currency}
      isProMember={userSettings?.is_pro_member}
      onAddExpense={() => setAddExpenseOpen(true)}
      canManageBudget={canManageBudget}
    >
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
              baseBudget={monthlyBudget}
              effectiveBudget={effectiveBudget}
              expenses={expenses}
              monthlyExpenses={monthlyExpenses}
              summary={summary}
              totalMonthlyBurden={totalMonthlyBurden}
              subscriptionBudgetShare={subscriptionBudgetShare}
              previousCarryOver={previousCarryOver}
              role={role}
              currentMonth={currentMonth}
              reviewerMonthComment={reviewerMonthComment}
              snapshots={snapshots}
              onNavigateAddExpense={() => setAddExpenseOpen(true)}
              onOpenSpendingBreakdown={() => navigate('/breakdown')}
              onOpenComments={(expense) => setSelectedExpense(expense)}
              commentCounts={commentCounts}
              onDeleteExpense={handleDeleteExpense}
              canDeleteExpense={canDeleteExpense}
              onSaveReviewerMonthComment={(body) => {
                if (role !== 'reviewer') return;
                saveReviewerMonthComment(currentMonth, body, 'reviewer');
              }}
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
              canManage={canManageBudget}
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
          <Route path="/investments" element={
            <InvestmentsPage />
          } />
          <Route path="/notifications" element={
            <NotificationsPage subscriptions={subscriptions} defaultCurrency={userSettings?.default_currency} />
          } />
        </Routes>
      </Suspense>

      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpenseComments}
        role={role}
        onSubmitComment={(body) => {
          if (!selectedExpense) return;
          if (role !== 'reviewer' && role !== 'owner') return;
          addCommentToExpense(selectedExpense.id, body, role);
        }}
      />
      <AddExpenseModal
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onAddExpense={handleAddExpense}
        userId={authUserId}
      />
    </AppShell>
  );
}

export default App;
