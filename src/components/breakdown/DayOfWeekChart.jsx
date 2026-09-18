import { motion } from 'framer-motion';
import { getDayOfWeekPattern, getWeekOverWeekBreakdown, formatCurrency } from '../../utils/finance';

export default function DayOfWeekChart({ expenses = [], defaultCurrency = 'NZD' }) {
  const pattern = getDayOfWeekPattern(expenses);
  const weekOverWeek = getWeekOverWeekBreakdown(expenses);
  const maxSpend = Math.max(...pattern.map((p) => p.total), 1);

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col justify-between space-y-6">
      <div>
        <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
          Time & Day Patterns
        </h2>
        <p className="text-xs text-[var(--on-surface-variant)] mt-0.5 mb-4">
          Intensity across days of the week & week-over-week cadence
        </p>

        {/* Day-of-Week Distribution Chart */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end h-36 pt-2">
          {pattern.map((item) => {
            const heightPercent = Math.max(8, Math.round((item.total / maxSpend) * 100));
            const isWeekend = item.day === 'Sat' || item.day === 'Sun';

            return (
              <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                {/* Tooltip on Hover */}
                {item.total > 0 ? (
                  <div className="text-[10px] font-bold text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full bg-slate-900/90 px-1 py-0.5 rounded border border-white/10 shrink-0">
                    {formatCurrency(item.total, defaultCurrency)}
                  </div>
                ) : (
                  <div className="h-4" />
                )}

                <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end h-20 relative">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.4 }}
                    className={`w-full rounded-t-lg transition-colors ${
                      isWeekend ? 'bg-purple-500/80 group-hover:bg-purple-400' : 'bg-teal-500/80 group-hover:bg-teal-400'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-semibold ${isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week-over-Week Progress Rows */}
      {weekOverWeek.length > 0 && (
        <div className="pt-4 border-t border-white/10 space-y-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)] block mb-2">
            Week-over-Week Pace
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {weekOverWeek.map((w, idx) => (
              <div
                key={w.label}
                className={`p-2.5 rounded-lg bg-white/5 flex items-center justify-between text-xs ${
                  idx === weekOverWeek.length - 1 && weekOverWeek.length % 2 !== 0 ? 'sm:col-span-2' : ''
                }`}
              >
                <span className="text-slate-400 font-medium">{w.label}</span>
                <span className="font-bold text-[var(--on-surface)]">
                  {formatCurrency(w.total, defaultCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

