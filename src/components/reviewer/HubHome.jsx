import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import useRevieweeOverviews from '../../hooks/useRevieweeOverviews';
import { sortCandidatesByAttention, countUnreadFeedback } from '../../utils/reviewInsights';
import HubViewSwitch from './HubViewSwitch';
import CandidateRow from './CandidateRow';
import MyReviewersView from './MyReviewersView';
import ErrorState from '../shell/ErrorState';
import { CARD } from './styles';

export default function HubHome({
  revieweeCandidates = [],
  myReviewers = [],
  onAddReviewer,
  onRemoveReviewer,
  expenses = [],
  expenseComments = {},
  monthComments = {},
  onOpenExpenseComments,
  defaultCurrency = 'NZD',
  membershipError = '',
  onRetryMembership,
  ownerSeenIso = null,
  onMarkOwnerFeedbackSeen,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active view: 'reviewing' vs 'mine'
  const requestedView = searchParams.get('view');
  const activeView = useMemo(() => {
    if (requestedView === 'mine' || requestedView === 'reviewing') {
      return requestedView;
    }
    return revieweeCandidates.length > 0 ? 'reviewing' : 'mine';
  }, [requestedView, revieweeCandidates.length]);

  const handleViewChange = (newView) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', newView);
      return next;
    }, { replace: true });
  };

  // Fetch overview statuses for candidates (only needed when on reviewing tab)
  const { overviews, loading: overviewsLoading } = useRevieweeOverviews(revieweeCandidates, {
    enabled: activeView === 'reviewing',
  });

  // Sort candidates by attention urgency
  const sortedCandidates = useMemo(() => {
    return sortCandidatesByAttention(revieweeCandidates, overviews);
  }, [revieweeCandidates, overviews]);

  // Unread feedback calculation for "My Reviewers" tab
  const unreadFeedbackCount = useMemo(() => {
    return countUnreadFeedback({
      expenseComments,
      monthComments,
      seenIso: ownerSeenIso,
    });
  }, [expenseComments, monthComments, ownerSeenIso]);

  // Mark owner feedback seen when on 'mine' view
  useEffect(() => {
    if (activeView === 'mine') {
      const timer = setTimeout(() => {
        if (onMarkOwnerFeedbackSeen) {
          onMarkOwnerFeedbackSeen();
        } else {
          try {
            localStorage.setItem('reviewerHub:ownerSeen', new Date().toISOString());
          } catch { /* ignore */ }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeView, onMarkOwnerFeedbackSeen]);

  if (membershipError && revieweeCandidates.length === 0 && myReviewers.length === 0) {
    return <ErrorState message={membershipError} onRetry={onRetryMembership} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top View Switcher */}
      <div className="flex items-center justify-between gap-3">
        <HubViewSwitch
          activeView={activeView}
          onChange={handleViewChange}
          reviewingCount={revieweeCandidates.length}
          myReviewersCount={myReviewers.length}
          hasUnreadFeedback={unreadFeedbackCount > 0}
        />
      </div>

      {/* View 1: Reviewing Candidates */}
      {activeView === 'reviewing' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Budgets Shared With You ({revieweeCandidates.length})
            </span>
          </div>

          {sortedCandidates.length === 0 ? (
            <div className={`${CARD} p-8 text-center space-y-3`}>
              <Users size={32} className="mx-auto text-slate-500 opacity-60" />
              <h3 className="text-base font-bold text-slate-100">Nothing shared with you yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When someone adds your email as a reviewer, their budget shows up here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile dense row list (< sm) */}
              <div className="sm:hidden rounded-3xl overflow-hidden border border-white/[0.04] bg-black/40">
                {sortedCandidates.map((c) => (
                  <CandidateRow
                    key={c.owner_user_id}
                    candidate={c}
                    overview={overviews.get(c.owner_user_id)}
                    loading={overviewsLoading}
                  />
                ))}
              </div>

              {/* Tablet & Desktop spacious cards (>= sm) */}
              <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedCandidates.map((c) => (
                  <CandidateRow
                    key={c.owner_user_id}
                    candidate={c}
                    overview={overviews.get(c.owner_user_id)}
                    loading={overviewsLoading}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* View 2: My Reviewers & Feedback */}
      {activeView === 'mine' && (
        <MyReviewersView
          myReviewers={myReviewers}
          onAddReviewer={onAddReviewer}
          onRemoveReviewer={onRemoveReviewer}
          expenses={expenses}
          expenseComments={expenseComments}
          monthComments={monthComments}
          onOpenExpenseComments={onOpenExpenseComments}
          defaultCurrency={defaultCurrency}
        />
      )}
    </div>
  );
}
