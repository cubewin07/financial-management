import BalanceCard from '../components/BalanceCard';
import CategoryChart from '../components/CategoryChart';
import ExpenseList from '../components/ExpenseList';
import TrendChart from '../components/TrendChart';
import { SummaryGrid } from '../components/SummaryCard';
import {
  formatCurrency,
  formatLongDate,
  getCategoryBreakdown,
  getDailyTrend,
  getMonthLabel,
  getTopCategories,
} from '../utils/finance';

function DashboardPage({
  budget,
  expenses,
  monthlyExpenses,
  summary,
  onNavigateAddExpense,
  onOpenSpendingBreakdown,
}) {
  const categoryData = getCategoryBreakdown(monthlyExpenses);
  const trendData = getDailyTrend(monthlyExpenses);
  const latestExpense = monthlyExpenses[0];
  const topCategories = getTopCategories(monthlyExpenses, 2);

  return (
    <main className="space-y-6">
      <section className="space-y-6">
        <BalanceCard
          remaining={summary.remaining}
          budget={budget}
          spent={summary.totalSpent}
          onClick={onOpenSpendingBreakdown}
        />

        <section className="premium-card rounded-2xl p-6 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-2 lg:col-span-4">
              <p className="text-sm text-gray-400">Month snapshot</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                {getMonthLabel()}
              </h2>
              <p className="max-w-md text-sm text-gray-400">
                Your budget is fixed at{' '}
                {budget.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} for the
                month. Tap into the balance card to inspect the full breakdown.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={onNavigateAddExpense}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-md transition duration-200 hover:-translate-y-0.5"
                >
                  Add expense
                </button>
                <button
                  type="button"
                  onClick={onOpenSpendingBreakdown}
                  className="premium-panel rounded-lg px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
                >
                  View breakdown
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-4">
              <div className="premium-panel rounded-2xl p-4">
                <p className="text-sm text-gray-400">Saved entries</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-white">
                  {expenses.length}
                </p>
              </div>
              <div className="premium-panel rounded-2xl p-4">
                <p className="text-sm text-gray-400">Budget remaining</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-green-400">
                  {summary.percentSpent < 100 ? `${(100 - summary.percentSpent).toFixed(0)}%` : '0%'}
                </p>
              </div>
              <div className="premium-panel rounded-2xl p-4 sm:col-span-2">
                <p className="text-sm text-gray-400">Latest activity</p>
                {latestExpense ? (
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {latestExpense.note || latestExpense.category}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {latestExpense.category} • {formatLongDate(latestExpense.date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(latestExpense.amount)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">No expenses recorded yet.</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 lg:col-span-4">
              <p className="text-sm text-gray-400">Top categories</p>
              {topCategories.length > 0 ? (
                topCategories.map((category) => (
                  <div
                    key={category.name}
                    className="premium-panel flex items-center justify-between rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-white">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(category.value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="premium-panel rounded-2xl px-4 py-6 text-sm text-gray-400">
                  Add expenses to see your top categories.
                </div>
              )}
            </div>
          </div>
        </section>
      </section>

      <SummaryGrid summary={summary} />

      <section className="grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryData} />
        <TrendChart data={trendData} />
      </section>

      <ExpenseList
        expenses={monthlyExpenses}
        maxItems={8}
        title="Recent expenses"
        subtitle="This month"
        emptyMessage="No expenses logged for this month yet."
      />
    </main>
  );
}

export default DashboardPage;
