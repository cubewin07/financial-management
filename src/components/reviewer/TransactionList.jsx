import { useState, useEffect } from 'react';
import { MessageCircle, Repeat } from 'lucide-react';
import { formatCurrency, getCategoryColor, isRecurringExpense } from '../../utils/finance';
import { ROW, FOCUS } from './styles';

export default function TransactionList({
  groups = [],
  getComments,
  onOpenExpense,
  currency = 'NZD',
  onClearFilters,
  hasFilters = false,
  pageSize = 60,
}) {
  const [visibleLimit, setVisibleLimit] = useState(pageSize);

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [groups, pageSize]);

  // Calculate total items across all groups
  const totalItemCount = groups.reduce((acc, g) => acc + (g.items?.length || 0), 0);

  if (totalItemCount === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-xs sm:text-sm text-slate-400">
          {hasFilters ? 'No transactions match.' : 'No spending in this window.'}
        </p>
        {hasFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className={`px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer ${FOCUS}`}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  // Slice groups and items up to visibleLimit
  let itemsCounted = 0;
  const paginatedGroups = [];

  for (const group of groups) {
    if (itemsCounted >= visibleLimit) break;
    const remainingSlots = visibleLimit - itemsCounted;
    const itemsToTake = group.items.slice(0, remainingSlots);
    itemsCounted += itemsToTake.length;

    paginatedGroups.push({
      ...group,
      items: itemsToTake,
    });
  }

  const hasMore = totalItemCount > visibleLimit;

  return (
    <div className="space-y-6" aria-label="Transaction audit list">
      {paginatedGroups.map((group) => (
        <section
          key={group.date}
          className="space-y-2 [content-visibility:auto] [contain-intrinsic-size:auto_56px]"
          aria-label={`${group.label} spending`}
        >
          {/* Day Header */}
          <div className="flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>{group.label}</span>
            <span className="tabular-nums font-extrabold text-slate-300">
              {formatCurrency(group.total, currency)}
            </span>
          </div>

          {/* Group's transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
            {group.items.map((expense) => {
              const recurring = isRecurringExpense(expense);
              const color = getCategoryColor(expense.category);
              const comments = !recurring && getComments ? getComments(expense.id) : [];
              const commentCount = comments?.length || 0;
              const title = expense.note || expense.item || expense.category || 'Expense';
              const metaText = [expense.category, expense.payment_method]
                .filter(Boolean)
                .join(' · ');

              if (recurring) {
                return (
                  <div
                    key={expense.id}
                    aria-disabled="true"
                    className="min-h-[56px] px-3.5 py-2.5 rounded-2xl bg-[#100d17]/40 border border-white/[0.02] grid grid-cols-[36px_1fr_auto] gap-3 items-center opacity-80 cursor-default"
                  >
                    {/* Category Icon Tile */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs"
                      style={{
                        backgroundColor: `${color}1f`,
                        color,
                      }}
                      aria-hidden="true"
                    >
                      <Repeat size={14} />
                    </div>

                    {/* Title & Meta */}
                    <div className="min-w-0 pr-1">
                      <p className="text-xs sm:text-sm font-semibold truncate text-slate-300">
                        {title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {metaText}
                      </p>
                    </div>

                    {/* Amount & Recurring tag */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs sm:text-sm font-bold tabular-nums text-slate-300">
                        {formatCurrency(expense.amount, currency)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-400 border border-white/5">
                        Recurring
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => onOpenExpense && onOpenExpense(expense)}
                  className={`w-full min-h-[56px] px-3.5 py-2.5 ${ROW} grid grid-cols-[36px_1fr_auto] gap-3 items-center text-left cursor-pointer ${FOCUS}`}
                >
                  {/* Category Icon Tile */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs"
                    style={{
                      backgroundColor: `${color}26`,
                      color,
                    }}
                    aria-hidden="true"
                  >
                    {expense.category?.charAt(0)?.toUpperCase() || '•'}
                  </div>

                  {/* Title & Meta */}
                  <div className="min-w-0 pr-1">
                    <p className="text-xs sm:text-sm font-semibold truncate text-slate-100">
                      {title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {metaText}
                    </p>
                  </div>

                  {/* Amount & Comment count */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-xs sm:text-sm font-black tabular-nums text-slate-100">
                      {formatCurrency(expense.amount, currency)}
                    </span>
                    {commentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                        <MessageCircle size={10} />
                        <span>{commentCount}</span>
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Show More Pagination */}
      {hasMore && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleLimit((curr) => curr + pageSize)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer ${FOCUS}`}
          >
            Show {Math.min(pageSize, totalItemCount - visibleLimit)} more (
            {totalItemCount - visibleLimit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
