import { useEffect, useMemo, useState } from 'react';
import CommentDrawer from './components/CommentDrawer';
import RoleSwitcher from './components/RoleSwitcher';
import useCarryOver from './hooks/useCarryOver';
import useComments from './hooks/useComments';
import useLocalStorage from './hooks/useLocalStorage';
import useRole from './hooks/useRole';
import useSubscriptions from './hooks/useSubscriptions';
import AddExpensePage from './pages/AddExpensePage';
import DashboardPage from './pages/DashboardPage';
import SpendingBreakdownPage from './pages/SpendingBreakdownPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import {
  createExpense,
  getCurrentMonthExpenses,
  getFinanceSummary,
  getExpensesForPeriod,
} from './utils/finance';
import { getSubscriptionBudgetShare } from './utils/subscriptions';

const USE_SUPABASE = false;
const MONTHLY_BUDGET = 150;
const LOCAL_USER_ID = 'local-owner';

const initialExpenses = [
  createExpense(
    {
      amount: 12.5,
      category: 'Food',
      date: new Date().toISOString().slice(0, 10),
      note: 'Lunch on campus',
    },
    LOCAL_USER_ID,
  ),
];

function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [localExpenses, setLocalExpenses] = useLocalStorage('finance-expenses', initialExpenses);
  const { role, isReviewer, switchToOwner, switchToReviewer } = useRole({ useSupabase: USE_SUPABASE });
  const { subscriptions, totalMonthlyBurden, addSubscription, toggleSubscription } = useSubscriptions({
    useSupabase: USE_SUPABASE,
    userId: LOCAL_USER_ID,
  });
  const {
    snapshots,
    effectiveBudget,
    previousCarryOver,
    currentMonth,
  } = useCarryOver({
    expenses: localExpenses,
    baseBudget: MONTHLY_BUDGET,
    userId: LOCAL_USER_ID,
    useSupabase: USE_SUPABASE,
  });
  const {
    commentCounts,
    getExpenseComments,
    addCommentToExpense,
    getReviewerMonthComment,
    saveReviewerMonthComment,
  } = useComments({
    userId: LOCAL_USER_ID,
    useSupabase: USE_SUPABASE,
  });

  const expenses = localExpenses;
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
    if (isReviewer && page === 'add-expense') {
      setPage('dashboard');
    }
  }, [isReviewer, page]);

  const handleAddExpense = (expense) => {
    if (USE_SUPABASE) {
      return;
    }

    setLocalExpenses((current) => [expense, ...current]);
    setPage('dashboard');
  };

  const canDeleteExpense = (expense) => {
    if (role !== 'owner') {
      return false;
    }

    return !expense?.user_id || expense.user_id === LOCAL_USER_ID;
  };

  const handleDeleteExpense = (expenseId) => {
    if (USE_SUPABASE) {
      return;
    }

    setLocalExpenses((current) => {
      const targetExpense = current.find((expense) => expense.id === expenseId);

      if (!targetExpense || !canDeleteExpense(targetExpense)) {
        return current;
      }

      return current.filter((expense) => expense.id !== expenseId);
    });

    setSelectedExpense((current) => (current?.id === expenseId ? null : current));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    ...(!isReviewer ? [{ id: 'add-expense', label: 'Add Expense' }] : []),
    { id: 'subscriptions', label: 'Subscriptions' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
        <header className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex min-h-11 items-center rounded-full border border-[rgba(124,111,224,0.22)] bg-[rgba(124,111,224,0.12)] px-4 py-2 text-sm text-[var(--accent-purple)]">
              Personal finance dashboard
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                See your budget with more truth, not more clutter.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                Track variable spending, fixed costs, carry-over momentum, and reviewer feedback in one focused workspace.
              </p>
            </div>

            <nav className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 hide-scrollbar">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    page === item.id
                      ? 'bg-[var(--accent-purple)] text-white shadow-[0_0_12px_rgba(124,111,224,0.4)]'
                      : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[rgba(124,111,224,0.2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <RoleSwitcher
            role={role}
            onSwitchToOwner={switchToOwner}
            onSwitchToReviewer={switchToReviewer}
          />
        </header>

        {page === 'dashboard' ? (
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
            onNavigateAddExpense={() => setPage('add-expense')}
            onOpenSpendingBreakdown={() => setPage('spending-breakdown')}
            onOpenComments={(expense) => setSelectedExpense(expense)}
            commentCounts={commentCounts}
            onDeleteExpense={handleDeleteExpense}
            canDeleteExpense={canDeleteExpense}
            onSaveReviewerMonthComment={(body) =>
              saveReviewerMonthComment(currentMonth, body, 'reviewer')
            }
          />
        ) : null}

        {page === 'add-expense' && !isReviewer ? (
          <AddExpensePage onAddExpense={handleAddExpense} userId={LOCAL_USER_ID} />
        ) : null}

        {page === 'subscriptions' ? (
          <SubscriptionsPage
            subscriptions={subscriptions}
            totalMonthlyBurden={totalMonthlyBurden}
            budget={MONTHLY_BUDGET}
            onToggleSubscription={toggleSubscription}
            onAddSubscription={addSubscription}
          />
        ) : null}

        {page === 'spending-breakdown' ? (
          <SpendingBreakdownPage
            expenses={periodExpenses}
            period={selectedPeriod}
            summary={periodSummary}
            customRange={customRange}
            snapshots={snapshots}
            onBack={() => setPage('dashboard')}
            onPeriodChange={setSelectedPeriod}
            onCustomRangeChange={setCustomRange}
            onOpenComments={(expense) => setSelectedExpense(expense)}
            commentCounts={commentCounts}
            onDeleteExpense={handleDeleteExpense}
            canDeleteExpense={canDeleteExpense}
          />
        ) : null}
      </div>

      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpenseComments}
        role={role}
        onSubmitComment={(body) => {
          if (!selectedExpense) {
            return;
          }

          addCommentToExpense(selectedExpense.id, body, role);
        }}
      />
    </div>
  );
}

export default App;
