import { useState, useMemo } from 'react';
import { isValid, parseISO } from 'date-fns';
import { MessageSquare, Trash2, Layers, ListFilter } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';
import { useConfirm } from '../../context/ConfirmationContext';

const roundCurrency = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

function safeFormatShortDate(dateValue) {
  if (!dateValue) return '—';
  const parsed = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(parsed)) return String(dateValue);
  return formatShortDate(dateValue);
}

function TopExpensesRow({
  expenses = [],
  onOpenComments,
  commentCounts = {},
  onDeleteExpense,
  canDeleteExpense,
  defaultCurrency = 'NZD',
}) {
  const confirm = useConfirm();
  const [groupRecurring, setGroupRecurring] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (expense) => {
    if (deletingId) return;
    const label = expense.note || expense.item || expense.title || expense.category || 'Expense';
    const isConfirmed = await confirm({
      title: 'Delete Expense',
      message: `Are you sure you want to delete this expense of ${formatCurrency(expense.amount, defaultCurrency)} (${label})?`,
      description: 'This expense will be permanently deleted.',
      confirmText: 'Delete Expense',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (isConfirmed && onDeleteExpense) {
      setDeletingId(expense.id);
      try {
        await onDeleteExpense(expense.id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const displayList = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    if (!groupRecurring) {
      return [...expenses]
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, 5)
        .map((e) => ({
          ...e,
          count: 1,
          isGrouped: false,
          commentTotal: commentCounts[e.id] || 0,
          originalExpense: e,
          commentTargetExpense: e,
        }));
    }

    // Group expenses by subscription_id or category + normalized explicit description
    const groups = new Map();

    for (const exp of expenses) {
      const explicitTitle = (exp.note || exp.item || exp.title || '').trim();
      const title = explicitTitle || exp.category || 'Expense';
      const groupKey =
        exp.subscription_id !== null && exp.subscription_id !== undefined && exp.subscription_id !== ''
          ? `sub_${exp.subscription_id}`
          : explicitTitle
            ? `${exp.category}_${explicitTitle.toLowerCase()}`
            : `manual_${exp.id}`;
      const expComments = commentCounts[exp.id] || 0;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: exp.id,
          title,
          category: exp.category,
          amount: Number(exp.amount || 0),
          count: 1,
          latestDate: exp.date || '',
          commentTotal: expComments,
          originalExpense: exp,
          commentTargetExpense: exp,
          latestCommentedDate: expComments > 0 ? (exp.date || '') : '',
        });
      } else {
        const existing = groups.get(groupKey);
        existing.amount = roundCurrency(existing.amount + Number(exp.amount || 0));
        existing.count += 1;
        existing.commentTotal += expComments;
        if ((exp.date || '') > existing.latestDate) {
          existing.latestDate = exp.date || '';
          existing.originalExpense = exp;
          existing.id = exp.id;
        }
        if (
          expComments > 0 &&
          ((commentCounts[existing.commentTargetExpense?.id] || 0) === 0 ||
            (exp.date || '') >= existing.latestCommentedDate)
        ) {
          existing.commentTargetExpense = exp;
          existing.latestCommentedDate = exp.date || '';
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
        amount: roundCurrency(g.amount),
        date: g.latestDate,
        count: g.count,
        isGrouped: g.count > 1,
        commentTotal: g.commentTotal,
        originalExpense: g.originalExpense,
        commentTargetExpense: g.commentTargetExpense,
      }));
  }, [expenses, groupRecurring, commentCounts]);

  if (!expenses || expenses.length === 0) {
    return <EmptyState title="No expenses recorded" description="No top expenses to display for this period." />;
  }

  return (
    <div className="space-y-3">
      {/* Grouping Mode Switch */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-[var(--on-surface-variant)] pb-1">
        <span className="text-[11px] text-slate-400">Largest spending items</span>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            aria-pressed={groupRecurring}
            onClick={() => setGroupRecurring(true)}
            className={`min-h-[44px] sm:min-h-[30px] px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              groupRecurring ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={12} />
            <span>Group Recurring</span>
          </button>
          <button
            type="button"
            aria-pressed={!groupRecurring}
            onClick={() => setGroupRecurring(false)}
            className={`min-h-[44px] sm:min-h-[30px] px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              !groupRecurring ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter size={12} />
            <span>All Items</span>
          </button>
        </div>
      </div>

      {displayList.map((expense, index) => {
        const dateStr = safeFormatShortDate(expense.date);
        const commentCount = expense.commentTotal || 0;
        const targetExpense = expense.originalExpense || expense;
        const commentTarget = expense.commentTargetExpense || targetExpense;
        const userCanDelete = canDeleteExpense && targetExpense ? canDeleteExpense(targetExpense) : false;
        const displayTitle = expense.note || expense.item || expense.title || expense.category || 'Expense';

        return (
          <div
            key={expense.id || index}
            className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[var(--surface-container-high)]/50 border border-white/5 hover:border-white/15 transition-all group/item gap-2.5 sm:gap-3"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--primary-container)] text-[var(--on-primary)] flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                #{index + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className="text-sm font-medium text-[var(--on-surface)] truncate">
                    {displayTitle}
                  </p>
                  {expense.isGrouped && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-white/10 text-slate-300 border border-white/10 shrink-0">
                      ×{expense.count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--on-surface-variant)] mt-0.5 truncate">
                  <span>{expense.category}</span>
                  <span>•</span>
                  <span>{dateStr}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5 opacity-100 sm:opacity-80 sm:group-hover/item:opacity-100 transition-opacity">
                {onOpenComments && (
                  <button
                    type="button"
                    onClick={() => onOpenComments(commentTarget)}
                    aria-label={`Comments for ${displayTitle}${commentCount > 0 ? ` (${commentCount})` : ''}`}
                    className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] px-2 sm:px-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center justify-center gap-1 text-xs"
                    title="View / add comments"
                  >
                    <MessageSquare size={14} />
                    {commentCount > 0 && <span className="font-bold text-purple-300 tabular-nums">{commentCount}</span>}
                  </button>
                )}

                {userCanDelete && onDeleteExpense && !expense.isGrouped && (
                  <button
                    type="button"
                    disabled={deletingId === targetExpense.id}
                    onClick={() => handleDelete(targetExpense)}
                    aria-label={`Delete ${displayTitle}`}
                    className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors disabled:opacity-50"
                    title="Delete expense"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <p className="text-sm font-extrabold text-[var(--on-surface)] min-w-[68px] text-right tabular-nums">
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
