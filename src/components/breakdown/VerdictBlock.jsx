import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Flame, Sparkles, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';

export default function VerdictBlock({
  totalSpent = 0,
  effectiveBudget = 0,
  burnRate = {},
  period = 'current-month',
  defaultCurrency = 'NZD',
  variant = 'compact',
}) {
  if (period !== 'current-month') {
    return null;
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

  const dailyAvg = burnRate.dailyAvg || (currentDay > 0 ? totalSpent / currentDay : 0);
  const projectedEndMonthTotal = dailyAvg * daysInMonth;
  const variance = projectedEndMonthTotal - effectiveBudget;
  const remainingBudget = effectiveBudget - totalSpent;
  const safeDailyAllowance = Math.max(0, remainingBudget / daysRemaining);

  // Time & budget progress calculations
  const monthElapsedPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
  const budgetSpentPercent = effectiveBudget > 0 ? Math.min(100, Math.round((totalSpent / effectiveBudget) * 100)) : 0;
  const paceDeltaPercent = budgetSpentPercent - monthElapsedPercent;

  let statusConfig = {
    title: 'On Track — Safe Pace',
    badge: 'Safe to Slack Off',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    bannerGradient: 'from-emerald-950/40 via-slate-900/60 to-slate-900/80 border-emerald-500/30',
    icon: ShieldCheck,
    iconColor: 'text-emerald-400',
    verdictMessage: effectiveBudget > 0
      ? `At your current pace of ${formatCurrency(dailyAvg, defaultCurrency)}/day, you're projected to finish ${formatCurrency(Math.abs(variance), defaultCurrency)} under budget!`
      : `Current daily spend pace is ${formatCurrency(dailyAvg, defaultCurrency)}/day.`,
    actionAdvice: `You can safely spend up to ${formatCurrency(safeDailyAllowance, defaultCurrency)}/day for the remaining ${daysRemaining} days.`,
  };

  if (effectiveBudget > 0 && remainingBudget <= 0) {
    statusConfig = {
      title: 'Over Budget Warning',
      badge: 'Over Limit',
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      bannerGradient: 'from-rose-950/40 via-slate-900/60 to-slate-900/80 border-rose-500/30',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
      verdictMessage: `You have exceeded your monthly budget by ${formatCurrency(Math.abs(remainingBudget), defaultCurrency)}.`,
      actionAdvice: 'Hold non-essential spending for the rest of the month to recover budget.',
    };
  } else if (effectiveBudget > 0 && variance > 0) {
    statusConfig = {
      title: 'Pacing High — Cut Back',
      badge: 'Tighten Spending',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      bannerGradient: 'from-amber-950/40 via-slate-900/60 to-slate-900/80 border-amber-500/30',
      icon: Flame,
      iconColor: 'text-amber-400',
      verdictMessage: `At your current pace of ${formatCurrency(dailyAvg, defaultCurrency)}/day, you will finish ~${formatCurrency(variance, defaultCurrency)} over budget.`,
      actionAdvice: `Spend under ${formatCurrency(safeDailyAllowance, defaultCurrency)}/day for the remaining ${daysRemaining} days to land on budget.`,
    };
  }

  const IconComponent = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 sm:p-6 rounded-3xl border bg-gradient-to-r ${statusConfig.bannerGradient} backdrop-blur-xl shadow-xl relative overflow-hidden space-y-4`}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Main Concise Verdict Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 ${statusConfig.iconColor}`}>
            <IconComponent size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Monthly Spending Verdict
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusConfig.badgeColor}`}>
                {statusConfig.badge}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 mt-1 leading-tight">
              {statusConfig.verdictMessage}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2.5 font-normal flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400 shrink-0" />
              <span>{statusConfig.actionAdvice}</span>
            </p>
          </div>
        </div>

        {/* Standardized Right Side Metric Cards */}
        <div className="w-full sm:w-44 grid grid-cols-2 sm:grid-cols-1 gap-2.5 shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Daily Burn</span>
            <span className="text-base sm:text-lg font-black text-slate-100">
              {formatCurrency(dailyAvg, defaultCurrency)}
              <span className="text-xs text-slate-400 font-normal ml-0.5">/day</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Safe Limit</span>
            <span className="text-base sm:text-lg font-black text-teal-300">
              {formatCurrency(safeDailyAllowance, defaultCurrency)}
              <span className="text-xs text-slate-400 font-normal ml-0.5">/day</span>
            </span>
          </div>
        </div>
      </div>

      {/* Detailed mode expansions (only when variant === 'detailed') */}
      {variant === 'detailed' && effectiveBudget > 0 && (
        <>
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Month Progress: Day {currentDay} of {daysInMonth} ({monthElapsedPercent}%)
              </span>
              <span className="text-slate-300 font-medium">
                Budget Used: {formatCurrency(totalSpent, defaultCurrency)} of {formatCurrency(effectiveBudget, defaultCurrency)} ({budgetSpentPercent}%)
              </span>
            </div>

            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-purple-500/80 rounded-full transition-all duration-500"
                  style={{ width: `${monthElapsedPercent}%` }}
                />
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetSpentPercent > monthElapsedPercent ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${budgetSpentPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
            <HelpCircle size={15} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-200">How this verdict is calculated:</span>{' '}
              Based on Day {currentDay} of {daysInMonth} ({monthElapsedPercent}% through the month), spending{' '}
              <span className="font-bold text-white">{formatCurrency(dailyAvg, defaultCurrency)}/day</span> yields a projected total of{' '}
              <span className="font-bold text-white">{formatCurrency(projectedEndMonthTotal, defaultCurrency)}</span> vs your{' '}
              <span className="font-bold text-white">{formatCurrency(effectiveBudget, defaultCurrency)}</span> limit.
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
