import { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import AddExpensePage from './pages/AddExpensePage';
import SpendingBreakdownPage from './pages/SpendingBreakdownPage';
import useLocalStorage from './hooks/useLocalStorage';
import {
  getCurrentMonthExpenses,
  getExpensesForPeriod,
  getFinanceSummary,
} from './utils/finance';

const MONTHLY_BUDGET = 150;

const initialExpenses = [
  {
    id: 'seed-1',
    amount: 12.5,
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    note: 'Lunch on campus',
  },
];

function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [expenses, setExpenses] = useLocalStorage('finance-expenses', initialExpenses);

  const monthlyExpenses = getCurrentMonthExpenses(expenses);
  const summary = getFinanceSummary(monthlyExpenses, MONTHLY_BUDGET);
  const periodExpenses = getExpensesForPeriod(expenses, selectedPeriod, customRange);
  const periodSummary = getFinanceSummary(periodExpenses, MONTHLY_BUDGET);

  const handleAddExpense = (expense) => {
    setExpenses((current) => [expense, ...current]);
    setPage('dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium text-gray-400">Personal finance dashboard</p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              See your month at a glance.
            </h1>
            <p className="text-sm text-gray-400">
              A focused view of what is left, what is spent, and where your money is going.
            </p>
          </div>

          <nav className="flex flex-wrap gap-3">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'add-expense', label: 'Add Expense' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
                  page === item.id
                    ? 'bg-white text-black shadow-md hover:-translate-y-0.5'
                    : 'premium-panel text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        {page === 'dashboard' ? (
          <DashboardPage
            budget={MONTHLY_BUDGET}
            expenses={expenses}
            monthlyExpenses={monthlyExpenses}
            summary={summary}
            onNavigateAddExpense={() => setPage('add-expense')}
            onOpenSpendingBreakdown={() => setPage('spending-breakdown')}
          />
        ) : null}

        {page === 'add-expense' ? (
          <AddExpensePage onAddExpense={handleAddExpense} />
        ) : null}

        {page === 'spending-breakdown' ? (
          <SpendingBreakdownPage
            expenses={periodExpenses}
            period={selectedPeriod}
            summary={periodSummary}
            customRange={customRange}
            onBack={() => setPage('dashboard')}
            onPeriodChange={setSelectedPeriod}
            onCustomRangeChange={setCustomRange}
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
