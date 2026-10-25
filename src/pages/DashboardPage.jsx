import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import BalanceHero from '../components/dashboard/BalanceHero';
import FinancialPaceCard from '../components/dashboard/FinancialPaceCard';
import MonthlySpendingChart from '../components/dashboard/MonthlySpendingChart';
import SavingsGoalWidget from '../components/dashboard/SavingsGoalWidget';
import TransactionList from '../components/dashboard/TransactionList';
import SubscriptionWidget from '../components/dashboard/SubscriptionWidget';
import VerdictBlock from '../components/breakdown/VerdictBlock';
import MonthCommentCard from '../components/MonthCommentCard';
import ReceiptReviewBanner from '../components/expenses/ReceiptReviewBanner';
import ReceiptReviewDrawer from '../components/expenses/ReceiptReviewDrawer';
import LoadingState from '../components/shell/LoadingState';
import ErrorState from '../components/shell/ErrorState';
import {
  formatMonthLabel,
  getChartCategoryBreakdown,
  getDailyBurnRate,
} from '../utils/finance';

function DashboardPage({
  effectiveBudget,
  expenses,
  monthlyExpenses = [],
  summary = { remaining: 0, totalSpent: 0 },
  previousCarryOver = 0,
  subscriptions = [],
  savingsGoals = [],
  currentMonth,
  reviewerMonthComment,
  onOpenSpendingBreakdown,
  onOpenComments,
  commentCounts,
  defaultCurrency,
  receiptQueue = {},
  loading = false,
  error = null,
  onRetry,
}) {
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const categoryData = getChartCategoryBreakdown(monthlyExpenses);

  const {
    readyReceipts = [],
    pendingCount = 0,
    failedReceipts = [],
    totalReadyAmount = 0,
    pendingStorageSize = '0 MB',
    isApproving = false,
    approveReceipt,
    approveAll,
    dismissReceipt,
    dismissFailedReceipt,
  } = receiptQueue;

  const burnRate = useMemo(
    () => getDailyBurnRate(monthlyExpenses, 'current-month'),
    [monthlyExpenses]
  );

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
      className="space-y-4 sm:space-y-6"
    >
      {/* Decoupled Agent Receipt Review Banner */}
      <ReceiptReviewBanner
        readyCount={readyReceipts.length}
        totalAmount={totalReadyAmount}
        pendingCount={pendingCount}
        failedReceipts={failedReceipts}
        pendingStorageSize={pendingStorageSize}
        defaultCurrency={defaultCurrency}
        onApproveAll={approveAll}
        onOpenReview={() => setReviewDrawerOpen(true)}
        onDismissFailed={dismissFailedReceipt}
        isApproving={isApproving}
      />

      {/* Top Priority Decision Verdict for Daily Awareness */}
      <VerdictBlock
        totalSpent={summary.totalSpent}
        effectiveBudget={effectiveBudget}
        burnRate={burnRate}
        period="current-month"
        defaultCurrency={defaultCurrency}
      />

      {reviewerMonthComment ? (
        <MonthCommentCard
          comment={reviewerMonthComment}
          monthLabel={formatMonthLabel(currentMonth)}
        />
      ) : null}

      {/* Row 1: Main Balance Hero + Month Financial Pace & Insights */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-12 items-stretch">
        <div className="xl:col-span-8 min-w-0 flex flex-col">
          <BalanceHero
            remaining={summary.remaining}
            effectiveBudget={effectiveBudget}
            spent={summary.totalSpent}
            carryOverAmount={previousCarryOver}
            onClick={onOpenSpendingBreakdown}
            defaultCurrency={defaultCurrency}
          />
        </div>
        <div className="xl:col-span-4 min-w-0 flex flex-col">
          <FinancialPaceCard
            summary={summary}
            effectiveBudget={effectiveBudget}
            monthlyExpenses={monthlyExpenses}
            subscriptions={subscriptions}
            defaultCurrency={defaultCurrency}
          />
        </div>
      </div>

      {/* Row 2: Category Spending Breakdown + Savings Goals Widget */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-12 items-stretch">
        <div className="xl:col-span-7 min-w-0 flex flex-col">
          <MonthlySpendingChart data={categoryData} defaultCurrency={defaultCurrency} />
        </div>
        <div className="xl:col-span-5 min-w-0 flex flex-col">
          <SavingsGoalWidget goals={savingsGoals} defaultCurrency={defaultCurrency} />
        </div>
      </div>

      {/* Row 3: Recent Activity / Transactions + Active Subscriptions Widget */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-12 items-stretch">
        <div className="xl:col-span-6 min-w-0 flex flex-col">
          <TransactionList
            expenses={monthlyExpenses}
            maxItems={3}
            onOpenComments={onOpenComments}
            commentCounts={commentCounts}
            defaultCurrency={defaultCurrency}
          />
        </div>
        <div className="xl:col-span-6 min-w-0 flex flex-col">
          <SubscriptionWidget subscriptions={subscriptions || []} defaultCurrency={defaultCurrency} />
        </div>
      </div>

      <ReceiptReviewDrawer
        isOpen={reviewDrawerOpen}
        onClose={() => setReviewDrawerOpen(false)}
        receipts={readyReceipts}
        onApproveReceipt={approveReceipt}
        onDismissReceipt={dismissReceipt}
        defaultCurrency={defaultCurrency}
      />
    </motion.main>
  );
}

export default DashboardPage;
