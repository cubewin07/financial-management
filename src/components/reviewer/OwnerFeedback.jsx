import { useState, useMemo } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  MessageSquareQuote,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, getCategoryColor } from '../../utils/finance';
import { getReviewerFeedback, resolveAuthorName } from '../../utils/reviewInsights';
import { CARD, ROW, FOCUS } from './styles';

export default function OwnerFeedback({
  expenses = [],
  expenseComments = {},
  monthComments = {},
  myReviewers = [],
  onOpenExpenseComments,
  defaultCurrency = 'NZD',
}) {
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => format(now, 'yyyy-MM'), [now]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  const selectedMonthDate = useMemo(
    () => (selectedMonthKey ? parseISO(`${selectedMonthKey}-01`) : now),
    [selectedMonthKey, now],
  );
  const monthTitle = useMemo(() => format(selectedMonthDate, 'MMMM yyyy'), [selectedMonthDate]);

  // Extract all months that have notes
  const availableMonths = useMemo(() => {
    const set = new Set([currentMonthKey, ...Object.keys(monthComments || {})]);
    return Array.from(set).sort();
  }, [currentMonthKey, monthComments]);

  const canGoPrev = availableMonths.length > 0 && selectedMonthKey > availableMonths[0];
  const canGoNext = selectedMonthKey < currentMonthKey;

  const handlePrevMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedMonthKey(format(d, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const d = new Date(selectedMonthDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedMonthKey(format(d, 'yyyy-MM'));
  };

  // Get reviewer monthly notes for selected month
  const activeMonthNotes = useMemo(() => {
    const notes = monthComments?.[selectedMonthKey] || [];
    return notes
      .filter((n) => n && n.author_role === 'reviewer')
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [monthComments, selectedMonthKey]);

  // Expenses with reviewer feedback
  const feedbackExpenses = useMemo(() => {
    return getReviewerFeedback(expenses, expenseComments, myReviewers);
  }, [expenses, expenseComments, myReviewers]);

  return (
    <div className="space-y-6">
      {/* Monthly Advice Card */}
      <section className={`${CARD} p-5 sm:p-6 space-y-4`} aria-label="Monthly advice from reviewers">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <MessageSquareQuote size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Monthly Advice & Guidance
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Feedback shared on your monthly spending pace
              </p>
            </div>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1 bg-[#100d17]/80 rounded-xl p-0.5 border border-white/[0.05] shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${FOCUS}`}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[11px] font-bold text-slate-200 px-1.5 select-none">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={!canGoNext}
              aria-label="Next month"
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${FOCUS}`}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {activeMonthNotes.length > 0 ? (
          <div className="space-y-2.5">
            {activeMonthNotes.map((note) => {
              const reviewerTitle = resolveAuthorName(note, myReviewers, 'Reviewer');
              let timeAgo = '';
              try {
                timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });
              } catch {
                timeAgo = note.created_at || '';
              }

              return (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-[#9f78ff]/10 border border-[#9f78ff]/25 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300">
                      From {reviewerTitle}
                    </span>
                    <span className="text-[11px] text-slate-400">{timeAgo}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {note.body}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`${ROW} p-5 text-center text-xs text-slate-400 space-y-1`}>
            <p>No reviewer notes for {monthTitle}.</p>
            <p className="text-[11px] text-slate-500">
              When your reviewers leave monthly pacing advice, it appears here.
            </p>
          </div>
        )}
      </section>

      {/* Expenses with Comments Section */}
      <section className="space-y-3" aria-label="Reviewer comments on individual transactions">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
              Comments on Your Expenses
            </h3>
            <p className="text-[11px] text-slate-400">
              Transactions your reviewers have flagged or asked about
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/5 text-slate-300">
            {feedbackExpenses.length}
          </span>
        </div>

        {feedbackExpenses.length > 0 ? (
          <div className="space-y-2">
            {feedbackExpenses.map(({ expense, latestComment, reviewerName, commentCount }) => {
              const catColor = getCategoryColor(expense.category || 'Other');
              let timeAgo = '';
              try {
                timeAgo = formatDistanceToNow(new Date(latestComment.created_at), { addSuffix: true });
              } catch {
                timeAgo = '';
              }

              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => onOpenExpenseComments && onOpenExpenseComments(expense)}
                  className={`w-full text-left ${ROW} p-3 sm:p-4 block hover:border-cyan-400/30 transition-all cursor-pointer group ${FOCUS}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${catColor}20`, color: catColor }}
                      >
                        <Tag size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs sm:text-sm font-bold text-white truncate">
                          {expense.item || expense.note || 'Expense'}
                        </span>
                        <span className="block text-[11px] text-slate-400 truncate">
                          {expense.category || 'General'} · {expense.date}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-xs sm:text-sm font-bold text-white tabular-nums">
                        {formatCurrency(expense.amount, defaultCurrency)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
                        <MessageCircle size={12} />
                        <span>{commentCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Reviewer Comment Bubble Preview */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-purple-300 block truncate">
                        {reviewerName} · {timeAgo}
                      </span>
                      <p className="text-xs text-slate-200 truncate mt-0.5">
                        "{latestComment.body}"
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-slate-500 group-hover:text-cyan-300 transition-colors shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`${ROW} p-6 text-center text-xs text-slate-400 space-y-1`}>
            <p>No reviewer comments on your transactions yet.</p>
            <p className="text-[11px] text-slate-500">
              When reviewers leave feedback or questions on specific purchases, they'll show up here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
