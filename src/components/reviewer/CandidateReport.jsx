import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import useCandidateReport from '../../hooks/useCandidateReport';
import useComments from '../../hooks/useComments';
import useMediaQuery from '../../hooks/useMediaQuery';
import CommentDrawer from '../CommentDrawer';
import ErrorState from '../shell/ErrorState';
import {
  REVIEWER_PERIOD_OPTIONS,
  getMonthPace,
  isRecurringExpense,
} from '../../utils/finance';
import {
  classifyPace,
  findOutliers,
  groupByDay,
  needsReview,
  getSuggestedNote,
  displayName,
  nextUnreviewed,
} from '../../utils/reviewInsights';

import BudgetChips from './BudgetChips';
import PeriodSegmented from './PeriodSegmented';
import PaceHeroCard from './PaceHeroCard';
import ReportTabs from './ReportTabs';
import WorthALookStrip from './WorthALookStrip';
import CategoryBar from './CategoryBar';
import FilterBar from './FilterBar';
import TransactionList from './TransactionList';
import AdviceComposer from './AdviceComposer';
import AdviceSheet from './AdviceSheet';
import AdviceHistory from './AdviceHistory';
import ReviewQueueCard from './ReviewQueueCard';
import StatusChip from './StatusChip';
import { CARD, ROW, FOCUS } from './styles';

const REVIEWER_QUICK_REPLIES = [
  { text: 'Looks fine', autoSend: true },
  { text: 'Why this one?', autoSend: false },
  { text: 'A bit high — can we trim?', autoSend: false },
  { text: 'Is this a one-off?', autoSend: false },
];

const INITIAL_FILTER = { filterType: 'all', categoryFilter: 'all', searchQuery: '' };

