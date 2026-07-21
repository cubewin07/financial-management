import { useState } from 'react';
import BalanceHero from '../components/dashboard/BalanceHero';
import MonthlySpendingChart from '../components/dashboard/MonthlySpendingChart';
import TransactionList from '../components/dashboard/TransactionList';
import SubscriptionWidget from '../components/dashboard/SubscriptionWidget';
import MonthCommentCard from '../components/MonthCommentCard';
import MonthlyNoteModal from '../components/comments/MonthlyNoteModal';
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
  onOpenComments,
  commentCounts,
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const categoryData = getChartCategoryBreakdown(monthlyExpenses);
  const isReviewer = role === 'reviewer';

  return (
    <main className="space-y-6">
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
          />
          
          <MonthlySpendingChart data={categoryData} />
        </div>

        {/* Right Column: Transactions & Subscriptions */}
        <div className="space-y-6 min-w-0">
          <TransactionList 
            expenses={monthlyExpenses} 
            maxItems={5} 
            onOpenComments={onOpenComments}
            commentCounts={commentCounts}
          />
          
          <SubscriptionWidget subscriptions={subscriptions || []} />
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
    </main>
  );
}

export default DashboardPage;
