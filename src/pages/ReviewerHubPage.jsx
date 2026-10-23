import { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Users, MessageSquarePlus } from 'lucide-react';
import useCandidateReport from '../hooks/useCandidateReport';
import useComments from '../hooks/useComments';
import useRevieweeOverviews from '../hooks/useRevieweeOverviews';
import useMediaQuery from '../hooks/useMediaQuery';
import CommentDrawer from '../components/CommentDrawer';
import LoadingState from '../components/shell/LoadingState';
import ErrorState from '../components/shell/ErrorState';
import {
  formatCurrency,
  REVIEWER_PERIOD_OPTIONS,
  getMonthPace,
  isRecurringExpense,
} from '../utils/finance';
import {
  classifyPace,
  findOutliers,
  groupByDay,
  needsReview,
  getSuggestedNote,
  displayName,
} from '../utils/reviewInsights';

import CandidateRow from '../components/reviewer/CandidateRow';
import BudgetChips from '../components/reviewer/BudgetChips';
import PeriodSegmented from '../components/reviewer/PeriodSegmented';
import PaceHeroCard from '../components/reviewer/PaceHeroCard';
import ReportTabs from '../components/reviewer/ReportTabs';
import WorthALookStrip from '../components/reviewer/WorthALookStrip';
import CategoryBar from '../components/reviewer/CategoryBar';
import FilterBar from '../components/reviewer/FilterBar';
import TransactionList from '../components/reviewer/TransactionList';
import AdviceComposer from '../components/reviewer/AdviceComposer';
import AdviceSheet from '../components/reviewer/AdviceSheet';
import AdviceHistory from '../components/reviewer/AdviceHistory';
import { CARD, ROW, FOCUS } from '../components/reviewer/styles';

const REVIEWER_QUICK_REPLIES = [
  'Why this one?',
  'Looks fine',
  'A bit high — can we trim?',
  'Is this a one-off?',
];

const INITIAL_FILTER = { filterType: 'all', categoryFilter: 'all', searchQuery: '' };

