import { motion } from 'framer-motion';
import { Compass, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';

export default function FinancialPaceCard({
  summary = { remaining: 0, totalSpent: 0 },
  effectiveBudget = 0,
  monthlyExpenses = [],
  subscriptions = [],
  defaultCurrency = 'NZD',
}) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();

  const monthProgressPercent = Math.round((currentDay / daysInMonth) * 100);
  const budgetSpentPercent = effectiveBudget > 0 ? Math.round((summary.totalSpent / effectiveBudget) * 100) : 0;

  // Daily avg spent so far
  const dailyAvgSpent = currentDay > 0 ? summary.totalSpent / currentDay : 0;

  // Pacing status logic
  let paceStatus = { label: 'On Track', color: 'text-teal-300 bg-teal-500/15 border-teal-500/30' };
  if (summary.remaining <= 0) {
    paceStatus = { label: 'Over Budget', color: 'text-red-400 bg-red-500/15 border-red-500/30' };
  } else if (budgetSpentPercent > monthProgressPercent + 15) {
    paceStatus = { label: 'Pacing High', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' };
  } else if (budgetSpentPercent < monthProgressPercent - 15) {
    paceStatus = { label: 'Under Budget', color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' };
  }

  // Top spending category calculation
  const categoryTotals = (monthlyExpenses || []).reduce((acc, exp) => {
    const cat = exp.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] ? { name: sortedCategories[0][0], amount: sortedCategories[0][1] } : null;

  // Active subscriptions total burden
  const activeSubsBurden = (subscriptions || [])
    .filter((s) => s.active)
    .reduce((acc, s) => acc + Number(s.amount || 0), 0);
  const subSharePercent = effectiveBudget > 0 ? Math.round((activeSubsBurden / effectiveBudget) * 100) : 0;

  return (
    <motion.div
      layout
      className="glass-card p-6 flex flex-col justify-start relative overflow-hidden group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(0,238,252,0.1)] h-full"
    >
      <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight">Month Pace & Insights</h3>
            <p className="text-overline text-[var(--outline)]">At-a-Glance Analytics</p>
          </div>
          <span className={`badge-pill border font-semibold px-2.5 py-1 ${paceStatus.color}`}>
            {paceStatus.label}
          </span>
        </div>

        {/* Runway & Month-End Projection (De-duplicated: daily burn & safe limit are in VerdictBlock) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-[var(--outline)] uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12} className="text-teal-400" /> Projected Month-End
            </span>
            <p className={`text-lg font-black mt-1 ${
              effectiveBudget - (dailyAvgSpent * daysInMonth) >= 0 ? 'text-teal-300' : 'text-rose-400'
            }`}>
              {effectiveBudget > 0
                ? (effectiveBudget - (dailyAvgSpent * daysInMonth) >= 0 ? '+' : '') +
                  formatCurrency(effectiveBudget - (dailyAvgSpent * daysInMonth), defaultCurrency)
                : formatCurrency(0, defaultCurrency)}
            </p>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-0.5 font-medium">
              {effectiveBudget - (dailyAvgSpent * daysInMonth) >= 0 ? 'Estimated surplus' : 'Estimated overspend'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-[var(--outline)] uppercase tracking-wider flex items-center gap-1">
              <Compass size={12} className="text-[var(--primary)]" /> Budget Velocity
            </span>
            <p className="text-lg font-black text-white mt-1">
              {budgetSpentPercent}% <span className="text-xs font-normal text-slate-400">used</span>
            </p>
            <p className="text-[10px] text-[var(--on-surface-variant)] mt-0.5 font-medium">
              vs {monthProgressPercent}% month elapsed ({budgetSpentPercent <= monthProgressPercent ? 'Ahead of goal' : 'Burn ahead'})
            </p>
          </div>
        </div>

        {/* Top Category & Subscriptions Impact */}
        <div className="space-y-2.5">
          {topCategory && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                <span className="text-xs text-[var(--on-surface-variant)]">Top Category:</span>
                <span className="text-xs text-white font-bold truncate">{topCategory.name}</span>
              </div>
              <span className="text-xs text-white font-extrabold shrink-0">
                {formatCurrency(topCategory.amount, defaultCurrency)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[var(--secondary)]" />
              <span className="text-xs text-[var(--on-surface-variant)]">Recurring Bills Share:</span>
            </div>
            <span className="text-xs text-[var(--secondary)] font-extrabold shrink-0">
              {formatCurrency(activeSubsBurden, defaultCurrency)} ({subSharePercent}%)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
