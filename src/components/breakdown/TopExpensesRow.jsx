import { MessageSquare, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function TopExpensesRow({
  expenses,
  onOpenComments,
  commentCounts = {},
  onDeleteExpense,
  canDeleteExpense,
  defaultCurrency = 'NZD',
}) {
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
        const commentCount = commentCounts[expense.id] || 0;
        const userCanDelete = canDeleteExpense ? canDeleteExpense(expense) : false;

        return (
          <div
            key={expense.id || index}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-container-high)]/50 border border-white/5 hover:border-white/10 transition-colors gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                #{index + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--on-surface)] truncate">
                  {expense.note || expense.title || expense.category || 'Expense'}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                  <span>{expense.category}</span>
                  <span>•</span>
                  <span>{dateStr}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {onOpenComments && (
                <button
                  type="button"
                  onClick={() => onOpenComments(expense)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1 text-xs"
                  title="View / add comments"
                >
                  <MessageSquare size={14} />
                  {commentCount > 0 && <span className="font-bold text-purple-300">{commentCount}</span>}
                </button>
              )}

              {userCanDelete && onDeleteExpense && (
                <button
                  type="button"
                  onClick={() => onDeleteExpense(expense.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                  title="Delete expense"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <p className="text-sm font-extrabold text-[var(--on-surface)] min-w-[70px] text-right">
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
