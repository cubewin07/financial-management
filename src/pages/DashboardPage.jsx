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
  const topCategories = getTopCategories(monthlyExpenses, 2);
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

      <section className="space-y-6">
        <BalanceCard
          remaining={summary.remaining}
          effectiveBudget={effectiveBudget}
          spent={summary.totalSpent}
          carryOverAmount={previousCarryOver}
          onClick={onOpenSpendingBreakdown}
        />

        <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
            <div className="space-y-3 xl:col-span-5">
              <p className="text-sm text-[var(--text-secondary)]">Month snapshot</p>
              <h2 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                {formatMonthLabel(currentMonth)}
              </h2>
              <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                Your base budget is {formatCurrency(baseBudget)}. Carry-over adjusts the real working number so you can make decisions from the truth, not just the default.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {!isReviewer ? (
                  <button type="button" onClick={onNavigateAddExpense} className="btn-primary">
                    Add expense
                  </button>
                ) : null}
                <button type="button" onClick={onOpenSpendingBreakdown} className="btn-secondary">
                  View breakdown
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:col-span-4">
              <div className="surface-panel rounded-[24px] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Saved entries</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
                  {expenses.length}
                </p>
              </div>
              <div className="surface-panel rounded-[24px] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Budget remaining</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-[var(--accent-teal)]">
                  {summary.percentSpent < 100 ? `${(100 - summary.percentSpent).toFixed(0)}%` : '0%'}
                </p>
              </div>
              <div className="surface-panel rounded-[24px] p-4 sm:col-span-2">
                <p className="text-sm text-[var(--text-secondary)]">Latest activity</p>
                {latestExpense ? (
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {latestExpense.note || latestExpense.category}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {latestExpense.category} • {formatLongDate(latestExpense.date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatCurrency(latestExpense.amount)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">No expenses recorded yet.</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 xl:col-span-3">
              <p className="text-sm text-[var(--text-secondary)]">Top categories</p>
              {topCategories.length > 0 ? (
                topCategories.map((category) => (
                  <div
                    key={category.name}
                    className="surface-panel flex items-center justify-between rounded-[22px] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-[var(--text-primary)]">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                      {formatCurrency(category.value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="surface-panel rounded-[22px] px-4 py-6 text-sm text-[var(--text-secondary)]">
                  Add expenses to see your top categories.
                </div>
              )}
            </div>
          </div>
        </section>
      </section>

      <SummaryGrid summary={summary} />

      <section className="section-shell section-shell-amber rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Fixed costs</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {formatCurrency(totalMonthlyBurden)} per month
            </h3>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-[var(--accent-amber)] transition-all"
                style={{ width: `${Math.min(subscriptionBudgetShare, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)] lg:text-right">
            Claims <span className="font-semibold tabular-nums text-[var(--accent-amber)]">{subscriptionBudgetShare.toFixed(1)}%</span> of your {formatCurrency(baseBudget)} base budget.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
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
