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
    badge: 'Safe to Spend',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20',
    bannerGradient: 'from-emerald-950/50 via-slate-900/80 to-slate-900/90 border-emerald-500/40',
    icon: ShieldCheck,
    iconColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    headline: effectiveBudget > 0
      ? `Pacing ${formatCurrency(Math.abs(variance), defaultCurrency)} Under Budget`
      : 'Healthy Spending Pace',
    submessage: effectiveBudget > 0
      ? `At your current burn rate of ${formatCurrency(dailyAvg, defaultCurrency)}/day, you will stay comfortably within your limits.`
      : `Current daily spend pace is ${formatCurrency(dailyAvg, defaultCurrency)}/day.`,
    actionAdvice: `You can safely spend up to ${formatCurrency(safeDailyAllowance, defaultCurrency)}/day for the remaining ${daysRemaining} days.`,
    allowanceColor: 'text-emerald-300',
    allowanceBg: 'bg-emerald-500/10 border-emerald-500/30',
  };

  if (effectiveBudget > 0 && remainingBudget <= 0) {
    statusConfig = {
      title: 'Over Budget Warning',
      badge: 'Over Budget',
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20',
      bannerGradient: 'from-rose-950/50 via-slate-900/80 to-slate-900/90 border-rose-500/40',
      icon: AlertTriangle,
      iconColor: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      headline: `Exceeded Budget by ${formatCurrency(Math.abs(remainingBudget), defaultCurrency)}`,
      submessage: 'You have spent all allocated funds for this billing cycle.',
      actionAdvice: 'Pause non-essential expenses to prevent further overspending.',
      allowanceColor: 'text-rose-300',
      allowanceBg: 'bg-rose-500/10 border-rose-500/30',
    };
  } else if (effectiveBudget > 0 && variance > 0) {
    statusConfig = {
      title: 'Pacing High — Caution',
      badge: 'Tighten Pace',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20',
      bannerGradient: 'from-amber-950/50 via-slate-900/80 to-slate-900/90 border-amber-500/40',
      icon: Flame,
      iconColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      headline: `Pacing ${formatCurrency(variance, defaultCurrency)} Over Budget`,
      submessage: `At ${formatCurrency(dailyAvg, defaultCurrency)}/day, you are burning faster than the month elapsed.`,
      actionAdvice: `Cap spending at ${formatCurrency(safeDailyAllowance, defaultCurrency)}/day for the remaining ${daysRemaining} days to land on budget.`,
      allowanceColor: 'text-amber-300',
      allowanceBg: 'bg-amber-500/10 border-amber-500/30',
    };
  }

  const IconComponent = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 sm:p-6 rounded-3xl border bg-gradient-to-br ${statusConfig.bannerGradient} backdrop-blur-xl shadow-xl relative overflow-hidden space-y-4`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className={`p-2.5 sm:p-3 rounded-2xl border shrink-0 ${statusConfig.iconColor}`}>
            <IconComponent size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Monthly Spending Verdict
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusConfig.badgeColor}`}>
                {statusConfig.badge}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-100 mt-1 leading-snug tracking-tight">
              {statusConfig.headline}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-medium flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400 shrink-0" />
              <span>{statusConfig.actionAdvice}</span>
            </p>
          </div>
        </div>

        {/* Highlighted Dual KPI Cards (Mobile: 2-col row; Desktop: Stacked) */}
        <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full md:w-auto md:min-w-[280px]">
          {/* Safe Daily Allowance Card */}
          <div className={`p-3 rounded-2xl border ${statusConfig.allowanceBg} flex flex-col justify-between`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Safe Allowance
            </span>
            <div className="mt-0.5">
              <span className={`text-lg sm:text-xl font-black ${statusConfig.allowanceColor} tabular-nums`}>
                {formatCurrency(safeDailyAllowance, defaultCurrency)}
              </span>
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">/day</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">{daysRemaining} days remaining</span>
          </div>

          {/* Current Daily Burn Card */}
          <div className="p-3 rounded-2xl border border-white/10 bg-slate-900/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Burn
            </span>
            <div className="mt-0.5">
              <span className="text-lg sm:text-xl font-black text-slate-100 tabular-nums">
                {formatCurrency(dailyAvg, defaultCurrency)}
              </span>
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">/day</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">Day {currentDay} of {daysInMonth}</span>
          </div>
        </div>
      </div>

      {/* Detailed mode expansions (only when variant === 'detailed') */}
      {variant === 'detailed' && effectiveBudget > 0 && (
        <div className="pt-3 border-t border-white/10 space-y-3">
          {/* Unified Monthly Runway Track */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            {/* Header / Pacing Badge Row */}
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                <span>Monthly Spending Runway</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Day {currentDay} of {daysInMonth} • {monthElapsedPercent}% of month)
                </span>
              </div>

              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                  budgetSpentPercent > monthElapsedPercent
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {budgetSpentPercent > monthElapsedPercent
                  ? `Burning ahead of calendar (+${paceDeltaPercent}%)`
                  : `Safe runway: ${Math.abs(paceDeltaPercent)}% behind calendar pace`}
              </span>
            </div>

            {/* The Single Unified Track */}
            <div className="space-y-1.5 pt-2">
              <div className="relative w-full h-3 sm:h-3.5 rounded-full bg-slate-800/90 border border-white/10 overflow-visible">
                {/* Budget Spent Fill Bar */}
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    budgetSpentPercent > monthElapsedPercent
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(1.5, budgetSpentPercent))}%` }}
                />

                {/* "Today" Calendar Checkpoint Marker Pin */}
                <div
                  className="absolute -top-2 -bottom-2 flex flex-col items-center pointer-events-none z-10 -translate-x-1/2"
                  style={{ left: `${monthElapsedPercent}%` }}
                >
                  <div className="w-1 h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  {/* Floating marker chip */}
                  <span className="absolute -top-4 px-1.5 py-0.2 rounded bg-slate-900 border border-white/30 text-[9px] font-black text-white whitespace-nowrap shadow-md">
                    Today
                  </span>
                </div>
              </div>

              {/* Runway Scale Labels */}
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-medium pt-1">
                <span>Start ($0)</span>
                <span className="text-slate-300 font-semibold">
                  Spent: <strong className="text-white">{formatCurrency(totalSpent, defaultCurrency)}</strong> ({budgetSpentPercent}%)
                </span>
                <span>Cap ({formatCurrency(effectiveBudget, defaultCurrency)})</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 flex items-start gap-2">
            <HelpCircle size={15} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-200">Trajectory Calculation:</span>{' '}
              At <strong className="text-white">{formatCurrency(dailyAvg, defaultCurrency)}/day</strong>, you are projected to reach{' '}
              <strong className="text-white">{formatCurrency(projectedEndMonthTotal, defaultCurrency)}</strong> at month-end against your{' '}
              <strong className="text-white">{formatCurrency(effectiveBudget, defaultCurrency)}</strong> budget limit.
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
