import { motion } from 'framer-motion';
import { Compass, Calendar } from 'lucide-react';
import { formatCurrency, getMonthPace } from '../../utils/finance';
import { getTotalSubscriptionBurden } from '../../utils/subscriptions';

export default function FinancialPaceCard({
  summary = { remaining: 0, totalSpent: 0 },
  effectiveBudget = 0,
  monthlyExpenses = [],
  subscriptions = [],
  defaultCurrency = 'NZD',
  recurring = null,
}) {
  const now = new Date();
  const hasBudget = effectiveBudget > 0;
  const {
    monthElapsedPercent: monthProgressPercent,
    projectedEndSpend,
    isPacingOver,
  } = getMonthPace({
    monthlyBudget: effectiveBudget,
    monthSpent: summary.totalSpent,
    now,
    recurringSpent: recurring?.recurringSpent,
    upcomingRecurring: recurring?.upcomingRecurring,
  });

  const budgetSpentPercent = hasBudget ? Math.round((summary.totalSpent / effectiveBudget) * 100) : 0;
  const projectedSurplus = Math.round((effectiveBudget - projectedEndSpend) * 100) / 100;

  // Pacing status aligned with projected end-of-month trajectory so badge and metric never disagree
  let paceStatus = { label: 'On Track', color: 'text-teal-300 bg-teal-500/15 border-teal-500/30' };
  if (!hasBudget) {
    paceStatus = { label: 'No Budget', color: 'text-slate-300 bg-white/5 border-white/15' };
  } else if (summary.remaining <= 0) {
    paceStatus = {
      label: summary.remaining === 0 ? 'Budget Used' : 'Over Budget',
      color: 'text-red-400 bg-red-500/15 border-red-500/30',
    };
  } else if (isPacingOver || (budgetSpentPercent > monthProgressPercent + 15 && projectedSurplus <= 0)) {
    paceStatus = { label: 'Pacing High', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' };
  } else if (budgetSpentPercent < monthProgressPercent - 15 && projectedSurplus > 0) {
    paceStatus = { label: 'Under Budget', color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' };
  }

  // Top spending category calculation
  const categoryTotals = (monthlyExpenses || []).reduce((acc, exp) => {
    const cat = exp.category || 'Uncategorized';
    acc[cat] = Math.round(((acc[cat] || 0) + Number(exp.amount || 0)) * 100) / 100;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] ? { name: sortedCategories[0][0], amount: sortedCategories[0][1] } : null;

  // Active subscriptions total monthly burden
  const activeSubsBurden = getTotalSubscriptionBurden(subscriptions || []);
  const subSharePercent = hasBudget ? Math.round((activeSubsBurden / effectiveBudget) * 100) : 0;

  return (
    <motion.div
      layout
      className="glass-card p-4 sm:p-6 flex flex-col justify-start relative overflow-hidden group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(0,238,252,0.1)] h-full"
    >
      <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4">
          <div className="min-w-0">
            <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight truncate">Month Pace & Insights</h3>
            <p className="text-overline text-[var(--outline)]">At-a-Glance Analytics</p>
          </div>
          <span className={`badge-pill border font-semibold px-2.5 py-1 shrink-0 ${paceStatus.color}`}>
            {paceStatus.label}
          </span>
        </div>

        {/* Runway & Month-End Projection (De-duplicated: daily burn & safe limit are in VerdictBlock) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3.5 sm:mb-4">
          <div className="min-w-0 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--outline)] uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} className="text-teal-400 shrink-0" /> <span className="truncate">Projected End</span>
            </span>
            <p
              className={`text-base sm:text-lg font-black mt-1 truncate tabular-nums ${
                !hasBudget ? 'text-white' : projectedSurplus >= 0 ? 'text-teal-300' : 'text-rose-400'
              }`}
            >
              {hasBudget
                ? (projectedSurplus > 0 ? '+' : '') + formatCurrency(Math.abs(projectedSurplus), defaultCurrency)
                : formatCurrency(projectedEndSpend, defaultCurrency)}
            </p>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-0.5 font-medium">
              {!hasBudget ? 'Estimated total spend' : projectedSurplus >= 0 ? 'Estimated surplus' : 'Estimated overspend'}
            </p>
          </div>

          <div className="min-w-0 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--outline)] uppercase tracking-wider flex items-center gap-1">
              <Compass size={12} className="text-[var(--primary)] shrink-0" /> <span className="truncate">Budget Velocity</span>
            </span>
            <p className="text-base sm:text-lg font-black text-white mt-1 tabular-nums">
              {hasBudget ? `${budgetSpentPercent}%` : '—'}{' '}
              {hasBudget && <span className="text-xs font-normal text-slate-400">used</span>}
            </p>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-0.5 font-medium">
              vs {monthProgressPercent}% month elapsed
              {hasBudget ? ` (${!isPacingOver && budgetSpentPercent <= monthProgressPercent ? 'Under pace' : isPacingOver ? 'Over pace' : 'Steady'})` : ''}
            </p>
          </div>
        </div>

        {/* Top Category & Subscriptions Impact */}
        <div className="space-y-2 sm:space-y-2.5">
          {topCategory && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />
                <span className="text-xs text-[var(--on-surface-variant)] shrink-0">Top Category:</span>
                <span className="text-xs text-white font-bold truncate">{topCategory.name}</span>
              </div>
              <span className="text-xs text-white font-extrabold shrink-0 tabular-nums">
                {formatCurrency(topCategory.amount, defaultCurrency)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[var(--secondary)] shrink-0" />
              <span className="text-xs text-[var(--on-surface-variant)] truncate">Recurring Bills Share:</span>
            </div>
            <span className="text-xs text-[var(--secondary)] font-extrabold shrink-0 tabular-nums">
              {formatCurrency(activeSubsBurden, defaultCurrency)}{hasBudget ? ` (${subSharePercent}%)` : '/mo'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
