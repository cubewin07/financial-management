import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import CommentDrawer from './components/CommentDrawer';
import useCarryOver from './hooks/useCarryOver';
import useComments from './hooks/useComments';
import useSubscriptions from './hooks/useSubscriptions';
import { supabase } from './lib/supabaseClient';
import AddExpenseModal from './components/AddExpenseModal';
import DashboardPage from './pages/DashboardPage';
import SpendingBreakdownPage from './pages/SpendingBreakdownPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import AppShell from './components/shell/AppShell';
import { useAuth } from './components/auth/AuthGuard';
import {
  getCurrentMonthExpenses,
  getFinanceSummary,
  getExpensesForPeriod,
  sortExpenses,
} from './utils/finance';
import { getSubscriptionBudgetShare } from './utils/subscriptions';

const MONTHLY_BUDGET = 150;

function normalizeSupabaseRole(role) {
  if (role === 'reviewer' || role === 'viewer') {
    return role;
  }
  return 'owner';
}

function App() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  const [accessLoading, setAccessLoading] = useState(true);
  const [budgetOwnerId, setBudgetOwnerId] = useState('');
  const [supabaseRole, setSupabaseRole] = useState('owner');
  const [supabaseExpenses, setSupabaseExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState('');

  const role = supabaseRole;
  const isOwner = role === 'owner';
  const canManageBudget = isOwner;
  const authUserId = session?.user?.id || '';
  const targetBudgetUserId = budgetOwnerId;

  const {
    subscriptions,
    totalMonthlyBurden,
    addSubscription,
    toggleSubscription,
    removeSubscription,
    error: subscriptionsError,
  } = useSubscriptions({
    userId: targetBudgetUserId,
  });

  const {
    snapshots,
    effectiveBudget,
    previousCarryOver,
    currentMonth,
    error: carryOverError,
  } = useCarryOver({
    expenses: supabaseExpenses,
    baseBudget: MONTHLY_BUDGET - totalMonthlyBurden,
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

  const activeSupabaseError = supabaseError || subscriptionsError || carryOverError || commentsError;

  const expenses = supabaseExpenses;
  const monthlyExpenses = getCurrentMonthExpenses(expenses);
  const summary = getFinanceSummary(monthlyExpenses, effectiveBudget);
  const periodExpenses = getExpensesForPeriod(expenses, selectedPeriod, customRange);
  const periodSummary = getFinanceSummary(
    periodExpenses,
    selectedPeriod === 'current-month' ? effectiveBudget : MONTHLY_BUDGET,
  );
  const selectedExpenseComments = selectedExpense ? getExpenseComments(selectedExpense.id) : [];
  const reviewerMonthComment = getReviewerMonthComment(currentMonth);
  const subscriptionBudgetShare = useMemo(
    () => getSubscriptionBudgetShare(subscriptions, MONTHLY_BUDGET),
    [subscriptions],
  );

  useEffect(() => {
    if (!canManageBudget && addExpenseOpen) {
      setAddExpenseOpen(false);
    }
  }, [canManageBudget, addExpenseOpen]);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setBudgetOwnerId('');
      setSupabaseRole('owner');
      setAccessLoading(false);
      return;
    }

    let isMounted = true;

    const loadMembership = async () => {
      setAccessLoading(true);

      const { data, error } = await supabase
        .from('budget_memberships')
        .select('owner_user_id,role')
        .eq('member_user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setSupabaseError(error.message);
        setBudgetOwnerId(userId);
        setSupabaseRole('owner');
        setAccessLoading(false);
        return;
      }

      if (data) {
        setBudgetOwnerId(data.owner_user_id);
        setSupabaseRole(normalizeSupabaseRole(data.role));
      } else {
        setBudgetOwnerId(userId);
        setSupabaseRole('owner');
      }

      setSupabaseError('');
      setAccessLoading(false);
    };

    loadMembership();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

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
      setSupabaseError('Sign in before adding an expense.');
      return;
    }

    if (!isOwner) {
      setSupabaseError('Only the owner account can add expenses.');
      return;
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
      return;
    }

    const normalizedExpenses = (data || []).map((row) => ({
      ...row,
      amount: Number(row.amount),
      note: row.note || '',
    }));

    setSupabaseExpenses((current) => sortExpenses([...normalizedExpenses, ...current]));
    setSupabaseError('');
    setAddExpenseOpen(false);
  };

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
    <AppShell userEmail={session?.user?.email}>
      {/* Slim action row */}
      {canManageBudget && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setAddExpenseOpen(true)}
            className="btn-primary"
          >
            Add Expense
          </button>
        </div>
      )}

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

      {/* Routes setup mapping to old pages rendered within the new layout */}
      <Routes>
        <Route path="/" element={
          <DashboardPage
            baseBudget={MONTHLY_BUDGET}
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
          />
        } />
        <Route path="/subscriptions" element={
          <SubscriptionsPage
            subscriptions={subscriptions}
            totalMonthlyBurden={totalMonthlyBurden}
            budget={MONTHLY_BUDGET}
            onToggleSubscription={handleToggleSubscription}
            onAddSubscription={handleAddSubscription}
            onRemoveSubscription={handleRemoveSubscription}
            canManage={canManageBudget}
          />
        } />
        <Route path="/breakdown" element={
          <SpendingBreakdownPage
            expenses={periodExpenses}
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
          />
        } />
      </Routes>

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
