import { motion, useReducedMotion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { getDayOfWeekPattern, getWeekdayVsWeekendSplit, getWeekOverWeekBreakdown, formatCurrency } from '../../utils/finance';

export default function TimePatternVerdict({ expenses = [], defaultCurrency = 'NZD', range = null }) {
  const reduceMotion = useReducedMotion();
  const pattern = getDayOfWeekPattern(expenses);
  const split = getWeekdayVsWeekendSplit(expenses, range);
  const weekOverWeek = getWeekOverWeekBreakdown(expenses);

  const totalSpent = pattern.reduce((sum, p) => sum + p.total, 0);

  // Find peak day of week
  const sortedDays = [...pattern].sort((a, b) => b.total - a.total);
  const peakDay = sortedDays[0] || { day: 'N/A', total: 0, percent: 0 };

  // Find peak week
  const sortedWeeks = [...weekOverWeek].sort((a, b) => b.total - a.total);
  const peakWeek = sortedWeeks[0] || { label: 'N/A', total: 0 };

  // Calculate weekend vs weekday intensity per day using actual elapsed days in period (preserve 0 days)
  const weekdayDays = split.weekdayDays ?? 5;
  const weekendDays = split.weekendDays ?? 2;
  const weekdayAvg = weekdayDays > 0 ? split.weekdayTotal / weekdayDays : 0;
  const weekendAvg = weekendDays > 0 ? split.weekendTotal / weekendDays : 0;
  const weekendMultiplier = weekdayAvg > 0 && weekendDays > 0 ? (weekendAvg / weekdayAvg).toFixed(1) : null;

  let verdictMessage = `You spend most heavily on ${peakDay.day}s (${peakDay.percent}% of total spend, ${formatCurrency(peakDay.total, defaultCurrency)}).`;
  let actionAdvice = weekendDays === 0
    ? `All recorded spending fell on weekdays (${formatCurrency(weekdayAvg, defaultCurrency)}/day).`
    : weekendMultiplier
      ? `Weekend spending averages ${formatCurrency(weekendAvg, defaultCurrency)}/day (${weekendMultiplier}x weekday rate).`
      : `Weekend spending averages ${formatCurrency(weekendAvg, defaultCurrency)}/day, with no weekday spending in this period.`;

  if (totalSpent === 0) {
    verdictMessage = 'No spending activity recorded for this period.';
    actionAdvice = 'Record transactions to unlock day-of-week cadence insights.';
  } else if (weekendMultiplier && Number(weekendMultiplier) >= 1.5) {
    actionAdvice = `Weekend spend is ${weekendMultiplier}× higher per day than weekdays. Setting a weekend cap can balance your weekly pace.`;
  } else if (weekendDays > 0 && split.weekdayPercent >= 75) {
    actionAdvice = `Weekday transactions dominate your spending (${split.weekdayPercent}% of total). Peak velocity occurred in ${peakWeek.label}.`;
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-900/80 backdrop-blur-xl shadow-xl relative overflow-hidden space-y-3 sm:space-y-4"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 shrink-0 text-purple-400">
            <Clock size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Time &amp; Day Pattern Verdict
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                totalSpent > 0
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-slate-800/70 text-slate-400 border-white/10'
              }`}>
                {totalSpent > 0 ? `Peak: ${peakDay.day}` : 'No Data'}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-slate-100 mt-1 leading-tight">
              {verdictMessage}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 sm:mt-2.5 font-normal flex items-start sm:items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>{actionAdvice}</span>
            </p>
          </div>
        </div>

        {/* Standardized Right Side Metric Cards */}
        <div className="w-full sm:w-44 grid grid-cols-2 sm:grid-cols-1 gap-2.5 shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
          <div className="text-left sm:text-right min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Weekend Share</span>
            <span className="text-sm sm:text-lg font-black text-purple-300 tabular-nums">
              {totalSpent > 0 ? `${split.weekendPercent}%` : '—'}
            </span>
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Peak Cadence</span>
            <span className="text-sm sm:text-lg font-black text-teal-300 tabular-nums truncate block">
              {totalSpent > 0 ? peakWeek.label : '—'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
