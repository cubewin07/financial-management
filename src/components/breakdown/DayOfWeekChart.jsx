import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { getDayOfWeekPattern, getWeekOverWeekBreakdown, formatCurrency, formatCompactCurrency } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

export default function DayOfWeekChart({ expenses = [], defaultCurrency = 'NZD', period = 'current-month', customRange = null }) {
  const reduceMotion = useReducedMotion();
  const [selectedDay, setSelectedDay] = useState(null);
  const pattern = getDayOfWeekPattern(expenses);
  const weekOverWeek = getWeekOverWeekBreakdown(expenses);
  const totalPeriodSpend = pattern.reduce((sum, p) => sum + p.total, 0);
  const rawMax = Math.max(...pattern.map((p) => p.total), 0);
  const maxSpend = rawMax > 0 ? rawMax : 1;

  const startDate = customRange?.start ? parseISO(customRange.start) : null;
  const endDate = customRange?.end ? parseISO(customRange.end) : null;
  const isLongCustomRange = period === 'custom' && startDate && endDate && isValid(startDate) && isValid(endDate)
    && differenceInCalendarDays(endDate, startDate) > 31;
  const isMultiMonth = period === 'last-90-days' || period === 'this-year' || period === 'all-time' || isLongCustomRange;

  if (totalPeriodSpend <= 0) {
    return (
      <div className="glass-card p-4 sm:p-6">
        <EmptyState
          title="No time patterns yet"
          description="Record transactions to see day-of-week intensity and weekly cadence."
        />
      </div>
    );
  }

  const activeItem = selectedDay ? pattern.find((p) => p.day === selectedDay) : null;

  return (
    <div className="glass-card p-4 sm:p-6 flex flex-col justify-between space-y-5 sm:space-y-6">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-headline-md font-headline-md text-[var(--on-surface)]">
              Time &amp; Day Patterns
            </h2>
            <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
              Intensity across days of the week &amp; weekly cadence
            </p>
          </div>
          {activeItem && (
            <div className="shrink-0 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] font-bold text-slate-100 tabular-nums">
              {activeItem.day}: {formatCurrency(activeItem.total, defaultCurrency)} ({activeItem.percent}%)
            </div>
          )}
        </div>

        {/* Day-of-Week Distribution Chart */}
        <div className="grid grid-cols-7 gap-1 sm:gap-3 items-end h-36 pt-2">
          {pattern.map((item) => {
            const heightPercent = item.total > 0 ? Math.max(8, Math.round((item.total / maxSpend) * 100)) : 0;
            const isWeekend = item.day === 'Sat' || item.day === 'Sun';
            const isSelected = selectedDay === item.day;

            return (
              <button
                key={item.day}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${item.day}: ${formatCurrency(item.total, defaultCurrency)} (${item.percent}% of spend)`}
                onClick={() => setSelectedDay((prev) => (prev === item.day ? null : item.day))}
                className={`flex flex-col items-center gap-1.5 h-full min-h-[44px] justify-end group relative rounded-lg p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Compact label visible on hover/focus or on touch screens */}
                {item.total > 0 ? (
                  <div
                    title={formatCurrency(item.total, defaultCurrency)}
                    className={`text-[10px] font-bold text-slate-200 transition-opacity truncate max-w-full bg-slate-900/90 px-1 py-0.5 rounded border border-white/10 shrink-0 tabular-nums ${
                      isSelected
                        ? 'opacity-100'
                        : 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100'
                    }`}
                  >
                    {formatCompactCurrency(item.total, defaultCurrency)}
                  </div>
                ) : (
                  <div className="h-4" />
                )}

                <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end h-20 relative">
                  <motion.div
                    initial={reduceMotion ? false : { height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.4 }}
                    className={`w-full rounded-t-lg transition-colors ${
                      isWeekend ? 'bg-purple-500/80 group-hover:bg-purple-400' : 'bg-teal-500/80 group-hover:bg-teal-400'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-white' : isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                  {item.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Week-over-Week / Intra-Month Progress Rows */}
      {weekOverWeek.length > 0 && (
        <div className="pt-3 sm:pt-4 border-t border-white/10 space-y-2">
          <div className="flex flex-col mb-1.5 sm:mb-2">
            <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
              {isMultiMonth ? 'Intra-Month Rhythm (By Week of Month)' : 'Week-over-Week Pace'}
            </span>
            {isMultiMonth && (
              <span className="text-[10px] text-slate-400">
                Aggregate spending grouped by calendar day intervals across selected period
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            {weekOverWeek.map((w, idx) => (
              <div
                key={w.label}
                className={`p-2 sm:p-2.5 rounded-lg bg-white/5 flex items-center justify-between text-xs ${
                  idx === weekOverWeek.length - 1 && weekOverWeek.length % 2 !== 0 ? 'sm:col-span-2' : ''
                }`}
              >
                <span className="text-slate-400 font-medium">{w.label}</span>
                <span className="font-bold text-[var(--on-surface)] tabular-nums">
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