export default function CandidateReport({
  candidate,
  revieweeCandidates = [],
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const period = searchParams.get('period') || 'current-month';
  const rawTab = searchParams.get('tab');
  const activeTab = isDesktop && (!rawTab || rawTab === 'overview')
    ? 'transactions'
    : rawTab || (isDesktop ? 'transactions' : 'overview');

  const updateParam = (key, val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, val);
      return next;
    }, { replace: true });
  };

  const handlePeriodChange = (newPeriod) => {
    updateParam('period', newPeriod);
    setFilterState((prev) => ({ ...prev, categoryFilter: 'all' }));
  };

  const handleTabChange = (newTab) => updateParam('tab', newTab);

  const {
    loading: reportLoading,
    error: reportError,
    refresh: refreshReport,
    defaultCurrency,
    monthlyBudget,
    allExpenses,
    periodExpenses,
    summary,
    categoryData,
  } = useCandidateReport({ candidateOwnerId: candidate?.owner_user_id, period });

  const {
    monthComments,
    getExpenseComments,
    addCommentToExpense,
    getMonthComments,
    saveReviewerMonthComment,
  } = useComments({ userId: candidate?.owner_user_id });

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => format(now, 'yyyy-MM'), [now]);
  const monthName = useMemo(() => format(now, 'MMMM'), [now]);

  const [adviceMonthKey, setAdviceMonthKey] = useState(currentMonthKey);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [adviceSheetOpen, setAdviceSheetOpen] = useState(false);
  const [filterState, setFilterState] = useState(INITIAL_FILTER);

  // Reset transient state when switching candidate
  useEffect(() => {
    setFilterState(INITIAL_FILTER);
    setSelectedExpense(null);
    setAdviceSheetOpen(false);
    setAdviceMonthKey(currentMonthKey);
  }, [candidate?.owner_user_id, currentMonthKey]);

  // Mark candidate seen after 2s on report view
  useEffect(() => {
    const ownerId = candidate?.owner_user_id;
    if (!ownerId) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`reviewerHub:lastSeen:${ownerId}`, new Date().toISOString());
      } catch { /* ignore */ }
    }, 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [candidate?.owner_user_id]);

  const candidateName = displayName(candidate?.owner_email || candidate?.email);

  const currentMonthSpent = useMemo(
    () => (allExpenses || [])
      .filter((e) => e?.date?.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [allExpenses, currentMonthKey],
  );

  const monthPace = useMemo(
    () => getMonthPace({ monthlyBudget, monthSpent: currentMonthSpent, now }),
    [monthlyBudget, currentMonthSpent, now],
  );
  const paceStatus = useMemo(
    () => classifyPace({ monthlyBudget, monthSpent: currentMonthSpent, now }),
    [monthlyBudget, currentMonthSpent, now],
  );
  const outliers = useMemo(
    () => findOutliers(allExpenses, { monthlyBudget, now }),
    [allExpenses, monthlyBudget, now],
  );

  const filteredExpenses = useMemo(() => {
    let list = periodExpenses || [];
    const { filterType, categoryFilter, searchQuery } = filterState;
    if (filterType === 'needs-review') {
      list = list.filter((exp) => needsReview(exp, getExpenseComments(exp.id)));
    } else if (filterType === 'has-comments') {
      list = list.filter((exp) => !isRecurringExpense(exp) && (getExpenseComments(exp.id) || []).length > 0);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((exp) => exp.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((exp) =>
        (exp.note && exp.note.toLowerCase().includes(q)) ||
        (exp.item && exp.item.toLowerCase().includes(q)) ||
        (exp.category && exp.category.toLowerCase().includes(q)) ||
        (exp.payment_method && exp.payment_method.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [periodExpenses, filterState, getExpenseComments]);

  const groupedDays = useMemo(() => groupByDay(filteredExpenses, now), [filteredExpenses, now]);
  const needsReviewCount = useMemo(
    () => (periodExpenses || []).filter((exp) => needsReview(exp, getExpenseComments(exp.id))).length,
    [periodExpenses, getExpenseComments],
  );
  const categories = useMemo(
    () => Array.from(new Set((periodExpenses || []).map((e) => e.category).filter(Boolean))),
    [periodExpenses],
  );

  const topSurge = useMemo(() => outliers.find((o) => o.reason === 'surge'), [outliers]);
  const suggestedNote = useMemo(
    () => getSuggestedNote({ name: candidateName, status: paceStatus, pace: monthPace, topSurge, currency: defaultCurrency }),
    [candidateName, paceStatus, monthPace, topSurge, defaultCurrency],
  );

  const adviceBounds = useMemo(() => {
    const months = [
      currentMonthKey,
      ...(allExpenses || []).map((e) => e?.date?.slice(0, 7)).filter(Boolean),
      ...Object.keys(monthComments || {}),
    ].sort();
    return { minMonthKey: months[0] || currentMonthKey, maxMonthKey: currentMonthKey };
  }, [allExpenses, monthComments, currentMonthKey]);

  const filterByCategory = (cat) => {
    handleTabChange('transactions');
    setFilterState((prev) => ({ ...prev, categoryFilter: cat }));
  };

  const handleStartReview = () => {
    handleTabChange('transactions');
    setFilterState({ filterType: 'needs-review', categoryFilter: 'all', searchQuery: '' });
  };

  // Next unreviewed expense helper for the comment drawer
  const nextExpense = useMemo(() => {
    if (!selectedExpense) return null;
    return nextUnreviewed(periodExpenses || [], selectedExpense.id, getExpenseComments);
  }, [selectedExpense, periodExpenses, getExpenseComments]);

  if (reportError) return <ErrorState message={reportError} onRetry={refreshReport} />;

  const isFirstReportLoad = reportLoading && (allExpenses || []).length === 0;
  const reportTabs = isDesktop
    ? [{ id: 'transactions', label: 'Transactions' }, { id: 'advice', label: 'Advice' }]
    : [{ id: 'overview', label: 'Overview' }, { id: 'transactions', label: 'Transactions' }, { id: 'advice', label: 'Advice' }];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16 lg:pb-0">
      {/* Sleek, Compact Header Row */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3 min-h-[56px]">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/review-hub?view=reviewing"
              aria-label="Back to reviewing budgets"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.05] shrink-0 transition-colors ${FOCUS}`}
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                  {candidateName}
                </h1>
                <StatusChip status={paceStatus} />
                {reportLoading && !isFirstReportLoad && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" title="Refreshing report…" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {candidate.owner_email || 'Shared budget'}
              </p>
            </div>
          </div>

          {/* Action Button: Advise */}
          <button
            type="button"
            onClick={() => setAdviceSheetOpen(true)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl font-bold text-xs bg-cyan-400 text-slate-950 hover:bg-cyan-300 active:scale-95 shadow-[0_4px_16px_rgba(0,238,252,0.25)] transition-all cursor-pointer shrink-0 ${FOCUS}`}
          >
            <MessageSquarePlus size={15} />
            <span>Advise</span>
          </button>
        </div>

        {/* Budget switcher chips (if more than 1 candidate) */}
        {revieweeCandidates.length > 1 && (
          <BudgetChips candidates={revieweeCandidates} activeId={candidate.owner_user_id} />
        )}
      </header>

      {isFirstReportLoad ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading report">
          <div className={`${CARD} p-6 space-y-4 animate-pulse`}>
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="h-6 w-64 rounded bg-white/10" />
            <div className="h-2 w-full rounded-full bg-white/10" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="h-10 rounded bg-white/10" />
              <div className="h-10 rounded bg-white/10" />
              <div className="h-10 rounded bg-white/10" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={`${ROW} h-14 px-4 animate-pulse bg-white/[0.04]`} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Streamlined Monthly Pace Hero Card */}
          <PaceHeroCard
            name={candidateName}
            monthLabel={monthName}
            pace={monthPace}
            status={paceStatus}
            currency={defaultCurrency}
          />

          {/* Sticky Tab Bar (Single sticky bar) */}
          <ReportTabs
            tabs={reportTabs}
            value={activeTab}
            onChange={handleTabChange}
            needsReviewCount={needsReviewCount}
          />

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
            <div
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="min-w-0 space-y-5"
            >
              {!isDesktop && activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Top Call to Action for Reviewers */}
                  <ReviewQueueCard
                    needsReviewCount={needsReviewCount}
                    onStartReview={handleStartReview}
                  />

                  {/* Outlier alerts */}
                  <WorthALookStrip
                    items={outliers}
                    currency={defaultCurrency}
                    onOpenExpense={setSelectedExpense}
                    onOpenCategory={filterByCategory}
                    variant="strip"
                  />

                  {/* Category Spending with Period Filter Right Above */}
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Spending Breakdown
                      </span>
                      <PeriodSegmented value={period} onChange={handlePeriodChange} />
                    </div>

                    <CategoryBar
                      data={categoryData}
                      total={summary.totalSpent}
                      currency={defaultCurrency}
                      onSelect={filterByCategory}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  {/* Period control right above transaction filter */}
                  <div className="flex items-center justify-between gap-3 pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Window
                    </span>
                    <PeriodSegmented value={period} onChange={handlePeriodChange} />
                  </div>

                  <FilterBar
                    state={filterState}
                    onChange={setFilterState}
                    categories={categories}
                    needsReviewCount={needsReviewCount}
                  />

                  <TransactionList
                    groups={groupedDays}
                    getComments={getExpenseComments}
                    onOpenExpense={setSelectedExpense}
                    currency={defaultCurrency}
                    hasFilters={
                      filterState.filterType !== 'all' ||
                      filterState.categoryFilter !== 'all' ||
                      Boolean(filterState.searchQuery.trim())
                    }
                    onClearFilters={() => setFilterState(INITIAL_FILTER)}
                  />
                </div>
              )}

              {activeTab === 'advice' && (
                <div className="space-y-5">
                  {!isDesktop && (
                    <AdviceComposer
                      onSubmit={(text) => saveReviewerMonthComment(adviceMonthKey, text, 'reviewer')}
                      suggestedNote={suggestedNote}
                      name={candidateName}
                    />
                  )}
                  <AdviceHistory
                    notes={getMonthComments(adviceMonthKey)}
                    name={candidateName}
                    monthKey={adviceMonthKey}
                    onMonthChange={setAdviceMonthKey}
                    bounds={adviceBounds}
                  />
                </div>
              )}
            </div>

            {/* Desktop Sticky Rail */}
            <aside className="hidden lg:block lg:sticky lg:top-6 space-y-5">
              <ReviewQueueCard
                needsReviewCount={needsReviewCount}
                onStartReview={handleStartReview}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Window
                  </span>
                  <PeriodSegmented value={period} onChange={handlePeriodChange} />
                </div>
                <WorthALookStrip
                  items={outliers}
                  currency={defaultCurrency}
                  onOpenExpense={setSelectedExpense}
                  onOpenCategory={filterByCategory}
                  variant="list"
                />
              </div>

              <CategoryBar
                data={categoryData}
                total={summary.totalSpent}
                currency={defaultCurrency}
                onSelect={filterByCategory}
              />

              <AdviceComposer
                onSubmit={(text) => saveReviewerMonthComment(currentMonthKey, text, 'reviewer')}
                suggestedNote={suggestedNote}
                name={candidateName}
              />
            </aside>
          </div>
        </>
      )}

      {/* Advice Bottom Sheet Modal */}
      <AdviceSheet
        open={adviceSheetOpen}
        onClose={() => setAdviceSheetOpen(false)}
        onSubmit={(text) => saveReviewerMonthComment(currentMonthKey, text, 'reviewer')}
        suggestedNote={suggestedNote}
        name={candidateName}
      />

      {/* Expense Comment Drawer with One-Tap Quick Replies and Next Unreviewed */}
      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpense ? getExpenseComments(selectedExpense.id) : []}
        onSubmitComment={(body) => selectedExpense && addCommentToExpense(selectedExpense.id, body, 'reviewer')}
        role="reviewer"
        quickReplies={REVIEWER_QUICK_REPLIES}
        hasNextExpense={Boolean(nextExpense)}
        onNextExpense={() => setSelectedExpense(nextExpense)}
      />
    </div>
  );
}
