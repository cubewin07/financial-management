import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquarePlus, RefreshCw } from 'lucide-react';
import useCandidateReport from '../hooks/useCandidateReport';
import useComments from '../hooks/useComments';
import useRevieweeOverviews from '../hooks/useRevieweeOverviews';
import useMediaQuery from '../hooks/useMediaQuery';
import CommentDrawer from '../components/CommentDrawer';
import LoadingState from '../components/shell/LoadingState';
import ErrorState from '../components/shell/ErrorState';
import { formatCurrency, REVIEWER_PERIOD_OPTIONS, getMonthPace } from '../utils/finance';
import {
  classifyPace,
  findOutliers,
  groupByDay,
  needsReview,
  getSuggestedNote,
  displayName,
} from '../utils/reviewInsights';

import StatusChip from '../components/reviewer/StatusChip';
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
import { CARD, FOCUS } from '../components/reviewer/styles';

const REVIEWER_QUICK_REPLIES = [
  'Why this one?',
  'Looks fine',
  'A bit high — can we trim?',
  'Is this a one-off?',
];

export default function ReviewerHubPage({
  revieweeCandidates = [],
  accessLoading = false,
}) {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 1. Resolve Active Candidate
  const activeCandidate = useMemo(() => {
    if (!candidateId) return null;
    return revieweeCandidates.find((c) => c.owner_user_id === candidateId) || null;
  }, [candidateId, revieweeCandidates]);

  // 2. Hub List Overviews
  const {
    overviews,
    loading: overviewsLoading,
    refresh: refreshOverviews,
  } = useRevieweeOverviews(revieweeCandidates);

  // 3. URL Parameters: period and tab
  const period = searchParams.get('period') || 'current-month';
  const rawTab = searchParams.get('tab');
  const activeTab = useMemo(() => {
    if (isDesktop && (!rawTab || rawTab === 'overview')) {
      return 'transactions';
    }
    return rawTab || (isDesktop ? 'transactions' : 'overview');
  }, [isDesktop, rawTab]);

  const handlePeriodChange = (newPeriod) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('period', newPeriod);
        return next;
      },
      { replace: true },
    );
    setFilterState((prev) => ({ ...prev, categoryFilter: 'all' }));
  };

  const handleTabChange = (newTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', newTab);
        return next;
      },
      { replace: true },
    );
  };

  // 4. Report Data & Comments
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
  } = useCandidateReport({
    candidateOwnerId: activeCandidate?.owner_user_id,
    period,
  });

  const {
    getExpenseComments,
    addCommentToExpense,
    getMonthComments,
    saveReviewerMonthComment,
  } = useComments({ userId: activeCandidate?.owner_user_id });

  // 5. Local UI State
  const [adviceMonthKey, setAdviceMonthKey] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [adviceSheetOpen, setAdviceSheetOpen] = useState(false);
  const [filterState, setFilterState] = useState({
    filterType: 'all',
    categoryFilter: 'all',
    searchQuery: '',
  });

  // Track lastSeen on view
  useEffect(() => {
    if (!activeCandidate?.owner_user_id) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          `reviewerHub:lastSeen:${activeCandidate.owner_user_id}`,
          new Date().toISOString(),
        );
      } catch {
        // ignore storage errors
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeCandidate?.owner_user_id, activeTab]);

  // Candidate Name & Pace
  const candidateName = displayName(activeCandidate?.owner_email || activeCandidate?.email);
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => now.toISOString().slice(0, 7), [now]);
  const monthName = useMemo(
    () => now.toLocaleString('en-US', { month: 'long' }),
    [now],
  );

  const currentMonthSpent = useMemo(() => {
    return (allExpenses || [])
      .filter((e) => e && e.date && e.date.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [allExpenses, currentMonthKey]);

  const monthPace = useMemo(() => {
    return getMonthPace({
      monthlyBudget,
      monthSpent: currentMonthSpent,
      now,
    });
  }, [monthlyBudget, currentMonthSpent, now]);

  const paceStatus = useMemo(() => {
    return classifyPace({
      monthlyBudget,
      monthSpent: currentMonthSpent,
      now,
    });
  }, [monthlyBudget, currentMonthSpent, now]);

  // Outliers
  const outliers = useMemo(() => {
    return findOutliers(allExpenses, {
      monthlyBudget,
      now,
    });
  }, [allExpenses, monthlyBudget, now]);

  // Filtered Transactions
  const filteredExpenses = useMemo(() => {
    let list = periodExpenses || [];
    const { filterType, categoryFilter, searchQuery } = filterState;

    if (filterType === 'needs-review') {
      list = list.filter((exp) => needsReview(exp, getExpenseComments(exp.id)));
    } else if (filterType === 'has-comments') {
      list = list.filter((exp) => (getExpenseComments(exp.id) || []).length > 0);
    }

    if (categoryFilter !== 'all') {
      list = list.filter((exp) => exp.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (exp) =>
          (exp.item && exp.item.toLowerCase().includes(q)) ||
          (exp.category && exp.category.toLowerCase().includes(q)) ||
          (exp.payment_method && exp.payment_method.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [periodExpenses, filterState, getExpenseComments]);

  const groupedDays = useMemo(() => groupByDay(filteredExpenses, now), [filteredExpenses, now]);

  const needsReviewCount = useMemo(() => {
    return (periodExpenses || []).filter((exp) =>
      needsReview(exp, getExpenseComments(exp.id)),
    ).length;
  }, [periodExpenses, getExpenseComments]);

  const categories = useMemo(() => {
    const set = new Set((periodExpenses || []).map((e) => e.category).filter(Boolean));
    return Array.from(set);
  }, [periodExpenses]);

  // Suggested Note
  const topSurge = useMemo(() => outliers.find((o) => o.reason === 'surge'), [outliers]);
  const suggestedNote = useMemo(() => {
    return getSuggestedNote({
      name: candidateName,
      status: paceStatus,
      pace: monthPace,
      topSurge,
      currency: defaultCurrency,
    });
  }, [candidateName, paceStatus, monthPace, topSurge, defaultCurrency]);

  const monthNotes = useMemo(
    () => getMonthComments(adviceMonthKey),
    [getMonthComments, adviceMonthKey],
  );

  // Period line for hero
  const periodLine = useMemo(() => {
    if (period === 'current-month') return null;
    const opt = REVIEWER_PERIOD_OPTIONS.find((o) => o.value === period);
    const label = opt?.label || period;
    return `${label}: ${formatCurrency(summary.totalSpent, defaultCurrency)} across ${periodExpenses.length} transactions · ${formatCurrency(burnRate.dailyAvg, defaultCurrency)}/day`;
  }, [period, summary.totalSpent, periodExpenses.length, burnRate.dailyAvg, defaultCurrency]);

  // Loading & Access States
  if (accessLoading) {
    return <LoadingState message="Verifying reviewer access..." />;
  }

  // --- SCREEN 5.1: HUB LIST VIEW ---
  if (!candidateId) {
    return (
      <main className="p-4 sm:p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Shared with you
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Budgets other people have asked you to review.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/5 text-slate-300">
            {revieweeCandidates.length} Active
          </span>
        </div>

        {revieweeCandidates.length === 0 ? (
          <div className={`${CARD} p-8 text-center space-y-3`}>
            <Users size={32} className="mx-auto text-slate-500 opacity-60" />
            <h3 className="text-base font-bold text-slate-100">
              Nothing shared with you yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When someone adds your email as a reviewer, their budget shows up here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile list: one card with divided rows */}
            <div className="sm:hidden rounded-3xl overflow-hidden border border-white/[0.04] bg-black/40">
              {revieweeCandidates.map((c) => (
                <CandidateRow
                  key={c.owner_user_id}
                  candidate={c}
                  overview={overviews.get(c.owner_user_id)}
                  loading={overviewsLoading}
                />
              ))}
            </div>

            {/* Tablet/Desktop grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {revieweeCandidates.map((c) => (
                <CandidateRow
                  key={c.owner_user_id}
                  candidate={c}
                  overview={overviews.get(c.owner_user_id)}
                  loading={overviewsLoading}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 text-center">
          <Link
            to="/settings#reviewers"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Manage who can review your budget →
          </Link>
        </div>
      </main>
    );
  }

  // --- SCREEN 5.7: CANDIDATE NOT FOUND / REVOKED ---
  if (!activeCandidate) {
    return (
      <main className="p-4 sm:p-6 lg:p-10 max-w-xl mx-auto py-16">
        <div className={`${CARD} p-8 text-center space-y-4`}>
          <Users size={32} className="mx-auto text-rose-400" />
          <h2 className="text-lg font-bold text-white">Budget not found</h2>
          <p className="text-xs text-slate-400">
            This budget isn't shared with you (anymore).
          </p>
          <Link
            to="/review-hub"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Shared with you</span>
          </Link>
        </div>
      </main>
    );
  }

  // --- REPORT ERROR STATE ---
  if (reportError) {
    return <ErrorState message={reportError} onRetry={refreshReport} />;
  }

  // --- SCREEN 5.2 - 5.6: REPORT VIEW ---
  const reportTabs = isDesktop
    ? [
        { id: 'transactions', label: 'Transactions' },
        { id: 'advice', label: 'Advice' },
      ]
    : [
        { id: 'overview', label: 'Overview' },
        { id: 'transactions', label: 'Transactions' },
        { id: 'advice', label: 'Advice' },
      ];

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-5 max-w-6xl mx-auto pb-28 lg:pb-10">
      {/* 5.2 Header: Back, Candidate Title, Budget Chips & Period Control */}
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
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {candidateName}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {activeCandidate.owner_email || 'Shared budget report'}
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <PeriodSegmented value={period} onChange={handlePeriodChange} />
          </div>
        </div>

        {/* Budget Chips (hidden if only 1 candidate) */}
        <BudgetChips
          candidates={revieweeCandidates}
          activeId={activeCandidate.owner_user_id}
        />

        {/* Period Control on Mobile/Tablet */}
        <div className="lg:hidden">
          <PeriodSegmented value={period} onChange={handlePeriodChange} />
        </div>
      </header>

      {/* 5.3 Pace Hero Card */}
      <PaceHeroCard
        name={candidateName}
        monthLabel={monthName}
        pace={monthPace}
        status={paceStatus}
        currency={defaultCurrency}
        periodLine={periodLine}
      />

      {/* 5.3 Report Tabs (Sticky) */}
      <ReportTabs
        tabs={reportTabs}
        value={activeTab}
        onChange={handleTabChange}
        needsReviewCount={needsReviewCount}
      />

      {/* 2-Column Desktop Grid / 1-Column Mobile Layout */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
        {/* Main Column */}
        <div className="min-w-0 space-y-5">
          {/* Mobile Overview Tab */}
          {!isDesktop && activeTab === 'overview' && (
            <div className="space-y-5">
              <WorthALookStrip
                items={outliers}
                currency={defaultCurrency}
                onOpenExpense={(exp) => setSelectedExpense(exp)}
                onOpenCategory={(cat) => {
                  handleTabChange('transactions');
                  setFilterState((prev) => ({ ...prev, categoryFilter: cat }));
                }}
                variant="strip"
              />

              <CategoryBar
                data={categoryData}
                total={summary.totalSpent}
                currency={defaultCurrency}
                onSelect={(cat) => {
                  handleTabChange('transactions');
                  setFilterState((prev) => ({ ...prev, categoryFilter: cat }));
                }}
              />
            </div>
          )}

          {/* Transactions Tab (both Mobile and Desktop) */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <FilterBar
                state={filterState}
                onChange={setFilterState}
                categories={categories}
                needsReviewCount={needsReviewCount}
              />

              <TransactionList
                groups={groupedDays}
                getComments={getExpenseComments}
                onOpenExpense={(exp) => setSelectedExpense(exp)}
                currency={defaultCurrency}
                hasFilters={
                  filterState.filterType !== 'all' ||
                  filterState.categoryFilter !== 'all' ||
                  Boolean(filterState.searchQuery.trim())
                }
                onClearFilters={() =>
                  setFilterState({
                    filterType: 'all',
                    categoryFilter: 'all',
                    searchQuery: '',
                  })
                }
              />
            </div>
          )}

          {/* Advice Tab (History & Composer) */}
          {activeTab === 'advice' && (
            <div className="space-y-5">
              {!isDesktop && (
                <AdviceComposer
                  onSubmit={(text) =>
                    saveReviewerMonthComment(adviceMonthKey, text, 'reviewer')
                  }
                  suggestedNote={suggestedNote}
                  name={candidateName}
                />
              )}

              <AdviceHistory
                notes={monthNotes}
                name={candidateName}
                monthKey={adviceMonthKey}
                onMonthChange={setAdviceMonthKey}
              />
            </div>
          )}
        </div>

        {/* Desktop Right Rail (Overview & Composer) */}
        <aside className="hidden lg:block lg:sticky lg:top-24 space-y-5">
          <WorthALookStrip
            items={outliers}
            currency={defaultCurrency}
            onOpenExpense={(exp) => setSelectedExpense(exp)}
            onOpenCategory={(cat) => {
              handleTabChange('transactions');
              setFilterState((prev) => ({ ...prev, categoryFilter: cat }));
            }}
            variant="list"
          />

          <CategoryBar
            data={categoryData}
            total={summary.totalSpent}
            currency={defaultCurrency}
            onSelect={(cat) => {
              handleTabChange('transactions');
              setFilterState((prev) => ({ ...prev, categoryFilter: cat }));
            }}
          />

          <AdviceComposer
            onSubmit={(text) =>
              saveReviewerMonthComment(adviceMonthKey, text, 'reviewer')
            }
            suggestedNote={suggestedNote}
            name={candidateName}
          />
        </aside>
      </div>

      {/* FAB for Mobile/Tablet (< lg) */}
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

      {/* Advice Bottom Sheet for Mobile */}
      <AdviceSheet
        open={adviceSheetOpen}
        onClose={() => setAdviceSheetOpen(false)}
        onSubmit={(text) =>
          saveReviewerMonthComment(adviceMonthKey, text, 'reviewer')
        }
        suggestedNote={suggestedNote}
        name={candidateName}
      />

      {/* Expense Comment Drawer */}
      <CommentDrawer
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        comments={selectedExpense ? getExpenseComments(selectedExpense.id) : []}
        onSubmitComment={(body) => {
          if (selectedExpense) {
            addCommentToExpense(selectedExpense.id, body, 'reviewer');
          }
        }}
        role="reviewer"
        quickReplies={REVIEWER_QUICK_REPLIES}
      />
    </main>
  );
}
