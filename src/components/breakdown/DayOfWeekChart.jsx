import { motion } from 'framer-motion';
import { getDayOfWeekPattern, getWeekdayVsWeekendSplit, getWeekOverWeekBreakdown, formatCurrency } from '../../utils/finance';

export default function DayOfWeekChart({ expenses = [], defaultCurrency = 'NZD' }) {
  const pattern = getDayOfWeekPattern(expenses);
  const split = getWeekdayVsWeekendSplit(expenses);
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

        {/* Weekday vs Weekend Summary Pills */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col">
            <span className="text-[11px] font-medium text-teal-300">Weekday Spend (Mon-Fri)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold text-[var(--on-surface)]">
                {formatCurrency(split.weekdayTotal, defaultCurrency)}
              </span>
              <span className="text-xs font-semibold text-teal-400">{split.weekdayPercent}%</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col">
            <span className="text-[11px] font-medium text-purple-300">Weekend Spend (Sat-Sun)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold text-[var(--on-surface)]">
                {formatCurrency(split.weekendTotal, defaultCurrency)}
              </span>
              <span className="text-xs font-semibold text-purple-400">{split.weekendPercent}%</span>
            </div>
          </div>
        </div>

        {/* Day-of-Week Chart */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end h-32 pt-2">
          {pattern.map((item) => {
            const heightPercent = Math.max(8, Math.round((item.total / maxSpend) * 100));
            const isWeekend = item.day === 'Sat' || item.day === 'Sun';

            return (
              <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                  {item.total > 0 ? formatCurrency(item.total, defaultCurrency) : '$0'}
                </div>
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
            {weekOverWeek.map((w) => (
              <div key={w.label} className="p-2.5 rounded-lg bg-white/5 flex items-center justify-between text-xs">
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

