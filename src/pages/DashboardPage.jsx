import { useState } from 'react';
import { motion } from 'framer-motion';
import BalanceHero from '../components/dashboard/BalanceHero';
import MonthlySpendingChart from '../components/dashboard/MonthlySpendingChart';
import TransactionList from '../components/dashboard/TransactionList';
import SubscriptionWidget from '../components/dashboard/SubscriptionWidget';
import MonthCommentCard from '../components/MonthCommentCard';
import MonthlyNoteModal from '../components/comments/MonthlyNoteModal';
import LoadingState from '../components/shell/LoadingState';
import ErrorState from '../components/shell/ErrorState';
import {
  formatMonthLabel,
  getChartCategoryBreakdown,
} from '../utils/finance';

function DashboardPage({
  effectiveBudget,
  expenses,
  monthlyExpenses = [],
  summary = { remaining: 0, totalSpent: 0 },
  previousCarryOver = 0,
  subscriptions = [],
  role,
  currentMonth,
  reviewerMonthComment,
  onOpenSpendingBreakdown,
  onSaveReviewerMonthComment,
  onOpenComments,
  commentCounts,
  defaultCurrency,
  loading = false,
  error = null,
  onRetry,
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const categoryData = getChartCategoryBreakdown(monthlyExpenses);
  const isReviewer = role === 'reviewer';

  if (loading) {
    return <LoadingState message="Loading your dashboard & balance summary..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard Error" message={error} onRetry={onRetry} />;
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {reviewerMonthComment ? (
        <MonthCommentCard
          comment={reviewerMonthComment}
          monthLabel={formatMonthLabel(currentMonth)}
          isReviewer={isReviewer}
          onEdit={() => setNoteOpen(true)}
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
            defaultCurrency={defaultCurrency}
          />
          
          <MonthlySpendingChart data={categoryData} defaultCurrency={defaultCurrency} />
        </div>

        {/* Right Column: Transactions & Subscriptions */}
        <div className="space-y-6 min-w-0">
          <TransactionList 
            expenses={monthlyExpenses} 
            maxItems={5} 
            onOpenComments={onOpenComments}
            commentCounts={commentCounts}
            defaultCurrency={defaultCurrency}
          />
          
          <SubscriptionWidget subscriptions={subscriptions || []} defaultCurrency={defaultCurrency} />
        </div>
      </div>

      {isReviewer ? (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[120] inline-flex min-h-11 items-center rounded-full bg-[var(--tertiary)] px-5 py-3 text-sm font-semibold text-[var(--background)] shadow-[0_18px_40px_rgba(255,176,202,0.28)] transition hover:-translate-y-0.5 sm:right-6"
        >
          {reviewerMonthComment ? 'Edit monthly note' : 'Add monthly note'}
        </button>
      ) : null}

      <MonthlyNoteModal
        open={noteOpen}
        monthLabel={formatMonthLabel(currentMonth)}
        initialBody={reviewerMonthComment?.body || ''}
        onSave={onSaveReviewerMonthComment}
        onClose={() => setNoteOpen(false)}
      />
    </motion.main>
  );
}

export default DashboardPage;
