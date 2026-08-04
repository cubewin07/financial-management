import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Flame, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';

export default function VerdictBlock({
  totalSpent = 0,
  effectiveBudget = 0,
  burnRate = {},
  period = 'current-month',
  defaultCurrency = 'NZD',
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

  let statusConfig = {
    title: 'On Track — Safe Pace',
    badge: 'Safe to Slack Off',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    bannerGradient: 'from-emerald-950/40 via-slate-900/60 to-slate-900/80 border-emerald-500/30',
    icon: ShieldCheck,
    iconColor: 'text-emerald-400',
    verdictMessage: `At your current pace of ${formatCurrency(dailyAvg, defaultCurrency)}/day, you're projected to finish ${formatCurrency(Math.abs(variance), defaultCurrency)} under budget!`,
    actionAdvice: `You can safely spend up to ${formatCurrency(safeDailyAllowance, defaultCurrency)}/day for the remaining ${daysRemaining} days.`,
  };

  if (remainingBudget <= 0) {
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
  } else if (variance > 0) {
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
      className={`p-5 sm:p-6 rounded-3xl border bg-gradient-to-r ${statusConfig.bannerGradient} backdrop-blur-xl shadow-xl relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 ${statusConfig.iconColor}`}>
            <IconComponent size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Monthly Decision Verdict
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusConfig.badgeColor}`}>
                {statusConfig.badge}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 mt-0.5">
              {statusConfig.verdictMessage}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400 shrink-0" />
              <span>{statusConfig.actionAdvice}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-col items-end gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Daily Burn</span>
            <span className="text-sm font-extrabold text-white">{formatCurrency(dailyAvg, defaultCurrency)}<span className="text-[10px] text-slate-400 font-normal">/day</span></span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Safe Limit</span>
            <span className="text-sm font-extrabold text-teal-300">{formatCurrency(safeDailyAllowance, defaultCurrency)}<span className="text-[10px] text-slate-400 font-normal">/day</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
