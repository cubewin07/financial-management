import { useEffect, useMemo, useState } from 'react';
import CommentDrawer from './components/CommentDrawer';
import RoleSwitcher from './components/RoleSwitcher';
import SupabaseAuthExample from './components/SupabaseAuthExample';
import useCarryOver from './hooks/useCarryOver';
import useComments from './hooks/useComments';
import useLocalStorage from './hooks/useLocalStorage';
import useRole from './hooks/useRole';
import useSubscriptions from './hooks/useSubscriptions';
import { supabase } from './lib/supabaseClient';
import AddExpensePage from './pages/AddExpensePage';
import DashboardPage from './pages/DashboardPage';
import SpendingBreakdownPage from './pages/SpendingBreakdownPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import {
  createExpense,
  getCurrentMonthExpenses,
  getFinanceSummary,
  getExpensesForPeriod,
  sortExpenses,
} from './utils/finance';
import { getSubscriptionBudgetShare } from './utils/subscriptions';

const USE_SUPABASE = true;
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
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(!USE_SUPABASE);
  const [supabaseExpenses, setSupabaseExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(USE_SUPABASE);
  const [supabaseError, setSupabaseError] = useState('');
  const [localExpenses, setLocalExpenses] = useLocalStorage('finance-expenses', initialExpenses);
  const { role: storedRole, switchToOwner, switchToReviewer } = useRole({ useSupabase: false });
  const role = USE_SUPABASE ? 'owner' : storedRole;
  const isReviewer = role === 'reviewer';
  const currentUserId = USE_SUPABASE ? session?.user?.id || '' : LOCAL_USER_ID;
  const {
    subscriptions,
    totalMonthlyBurden,
    addSubscription,
    toggleSubscription,
    error: subscriptionsError,
  } = useSubscriptions({
    useSupabase: USE_SUPABASE,
    userId: currentUserId,
  });
  const {
    snapshots,
    effectiveBudget,
    previousCarryOver,
    currentMonth,
    error: carryOverError,
  } = useCarryOver({
    expenses: USE_SUPABASE ? supabaseExpenses : localExpenses,
    baseBudget: MONTHLY_BUDGET,
    userId: USE_SUPABASE ? currentUserId : LOCAL_USER_ID,
    useSupabase: USE_SUPABASE,
  });
  const {
    commentCounts,
    getExpenseComments,
    addCommentToExpense,
    getReviewerMonthComment,
    saveReviewerMonthComment,
    error: commentsError,
  } = useComments({
    userId: USE_SUPABASE ? currentUserId : LOCAL_USER_ID,
    useSupabase: USE_SUPABASE,
  });

  const activeSupabaseError =
    supabaseError || subscriptionsError || carryOverError || commentsError;

  const expenses = USE_SUPABASE ? supabaseExpenses : localExpenses;
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

  useEffect(() => {
    if (!USE_SUPABASE) {
      return;
    }

    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setSupabaseError(error.message);
      }

      setSession(data.session ?? null);
      setAuthChecked(true);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSupabaseError('');
      setSelectedExpense(null);
      setPage('dashboard');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!USE_SUPABASE || !authChecked) {
      return;
    }

    const userId = session?.user?.id;

    if (!userId) {
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
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

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
  }, [authChecked, session?.user?.id]);

  const handleAddExpense = async (expense) => {
    if (USE_SUPABASE) {
      const userId = session?.user?.id;

      if (!userId) {
        setSupabaseError('Sign in before adding an expense.');
        return;
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          amount: Number(expense.amount),
          category: expense.category,
          date: expense.date,
          note: expense.note?.trim() || null,
        })
        .select('id,user_id,amount,category,date,note,created_at')
        .single();

      if (error) {
        setSupabaseError(error.message);
        return;
      }

      const normalizedExpense = {
        ...data,
        amount: Number(data.amount),
        note: data.note || '',
      };

      setSupabaseExpenses((current) => sortExpenses([normalizedExpense, ...current]));
      setSupabaseError('');
      setPage('dashboard');
      return;
    }

    setLocalExpenses((current) => [expense, ...current]);
    setPage('dashboard');
  };

  const canDeleteExpense = (expense) => {
    if (USE_SUPABASE) {
      const userId = session?.user?.id;
      return Boolean(userId && expense?.user_id === userId);
    }

    if (role !== 'owner') {
      return false;
    }

    return !expense?.user_id || expense.user_id === LOCAL_USER_ID;
  };

  const handleDeleteExpense = async (expenseId) => {
    if (USE_SUPABASE) {
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSupabaseError(error.message);
      return;
    }

    setSupabaseError('');
    setSupabaseExpenses([]);
  };

  if (USE_SUPABASE && !authChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] px-4 py-16 text-[var(--text-primary)]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-[var(--text-secondary)]">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (USE_SUPABASE && !session) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] px-4 py-6 text-[var(--text-primary)] sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8">
            <p className="text-sm text-[var(--text-secondary)]">Authentication required</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Sign in to access your financial workspace.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
              Your expenses and comments are now loaded from Supabase with row level security.
            </p>
          </section>

          <SupabaseAuthExample />
        </div>
      </div>
    );
  }

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

          {USE_SUPABASE ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="inline-flex min-h-11 items-center rounded-full border border-[rgba(45,212,191,0.24)] bg-[rgba(45,212,191,0.12)] px-4 py-2 text-sm text-[var(--accent-teal)]">
                {session?.user?.email || 'Signed in'}
              </div>
              <button type="button" onClick={handleSignOut} className="btn-secondary">
                Sign out
              </button>
            </div>
          ) : (
            <RoleSwitcher
              role={role}
              onSwitchToOwner={switchToOwner}
              onSwitchToReviewer={switchToReviewer}
            />
          )}
        </header>

        {activeSupabaseError ? (
          <div className="mb-6 rounded-2xl border border-[rgba(248,113,113,0.26)] bg-[rgba(248,113,113,0.1)] px-4 py-3 text-sm text-[var(--accent-coral)]">
            {activeSupabaseError}
          </div>
        ) : null}

        {expensesLoading ? (
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            Loading your expenses...
          </div>
        ) : null}

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
          <AddExpensePage onAddExpense={handleAddExpense} userId={currentUserId} />
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
