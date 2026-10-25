import { CARD, STATUS } from './styles';
import StatusChip from './StatusChip';
import { formatCurrency } from '../../utils/finance';

export default function PaceHeroCard({
  name = '',
  monthLabel = '',
  pace = {},
  status = 'on-track',
  currency = 'NZD',
  periodLine = null,
}) {
  const budget = Number(pace?.monthlyBudget ?? pace?.budget ?? 0);
  const remaining = Number(pace?.remaining ?? 0);
  const spent = Number(
    pace?.monthSpent ??
      (budget > 0 ? budget - remaining : Number(pace?.dailyAvg ?? 0) * Number(pace?.currentDay ?? 1)),
  );
  const projectedEnd = Number(pace?.projectedEndSpend ?? 0);
  const spentPct = pace?.budgetSpentPercent;
  const elapsedPct = pace?.monthElapsedPercent ?? 0;

  const statusMeta = STATUS[status] || STATUS.none;

  // Build verdict headline
  let verdictPrefix = '';
  let verdictSuffix = '';
  let subtext = null;

  if (status === 'on-track') {
    const under = Math.max(0, budget - projectedEnd);
    verdictPrefix = 'On track';
    verdictSuffix = ` — ${formatCurrency(under, currency)} under target`;
  } else if (status === 'watch') {
    const over = Math.max(0, projectedEnd - budget);
    verdictPrefix = 'Watch';
    verdictSuffix = ` — projected ${formatCurrency(over, currency)} over target`;
  } else if (status === 'over') {
    if (remaining < 0) {
      verdictPrefix = 'Over budget';
      verdictSuffix = ` — ${formatCurrency(Math.abs(remaining), currency)} past the limit`;
    } else {
      const over = Math.max(0, projectedEnd - budget);
      verdictPrefix = 'Over pace';
      verdictSuffix = ` — projected ${formatCurrency(over, currency)} over target`;
    }
  } else {
    verdictPrefix = 'No monthly budget set';
    verdictSuffix = '';
    subtext = 'Showing spending only.';
  }

  const safeSpentPct = Math.min(100, Math.max(0, spentPct ?? 0));
  const safeElapsedPct = Math.min(100, Math.max(0, elapsedPct));

  return (
    <section className={`${CARD} p-5 sm:p-6 space-y-4`} aria-label="Monthly Pace Summary">
      {/* Header Label + Status Chip */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400 truncate">
          {name ? `${name.toUpperCase()} · ` : ''}
          {monthLabel.toUpperCase()}
        </div>
        <StatusChip status={status} />
      </div>

      {/* Verdict text */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
          <span className={statusMeta.text}>{verdictPrefix}</span>
          <span>{verdictSuffix}</span>
        </h2>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>

      {/* Progress bar with month-elapsed tick */}
      {status !== 'none' && (
        <div className="py-1">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeSpentPct}
            aria-label={`${spentPct ?? 0}% of budget spent, ${safeElapsedPct}% of the month elapsed`}
            className="relative w-full h-2 rounded-full bg-white/[0.08] overflow-hidden"
          >
            {/* Filled budget bar */}
            <div
              className={`h-full rounded-full transition-all duration-300 ${statusMeta.bar}`}
              style={{ width: `${safeSpentPct}%` }}
            />
            {/* Month-elapsed tick mark */}
            <div
              aria-hidden="true"
              className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none"
              style={{ left: `${safeElapsedPct}%` }}
              title={`Day ${pace?.currentDay || ''} (${safeElapsedPct}% of month)`}
            />
          </div>
        </div>
      )}

      {/* Stats row: 3 columns on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
        <div className="space-y-0.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Spent
          </span>
          <span className="block text-lg sm:text-xl font-black tabular-nums text-slate-100">
            {formatCurrency(spent, currency)}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Left
          </span>
          <span
            className={`block text-lg sm:text-xl font-black tabular-nums ${
              status === 'none'
                ? 'text-slate-400'
                : remaining < 0
                  ? 'text-rose-400'
                  : 'text-slate-100'
            }`}
          >
            {status === 'none' ? '—' : formatCurrency(remaining, currency)}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Per day
          </span>
          <span className="block text-lg sm:text-xl font-black tabular-nums text-slate-100">
            {formatCurrency(pace?.dailyAvg ?? 0, currency)}
          </span>
        </div>

        <div className="hidden lg:block space-y-0.5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Safe / day
          </span>
          <span className="block text-lg sm:text-xl font-black tabular-nums text-slate-100">
            {status === 'none' ? '—' : formatCurrency(pace?.safeDailyAllowance ?? 0, currency)}
          </span>
        </div>
      </div>

      {/* Optional period line */}
      {periodLine && (
        <div className="pt-3 border-t border-white/[0.04] text-xs text-slate-400">
          {periodLine}
        </div>
      )}
    </section>
  );
}
