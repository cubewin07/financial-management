import { formatCurrency } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function TopExpensesRow({ expenses, defaultCurrency = 'NZD' }) {
  if (!expenses || expenses.length === 0) {
    return <EmptyState title="No expenses recorded" description="No top expenses to display for this period." />;
  }

  // Sort expenses descending by amount and take top 5
  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {topExpenses.map((expense, index) => {
        const dateStr = expense.date
          ? new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—';

        return (
          <div
            key={expense.id || index}
            className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-container-high)]/50 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center font-bold text-xs">
                #{index + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--on-surface)]">{expense.title || expense.category || 'Expense'}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                  <span>{expense.category}</span>
                  <span>•</span>
                  <span>{dateStr}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--on-surface)]">
                {formatCurrency(expense.amount, defaultCurrency)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TopExpensesRow;
