import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import LoadingState from '../components/shell/LoadingState';
import HubHome from '../components/reviewer/HubHome';
import CandidateReport from '../components/reviewer/CandidateReport';
import { CARD } from '../components/reviewer/styles';

export default function ReviewerHubPage({
  revieweeCandidates = [],
  myReviewers = [],
  onAddReviewer,
  onRemoveReviewer,
  expenses = [],
  expenseComments = {},
  monthComments = {},
  onOpenExpenseComments,
  defaultCurrency = 'NZD',
  accessLoading = false,
  membershipError = '',
  onRetryMembership,
  ownerSeenIso = null,
  onMarkOwnerFeedbackSeen,
  currentUserId,
}) {
  const { candidateId } = useParams();

  const activeCandidate = useMemo(
    () => (candidateId ? revieweeCandidates.find((c) => c.owner_user_id === candidateId) || null : null),
    [candidateId, revieweeCandidates],
  );

  if (accessLoading) {
    return <LoadingState message="Verifying access…" />;
  }

  // 1. Candidate Report View (/review-hub/:candidateId)
  if (candidateId) {
    if (!activeCandidate) {
      return (
        <div className="max-w-xl mx-auto py-12">
          <div className={`${CARD} p-8 text-center space-y-4`}>
            <Users size={32} className="mx-auto text-rose-400" />
            <h2 className="text-lg font-bold text-white">Budget not found</h2>
            <p className="text-xs text-slate-400">This budget isn't shared with you (anymore).</p>
            <Link
              to="/review-hub?view=reviewing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to reviewing</span>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <CandidateReport
        key={activeCandidate.owner_user_id}
        candidate={activeCandidate}
        revieweeCandidates={revieweeCandidates}
        currentUserId={currentUserId}
      />
    );
  }

  // 2. Hub Home View (/review-hub)
  return (
    <HubHome
      revieweeCandidates={revieweeCandidates}
      myReviewers={myReviewers}
      onAddReviewer={onAddReviewer}
      onRemoveReviewer={onRemoveReviewer}
      expenses={expenses}
      expenseComments={expenseComments}
      monthComments={monthComments}
      onOpenExpenseComments={onOpenExpenseComments}
      defaultCurrency={defaultCurrency}
      membershipError={membershipError}
      onRetryMembership={onRetryMembership}
      ownerSeenIso={ownerSeenIso}
      onMarkOwnerFeedbackSeen={onMarkOwnerFeedbackSeen}
      currentUserId={currentUserId}
    />
  );
}
