import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { formatCurrency, formatLongDate, getCategoryBadgeStyle } from '../utils/finance';

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10H17M7 14H13M20 12C20 16.4183 16.4183 20 12 20C10.4525 20 9.00755 19.5608 7.78219 18.8008L4 20L5.19922 16.2178C4.43923 14.9924 4 13.5475 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 11V16M14 11V16M5 7H19M8 7V5C8 4.44772 8.44772 4 9 4H15C15.5523 4 16 4.44772 16 5V7M18 7V18C18 18.5523 17.5523 19 17 19H7C6.44772 19 6 18.5523 6 18V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpenseList({
  expenses,
  maxItems = 8,
  title = 'Recent expenses',
  subtitle = 'This month',
  emptyMessage = 'No expenses logged for this month yet.',
  commentCounts = {},
  onOpenComments,
  onDeleteExpense,
  canDeleteExpense,
}) {
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState(null);
  const reduceMotion = useReducedMotion();
  const visibleExpenses = expenses.slice(0, maxItems);

  const handleConfirmDelete = () => {
    if (!pendingDeleteExpense || !onDeleteExpense) {
      return;
    }

    onDeleteExpense(pendingDeleteExpense.id);
    setPendingDeleteExpense(null);
  };

  return (
    <section className="section-shell section-shell-blue rounded-[32px] p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {subtitle}
          </h3>
        </div>
        <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-secondary)]">
          {visibleExpenses.length} of {expenses.length} items
        </span>
      </div>

      <div className="space-y-3">
        {visibleExpenses.length > 0 ? (
          visibleExpenses.map((expense) => {
            const badgeStyle = getCategoryBadgeStyle(expense.category);
            const commentCount = commentCounts[expense.id] || 0;
            const showDeleteAction =
              typeof onDeleteExpense === 'function' &&
              (typeof canDeleteExpense === 'function' ? canDeleteExpense(expense) : true);

            return (
              <article
                key={expense.id}
                className="surface-panel flex flex-col gap-4 rounded-[24px] px-4 py-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                      style={badgeStyle}
                    >
                      {expense.category}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatLongDate(expense.date)}
                    </span>
                  </div>

                  <div>
                    <p className="truncate text-base font-medium tracking-tight text-[var(--text-primary)]">
                      {expense.note || expense.category}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {expense.note ? 'Tracked note' : 'No extra note'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-2">
                    {onOpenComments ? (
                      <button
                        type="button"
                        onClick={() => onOpenComments(expense)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[rgba(124,111,224,0.24)] hover:text-[var(--accent-purple)]"
                        aria-label="Open comments"
                      >
                        <CommentIcon />
                        {commentCount > 0 ? (
                          <span className="ml-2 text-xs tabular-nums text-[var(--text-secondary)]">
                            {commentCount}
                          </span>
                        ) : null}
                      </button>
                    ) : null}

                    {showDeleteAction ? (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteExpense(expense)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[rgba(248,113,113,0.32)] bg-[rgba(248,113,113,0.14)] px-3 text-[var(--accent-coral)] transition hover:-translate-y-0.5 hover:border-[rgba(248,113,113,0.48)] hover:bg-[rgba(248,113,113,0.2)]"
                        aria-label="Delete expense"
                      >
                        <DeleteIcon />
                      </button>
                    ) : null}
                  </div>

                  <p className="text-lg font-semibold tracking-tight tabular-nums text-[var(--text-primary)] sm:text-right">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="surface-panel rounded-[24px] px-4 py-10 text-center text-[var(--text-secondary)]">
            {emptyMessage}
          </div>
        )}
      </div>

      <AnimatePresence>
        {pendingDeleteExpense ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            className="fixed inset-0 z-[170] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            onClick={() => setPendingDeleteExpense(null)}
          >
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
              className="section-shell section-shell-coral w-full max-w-xl rounded-[30px] p-6 sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-sm text-[var(--text-secondary)]">Confirm deletion</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Delete this expense?
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {pendingDeleteExpense.note || pendingDeleteExpense.category} • {formatCurrency(pendingDeleteExpense.amount)} on {formatLongDate(pendingDeleteExpense.date)}
              </p>
              <p className="mt-2 text-sm text-[var(--accent-coral)]">This action cannot be undone.</p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDeleteExpense(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(248,113,113,0.36)] bg-[rgba(248,113,113,0.2)] px-5 py-2 text-sm font-semibold text-[var(--accent-coral)] transition hover:-translate-y-0.5 hover:border-[rgba(248,113,113,0.52)] hover:bg-[rgba(248,113,113,0.28)]"
                >
                  Delete expense
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default ExpenseList;
