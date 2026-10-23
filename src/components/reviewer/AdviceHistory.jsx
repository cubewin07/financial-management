import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { CARD, ROW, FOCUS } from './styles';

export default function AdviceHistory({
  notes = [],
  name = 'Candidate',
  monthKey = '',
  onMonthChange,
  bounds = {},
}) {
  const currentMonthDate = monthKey ? parseISO(`${monthKey}-01`) : new Date();
  const monthTitle = format(currentMonthDate, 'MMMM yyyy');

  const maxMonthKey = bounds.maxMonthKey || format(new Date(), 'yyyy-MM');
  const minMonthKey = bounds.minMonthKey || '2020-01';

  const canGoNext = monthKey < maxMonthKey;
  const canGoPrev = monthKey > minMonthKey;
  const sortedNotes = [...(notes || [])].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );

  const handlePrev = () => {
    if (!canGoPrev || !onMonthChange) return;
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(format(d, 'yyyy-MM'));
  };

  const handleNext = () => {
    if (!canGoNext || !onMonthChange) return;
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(format(d, 'yyyy-MM'));
  };

  return (
    <section className={`${CARD} p-5 sm:p-6 space-y-4`} aria-label="Monthly Advice History">
      {/* Month Switcher Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Monthly Advice
        </h3>

        <div className="flex items-center gap-1 bg-[#100d17]/80 rounded-2xl p-1 border border-white/[0.05]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${FOCUS}`}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-bold text-slate-200 px-2 min-w-[110px] text-center select-none">
            {monthTitle}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Next month"
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer ${FOCUS}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* History notes list (newest first) */}
      <div className="space-y-3 pt-1">
        {sortedNotes.length > 0 ? (
          sortedNotes.map((note) => {
            const isReviewer = note.author_role === 'reviewer';
            const authorTitle = isReviewer ? 'You' : name;
            let timeAgo = '';
            try {
              timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });
            } catch (e) {
              timeAgo = note.created_at || '';
            }

            return (
              <div
                key={note.id}
                className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  isReviewer
                    ? 'bg-[#9f78ff]/10 border-[#9f78ff]/25 text-slate-100'
                    : 'bg-white/[0.04] border-white/10 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${isReviewer ? 'text-purple-300' : 'text-cyan-300'}`}>
                    {authorTitle}
                  </span>
                  <span className="text-slate-400">{timeAgo}</span>
                </div>
                <p className="whitespace-pre-wrap">{note.body}</p>
              </div>
            );
          })
        ) : (
          <div className={`${ROW} p-5 text-center text-xs text-slate-400 space-y-1`}>
            <MessageSquare size={20} className="mx-auto text-slate-500 opacity-60 mb-2" />
            <p>No advice for {monthTitle} yet.</p>
            <p className="text-[11px] text-slate-500">
              Notes leave feedback on {name}'s dashboard.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
