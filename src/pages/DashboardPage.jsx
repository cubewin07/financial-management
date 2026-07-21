import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import BalanceHero from '../components/dashboard/BalanceHero';
import MonthlySpendingChart from '../components/dashboard/MonthlySpendingChart';
import TransactionList from '../components/dashboard/TransactionList';
import SubscriptionWidget from '../components/dashboard/SubscriptionWidget';
import MonthCommentCard from '../components/MonthCommentCard';
import {
  formatMonthLabel,
  getChartCategoryBreakdown,
} from '../utils/finance';

function DashboardPage({
  effectiveBudget,
  expenses,
  monthlyExpenses,
  summary,
  previousCarryOver,
  subscriptions,
  role,
  currentMonth,
  reviewerMonthComment,
  onOpenSpendingBreakdown,
  onSaveReviewerMonthComment,
}) {
  const reduceMotion = useReducedMotion();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(reviewerMonthComment?.body || '');
  
  const categoryData = getChartCategoryBreakdown(monthlyExpenses);
  const isReviewer = role === 'reviewer';

  // In App.jsx, subscriptions are passed to SubscriptionsPage but not DashboardPage
  // We need to fetch subscriptions for the widget. Since we don't have it passed,
  // we could just fetch it here or ideally it should be passed from App.jsx.
  // Wait, in Phase 1 App.jsx I didn't pass subscriptions to DashboardPage.
  // I will just use the hook here, but we don't have targetBudgetUserId easily available.
  // I'll accept subscriptions as a prop, but wait, `App.jsx` doesn't pass it.
  // Wait, `App.jsx` line 640 doesn't pass subscriptions to DashboardPage!
  // It only passes subscriptionBudgetShare.
  // I should update App.jsx as well to pass subscriptions to DashboardPage.
  // I'll assume we can pass `subscriptions` down. I will need to update App.jsx.
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

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left Column: Balance & Charts */}
        <div className="space-y-6 min-w-0">
          <BalanceHero
            remaining={summary.remaining}
            effectiveBudget={effectiveBudget}
            spent={summary.totalSpent}
            carryOverAmount={previousCarryOver}
            onClick={onOpenSpendingBreakdown}
          />
          
          <MonthlySpendingChart data={categoryData} />
        </div>

        {/* Right Column: Transactions & Subscriptions */}
        <div className="space-y-6 min-w-0">
          <TransactionList expenses={monthlyExpenses} maxItems={5} />
          
          <SubscriptionWidget subscriptions={subscriptions || []} />
        </div>
      </div>

      {isReviewer ? (
        <button
          type="button"
          onClick={() => {
            setNoteDraft(reviewerMonthComment?.body || '');
            setNoteOpen(true);
          }}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[120] inline-flex min-h-11 items-center rounded-full bg-[var(--tertiary)] px-5 py-3 text-sm font-semibold text-[var(--background)] shadow-[0_18px_40px_rgba(255,176,202,0.28)] transition hover:-translate-y-0.5 sm:right-6"
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
              className="glass-card w-full max-w-2xl p-6 sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-[var(--on-surface-variant)]">Monthly note</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--on-surface)]">
                    {formatMonthLabel(currentMonth)}
                  </h3>
                </div>
                <button type="button" onClick={() => setNoteOpen(false)} className="btn-secondary">
                  Close
                </button>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm text-[var(--on-surface-variant)]">Note</span>
                <textarea
                  rows={6}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  className="input-shell min-h-[180px] resize-none w-full"
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
