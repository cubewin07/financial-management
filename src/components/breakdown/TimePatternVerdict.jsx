import { motion } from 'framer-motion';
import { Clock, Calendar, Zap, Sparkles } from 'lucide-react';
import { getDayOfWeekPattern, getWeekdayVsWeekendSplit, getWeekOverWeekBreakdown, formatCurrency } from '../../utils/finance';

export default function TimePatternVerdict({ expenses = [], defaultCurrency = 'NZD' }) {
  const pattern = getDayOfWeekPattern(expenses);
  const split = getWeekdayVsWeekendSplit(expenses);
  const weekOverWeek = getWeekOverWeekBreakdown(expenses);

  const totalSpent = pattern.reduce((sum, p) => sum + p.total, 0);

  // Find peak day of week
  const sortedDays = [...pattern].sort((a, b) => b.total - a.total);
  const peakDay = sortedDays[0] || { day: 'N/A', total: 0, percent: 0 };

  // Find peak week
  const sortedWeeks = [...weekOverWeek].sort((a, b) => b.total - a.total);
  const peakWeek = sortedWeeks[0] || { label: 'N/A', total: 0 };

  // Calculate weekend vs weekday intensity per day
  const weekdayAvg = split.weekdayTotal / 5;
  const weekendAvg = split.weekendTotal / 2;
  const weekendMultiplier = weekdayAvg > 0 ? (weekendAvg / weekdayAvg).toFixed(1) : '1.0';

  let verdictMessage = `You spend most heavily on ${peakDay.day}s (${peakDay.percent}% of total spend, ${formatCurrency(peakDay.total, defaultCurrency)}).`;
  let actionAdvice = `Weekend spending averages ${formatCurrency(weekendAvg, defaultCurrency)}/day (${weekendMultiplier}x weekday rate).`;

  if (totalSpent === 0) {
    verdictMessage = 'No spending activity recorded for this period.';
    actionAdvice = 'Record transactions to unlock day-of-week cadence insights.';
  } else if (Number(weekendMultiplier) >= 1.5) {
    actionAdvice = `Weekend spend is ${weekendMultiplier}× higher per day than weekdays. Setting a weekend cap can balance your weekly pace.`;
  } else if (split.weekdayPercent >= 75) {
    actionAdvice = `Weekday transactions dominate your spending (${split.weekdayPercent}% of total). Peak velocity occurred in ${peakWeek.label}.`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 sm:p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-900/80 backdrop-blur-xl shadow-xl relative overflow-hidden space-y-4"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-purple-400">
            <Clock size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                Time & Day Pattern Verdict
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full border bg-purple-500/15 text-purple-300 border-purple-500/30">
                Peak: {peakDay.day}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 mt-0.5 leading-snug">
              {verdictMessage}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400 shrink-0" />
              <span>{actionAdvice}</span>
            </p>
          </div>
        </div>

        {/* Cadence Metric Cards */}
        <div className="grid grid-cols-2 sm:flex sm:flex-col items-end gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Weekend Share</span>
            <span className="text-sm font-extrabold text-purple-300">{split.weekendPercent}%</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Peak Cadence</span>
            <span className="text-sm font-extrabold text-teal-300">{peakWeek.label}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
