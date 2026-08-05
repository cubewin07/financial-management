import { useState, useMemo } from 'react';
import { MessageSquare, Trash2, Layers, ListFilter } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function TopExpensesRow({
  expenses = [],
  onOpenComments,
  commentCounts = {},
  onDeleteExpense,
  canDeleteExpense,
  defaultCurrency = 'NZD',
}) {
  const [groupRecurring, setGroupRecurring] = useState(true);

  const displayList = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    if (!groupRecurring) {
      return [...expenses]
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 5)
        .map((e) => ({ ...e, count: 1, isGrouped: false }));
    }

    // Group expenses by key: note || category
    const groups = new Map();

    for (const exp of expenses) {
      const title = (exp.note || exp.title || exp.category || 'Expense').trim();
      const groupKey = `${exp.category}_${title.toLowerCase()}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: exp.id,
          title,
          category: exp.category,
          amount: Number(exp.amount || 0),
          count: 1,
          latestDate: exp.date,
          originalExpense: exp,
        });
      } else {
        const existing = groups.get(groupKey);
        existing.amount += Number(exp.amount || 0);
        existing.count += 1;
        if (exp.date > existing.latestDate) {
          existing.latestDate = exp.date;
        }
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        note: g.title,
        category: g.category,
        amount: g.amount,
        date: g.latestDate,
        count: g.count,
        isGrouped: g.count > 1,
        originalExpense: g.originalExpense,
      }));
  }, [expenses, groupRecurring]);

  if (!expenses || expenses.length === 0) {
    return <EmptyState title="No expenses recorded" description="No top expenses to display for this period." />;
  }

  return (
    <div className="space-y-3">
      {/* Grouping Mode Switch */}
      <div className="flex items-center justify-between text-xs text-[var(--on-surface-variant)] pb-1">
        <span className="text-[11px] text-slate-400">Largest spending items</span>
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setGroupRecurring(true)}
            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
              groupRecurring ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={11} />
            <span>Group Recurring</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupRecurring(false)}
            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
              !groupRecurring ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter size={11} />
            <span>All Items</span>
          </button>
        </div>
      </div>

      {displayList.map((expense, index) => {
        const dateStr = expense.date
          ? new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—';
        const commentCount = commentCounts[expense.id] || 0;
        const userCanDelete = canDeleteExpense && expense.originalExpense ? canDeleteExpense(expense.originalExpense) : false;

        return (
          <div
            key={expense.id || index}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-container-high)]/50 border border-white/5 hover:border-white/15 transition-all group/item gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                #{index + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--on-surface)] truncate">
                    {expense.note || expense.title || expense.category || 'Expense'}
                  </p>
                  {expense.isGrouped && (
                    <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ×{expense.count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)] mt-0.5">
                  <span>{expense.category}</span>
                  <span>•</span>
                  <span>{dateStr}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Action Buttons (subtly faded until row hover) */}
              <div className="flex items-center gap-1.5 opacity-80 group-hover/item:opacity-100 transition-opacity">
                {onOpenComments && (
                  <button
                    type="button"
                    onClick={() => onOpenComments(expense.originalExpense || expense)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1 text-xs"
                    title="View / add comments"
                  >
                    <MessageSquare size={13} />
                    {commentCount > 0 && <span className="font-bold text-purple-300">{commentCount}</span>}
                  </button>
                )}

                {userCanDelete && onDeleteExpense && !expense.isGrouped && (
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(expense.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                    title="Delete expense"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

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
