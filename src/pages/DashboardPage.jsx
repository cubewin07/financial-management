import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import BalanceCard from '../components/BalanceCard';
import CategoryChart from '../components/CategoryChart';
import ExpenseList from '../components/ExpenseList';
import MonthCommentCard from '../components/MonthCommentCard';
import TrendChart from '../components/TrendChart';
import { SummaryGrid } from '../components/SummaryCard';
import {
  formatCurrency,
  formatLongDate,
  formatMonthLabel,
  getChartCategoryBreakdown,
  getDailyTrend,
  getTopCategories,
} from '../utils/finance';

function DashboardPage({
  baseBudget,
  effectiveBudget,
  expenses,
  monthlyExpenses,
  summary,
  totalMonthlyBurden,
  subscriptionBudgetShare,
  previousCarryOver,
  snapshots,
  role,
  currentMonth,
  reviewerMonthComment,
  onNavigateAddExpense,
  onOpenSpendingBreakdown,
  onOpenComments,
  commentCounts,
  onDeleteExpense,
  canDeleteExpense,
  onSaveReviewerMonthComment,
}) {
  const reduceMotion = useReducedMotion();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(reviewerMonthComment?.body || '');
  const categoryData = getChartCategoryBreakdown(monthlyExpenses);
  const trendData = getDailyTrend(monthlyExpenses);
  const latestExpense = monthlyExpenses[0];
  const topCategories = getTopCategories(monthlyExpenses, 4);
  const isOwner = role === 'owner';
  const isReviewer = role === 'reviewer';

  return (
    <main className="space-y-6">
      {reviewerMonthComment ? (
        <MonthCommentCard
          comment={reviewerMonthComment}
          monthLabel={formatMonthLabel(currentMonth)}
          isReviewer={isReviewer}
          onEdit={() => {
            setNoteDraft(reviewerMonthComment.body);
            setNoteOpen(true);
          }}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <BalanceCard
            remaining={summary.remaining}
            effectiveBudget={effectiveBudget}
            spent={summary.totalSpent}
            carryOverAmount={previousCarryOver}
            onClick={onOpenSpendingBreakdown}
          />
          
          <SummaryGrid summary={summary} />

          <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Month snapshot</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{formatMonthLabel(currentMonth)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <button type="button" onClick={onNavigateAddExpense} className="btn-primary h-10 min-h-[40px] px-5 py-1 text-sm">
                    Add expense
                  </button>
                )}
                <button type="button" onClick={onOpenSpendingBreakdown} className="btn-secondary h-10 min-h-[40px] px-5 py-1 text-sm">
                  View breakdown
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="surface-panel rounded-[24px] p-4 flex flex-col justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Budget remaining</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--accent-teal)]">
                  {summary.percentSpent < 100 ? `${(100 - summary.percentSpent).toFixed(0)}%` : '0%'}
                </p>
              </div>
              <div className="surface-panel rounded-[24px] p-4 flex flex-col justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Fixed costs</p>
                <div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(totalMonthlyBurden)}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent-amber)] transition-all"
                      style={{ width: `${Math.min(subscriptionBudgetShare, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="surface-panel rounded-[24px] p-4 flex flex-col justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Saved entries</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {monthlyExpenses.length}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <CategoryChart data={categoryData} />
            <TrendChart data={trendData} />
          </section>

          <ExpenseList
            expenses={monthlyExpenses}
            maxItems={8}
            title="Recent expenses"
            subtitle="This month"
            emptyMessage="No expenses logged for this month yet."
            commentCounts={commentCounts}
            onOpenComments={onOpenComments}
            onDeleteExpense={onDeleteExpense}
            canDeleteExpense={canDeleteExpense}
          />
        </div>

        <div className="space-y-6 min-w-0">
          <section className="section-shell section-shell-blue rounded-[32px] p-6">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-4">Latest activity</h3>
            {latestExpense ? (
              <div className="surface-panel rounded-[20px] p-4">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {latestExpense.note || latestExpense.category}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-[var(--text-secondary)]">{latestExpense.category}</p>
                  <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(latestExpense.amount)}
                  </p>
                </div>
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">{formatLongDate(latestExpense.date)}</p>
              </div>
            ) : (
              <div className="surface-panel rounded-[20px] p-4 text-center">
                <p className="text-sm text-[var(--text-secondary)]">No expenses recorded yet.</p>
              </div>
            )}
          </section>

          <section className="section-shell section-shell-amber rounded-[32px] p-6">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-4">Top categories</h3>
            <div className="space-y-3">
              {topCategories.length > 0 ? (
                topCategories.map((category) => (
                  <div key={category.name} className="surface-panel rounded-[18px] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                      <span className="text-sm text-[var(--text-primary)] truncate max-w-[120px]">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                      {formatCurrency(category.value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="surface-panel rounded-[18px] p-4 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">No data yet.</p>
                </div>
              )}
            </div>
          </section>

          <section className="section-shell section-shell-coral rounded-[32px] p-6">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-4">Carry-over history</h3>
            <div className="space-y-3">
              {snapshots && snapshots.length > 0 ? (
                snapshots.slice(0, 5).map((snapshot) => (
                  <div key={snapshot.id} className="surface-panel rounded-[18px] px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">
                      {formatMonthLabel(snapshot.month).split(' ')[0]}
                    </span>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        snapshot.carry_over > 0
                          ? 'text-[var(--accent-teal)]'
                          : snapshot.carry_over < 0
                            ? 'text-[var(--accent-coral)]'
                            : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {snapshot.carry_over > 0 ? '+' : ''}
                      {formatCurrency(snapshot.carry_over)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="surface-panel rounded-[18px] p-4 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">No history yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {isReviewer ? (
        <button
          type="button"
          onClick={() => {
            setNoteDraft(reviewerMonthComment?.body || '');
            setNoteOpen(true);
          }}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[120] inline-flex min-h-11 items-center rounded-full bg-[var(--accent-amber)] px-5 py-3 text-sm font-semibold text-[#201608] shadow-[0_18px_40px_rgba(251,191,36,0.28)] transition hover:-translate-y-0.5 sm:right-6"
        >
          {reviewerMonthComment ? 'Edit monthly note' : 'Add monthly note'}
        </button>
      ) : null}

      <AnimatePresence>
        {noteOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            className="fixed inset-0 z-[165] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
            onClick={() => setNoteOpen(false)}
          >
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
              className="section-shell section-shell-amber w-full max-w-2xl rounded-[30px] p-6 sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Monthly note from Dad</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {formatMonthLabel(currentMonth)}
                  </h3>
                </div>
                <button type="button" onClick={() => setNoteOpen(false)} className="btn-secondary">
                  Close
                </button>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">Note</span>
                <textarea
                  rows={6}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  className="input-shell min-h-[180px] resize-none"
                  placeholder="Add a monthly note for this budget period"
                />
              </label>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!noteDraft.trim()) {
                      return;
                    }

                    onSaveReviewerMonthComment(noteDraft.trim());
                    setNoteOpen(false);
                  }}
                  className="btn-primary"
                >
                  Save note
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export default DashboardPage;