export default function ReviewerHubPage({
  revieweeCandidates = [],
  accessLoading = false,
  membershipError = '',
  onRetryMembership,
}) {
  const { candidateId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const activeCandidate = useMemo(
    () => (candidateId ? revieweeCandidates.find((c) => c.owner_user_id === candidateId) || null : null),
    [candidateId, revieweeCandidates],
  );

  const { overviews, loading: overviewsLoading } = useRevieweeOverviews(revieweeCandidates, {
    enabled: !candidateId,
  });

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
    burnRate,
    categoryData,
  } = useCandidateReport({ candidateOwnerId: activeCandidate?.owner_user_id, period });

  const {
    monthComments,
    getExpenseComments,
    addCommentToExpense,
    getMonthComments,
    saveReviewerMonthComment,
  } = useComments({ userId: activeCandidate?.owner_user_id });

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => format(now, 'yyyy-MM'), [now]);
  const monthName = useMemo(() => format(now, 'MMMM'), [now]);

  const [adviceMonthKey, setAdviceMonthKey] = useState(currentMonthKey);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [adviceSheetOpen, setAdviceSheetOpen] = useState(false);
  const [filterState, setFilterState] = useState(INITIAL_FILTER);

  // Reset transient state when switching candidates
  useEffect(() => {
    setFilterState(INITIAL_FILTER);
    setSelectedExpense(null);
    setAdviceSheetOpen(false);
    setAdviceMonthKey(currentMonthKey);
  }, [candidateId, currentMonthKey]);

  // Mark candidate seen after 2s on Overview/Transactions or on unmount
  useEffect(() => {
    const ownerId = activeCandidate?.owner_user_id;
    if (!ownerId || (activeTab !== 'overview' && activeTab !== 'transactions')) return;
    const markSeen = () => {
      try {
        localStorage.setItem(`reviewerHub:lastSeen:${ownerId}`, new Date().toISOString());
      } catch { /* ignore */ }
    };
    const timer = setTimeout(markSeen, 2000);
    return () => {
      clearTimeout(timer);
      markSeen();
    };
  }, [activeCandidate?.owner_user_id, activeTab]);

  const candidateName = displayName(activeCandidate?.owner_email || activeCandidate?.email);

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

  const periodLine = useMemo(() => {
    if (period === 'current-month') return null;
    const label = REVIEWER_PERIOD_OPTIONS.find((o) => o.value === period)?.label || period;
    return `${label}: ${formatCurrency(summary.totalSpent, defaultCurrency)} across ${periodExpenses.length} transactions · ${formatCurrency(burnRate.dailyAvg, defaultCurrency)}/day`;
  }, [period, summary.totalSpent, periodExpenses.length, burnRate.dailyAvg, defaultCurrency]);

  const filterByCategory = (cat) => {
    handleTabChange('transactions');
    setFilterState((prev) => ({ ...prev, categoryFilter: cat }));
  };

  if (accessLoading) return <LoadingState message="Verifying access…" />;

  // --- 5.1 HUB LIST VIEW ---
  if (!candidateId) {
    if (membershipError && revieweeCandidates.length === 0) {
      return <ErrorState message={membershipError} onRetry={onRetryMembership} />;
    }
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Shared with you</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Budgets other people have asked you to review.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold tabular-nums bg-white/5 border border-white/5 text-slate-300">
            {revieweeCandidates.length}
          </span>
        </div>

        {revieweeCandidates.length === 0 ? (
          <div className={`${CARD} p-8 text-center space-y-3`}>
            <Users size={32} className="mx-auto text-slate-500 opacity-60" />
            <h3 className="text-base font-bold text-slate-100">Nothing shared with you yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When someone adds your email as a reviewer, their budget shows up here.
            </p>
          </div>
        ) : (
          <>
            <div className="sm:hidden rounded-3xl overflow-hidden border border-white/[0.04] bg-black/40">
              {revieweeCandidates.map((c) => (
                <CandidateRow key={c.owner_user_id} candidate={c} overview={overviews.get(c.owner_user_id)} loading={overviewsLoading} />
              ))}
            </div>
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {revieweeCandidates.map((c) => (
                <CandidateRow key={c.owner_user_id} candidate={c} overview={overviews.get(c.owner_user_id)} loading={overviewsLoading} />
              ))}
            </div>
          </>
        )}

        <div className="pt-2 text-center">
          <Link to="/settings#reviewers" className={`text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors ${FOCUS}`}>
            Manage who can review your budget →
          </Link>
        </div>
      </div>
    );
  }

  // --- 5.7 CANDIDATE NOT FOUND / REVOKED ---
  if (!activeCandidate) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className={`${CARD} p-8 text-center space-y-4`}>
          <Users size={32} className="mx-auto text-rose-400" />
          <h2 className="text-lg font-bold text-white">Budget not found</h2>
          <p className="text-xs text-slate-400">This budget isn't shared with you (anymore).</p>
          <Link to="/review-hub" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={14} />
            <span>Back to Shared with you</span>
          </Link>
        </div>
      </div>
    );
  }

  if (reportError) return <ErrorState message={reportError} onRetry={refreshReport} />;

  const isFirstReportLoad = reportLoading && allExpenses.length === 0;
  const reportTabs = isDesktop
    ? [{ id: 'transactions', label: 'Transactions' }, { id: 'advice', label: 'Advice' }]
    : [{ id: 'overview', label: 'Overview' }, { id: 'transactions', label: 'Transactions' }, { id: 'advice', label: 'Advice' }];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16 lg:pb-0">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/review-hub"
              aria-label="Back to Shared with you"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.05] shrink-0 transition-colors ${FOCUS}`}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{candidateName}</h1>
                {reportLoading && !isFirstReportLoad && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" title="Refreshing report…" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{activeCandidate.owner_email || 'Shared budget'}</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <PeriodSegmented value={period} onChange={handlePeriodChange} />
          </div>
        </div>

        <BudgetChips candidates={revieweeCandidates} activeId={activeCandidate.owner_user_id} />
        <div className="lg:hidden">
          <PeriodSegmented value={period} onChange={handlePeriodChange} />
        </div>
      </header>

      {isFirstReportLoad ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading report">
          <div className={`${CARD} p-6 space-y-4 animate-pulse`}>
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="h-6 w-64 rounded bg-white/10" />
            <div className="h-2.5 w-full rounded-full bg-white/10" />
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
          <PaceHeroCard
            name={candidateName}
            monthLabel={monthName}
            pace={monthPace}
            status={paceStatus}
            currency={defaultCurrency}
            periodLine={periodLine}
          />

          <ReportTabs tabs={reportTabs} value={activeTab} onChange={handleTabChange} needsReviewCount={needsReviewCount} />

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
            <div
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="min-w-0 space-y-5"
            >
              {!isDesktop && activeTab === 'overview' && (
                <div className="space-y-5">
                  <WorthALookStrip items={outliers} currency={defaultCurrency} onOpenExpense={setSelectedExpense} onOpenCategory={filterByCategory} variant="strip" />
                  <CategoryBar data={categoryData} total={summary.totalSpent} currency={defaultCurrency} onSelect={filterByCategory} />
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <FilterBar state={filterState} onChange={setFilterState} categories={categories} needsReviewCount={needsReviewCount} />
                  <TransactionList
                    groups={groupedDays}
                    getComments={getExpenseComments}
                    onOpenExpense={setSelectedExpense}
                    currency={defaultCurrency}
                    hasFilters={filterState.filterType !== 'all' || filterState.categoryFilter !== 'all' || Boolean(filterState.searchQuery.trim())}
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

            <aside className="hidden lg:block lg:sticky lg:top-6 space-y-5">
              <WorthALookStrip items={outliers} currency={defaultCurrency} onOpenExpense={setSelectedExpense} onOpenCategory={filterByCategory} variant="list" />
              <CategoryBar data={categoryData} total={summary.totalSpent} currency={defaultCurrency} onSelect={filterByCategory} />
              <AdviceComposer
                onSubmit={(text) => saveReviewerMonthComment(currentMonthKey, text, 'reviewer')}
                suggestedNote={suggestedNote}
                name={candidateName}
              />
            </aside>
          </div>
        </>
      )}

      {!isDesktop && activeTab !== 'advice' && !adviceSheetOpen && !selectedExpense && (
        <button
          type="button"
          onClick={() => setAdviceSheetOpen(true)}
          aria-label="Leave advice"
          className={`fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 inline-flex items-center gap-2 h-12 px-5 rounded-full font-bold text-xs sm:text-sm bg-[#00eefc] text-slate-950 shadow-[0_8px_24px_rgba(0,238,252,0.35)] active:scale-95 transition-all cursor-pointer ${FOCUS}`}
        >
          <MessageSquarePlus size={16} />
          <span>Leave advice</span>
        </button>
      )}

      <AdviceSheet
        open={adviceSheetOpen}
        onClose={() => setAdviceSheetOpen(false)}
        onSubmit={(text) => saveReviewerMonthComment(currentMonthKey, text, 'reviewer')}
        suggestedNote={suggestedNote}
        name={candidateName}
      />

      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpense ? getExpenseComments(selectedExpense.id) : []}
        onSubmitComment={(body) => selectedExpense && addCommentToExpense(selectedExpense.id, body, 'reviewer')}
        role="reviewer"
        quickReplies={REVIEWER_QUICK_REPLIES}
      />
    </div>
  );
}
