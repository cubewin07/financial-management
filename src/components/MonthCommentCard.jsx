import { Link } from 'react-router-dom';
import { MessageSquareQuote, ArrowRight } from 'lucide-react';
import { displayName, resolveAuthorName } from '../utils/reviewInsights';

function MonthCommentCard({ comment, monthLabel = '', myReviewers = [] }) {
  if (!comment || !comment.body) {
    return null;
  }

  const authorName = resolveAuthorName(comment, myReviewers, 'Your Reviewer');

  return (
    <section
      aria-label="Monthly advice teaser"
      className="p-4 sm:p-5 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-slate-900/80 backdrop-blur-xl shadow-lg transition-all"
    >
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
            <MessageSquareQuote size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-100 truncate">
              Advice from {authorName}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {monthLabel ? `${monthLabel} Review` : 'Monthly Advice'}
            </p>
          </div>
        </div>

        <Link
          to="/review-hub?view=mine"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-200 transition-colors shrink-0"
        >
          <span>Review Hub</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <p className="mt-3 text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
        {comment.body}
      </p>
    </section>
  );
}

export default MonthCommentCard;
