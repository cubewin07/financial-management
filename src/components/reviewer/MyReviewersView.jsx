import OwnerFeedback from './OwnerFeedback';
import ReviewerManager from './ReviewerManager';

export default function MyReviewersView({
  myReviewers = [],
  onAddReviewer,
  onRemoveReviewer,
  expenses = [],
  expenseComments = {},
  monthComments = {},
  onOpenExpenseComments,
  defaultCurrency = 'NZD',
}) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Reviewer Feedback Section (shown if reviewers or comments exist) */}
      {(myReviewers.length > 0 || Object.keys(monthComments).length > 0 || Object.keys(expenseComments).length > 0) && (
        <OwnerFeedback
          expenses={expenses}
          expenseComments={expenseComments}
          monthComments={monthComments}
          myReviewers={myReviewers}
          onOpenExpenseComments={onOpenExpenseComments}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* Reviewer Access Management (invite, list, revoke) */}
      <ReviewerManager
        myReviewers={myReviewers}
        onAddReviewer={onAddReviewer}
        onRemoveReviewer={onRemoveReviewer}
      />
    </div>
  );
}
