import { CheckCircle2, ListFilter, ArrowRight } from 'lucide-react';
import { CARD, FOCUS } from './styles';

export default function ReviewQueueCard({
  needsReviewCount = 0,
  onStartReview,
}) {
  const hasUnreviewed = needsReviewCount > 0;

  return (
    <div
      className={`${CARD} p-4 sm:p-5 flex items-center justify-between gap-4 border transition-all ${
        hasUnreviewed
          ? 'border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/80 shadow-[0_4px_20px_rgba(251,191,36,0.12)]'
          : 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-slate-900/80'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
            hasUnreviewed
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
          }`}
        >
          {hasUnreviewed ? <ListFilter size={20} /> : <CheckCircle2 size={20} />}
        </div>

        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white truncate">
            {hasUnreviewed
              ? `${needsReviewCount} expense${needsReviewCount === 1 ? '' : 's'} need review`
              : 'All caught up!'}
          </h3>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {hasUnreviewed
              ? 'Transactions with no reviewer feedback yet'
              : 'Every transaction in this window has been looked at'}
          </p>
        </div>
      </div>

      {hasUnreviewed && (
        <button
          type="button"
          onClick={onStartReview}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 transition-all shadow-[0_2px_12px_rgba(251,191,36,0.3)] shrink-0 cursor-pointer ${FOCUS}`}
        >
          <span>Start review</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
