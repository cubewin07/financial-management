import { Target, ChevronRight, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/finance';

export default function SavingsGoalWidget({ goals = [], defaultCurrency }) {
  const displayGoals = (goals || []).slice(0, 3);
  const totalSavings = (goals || []).reduce((acc, g) => acc + (Number(g.current_amount) || 0), 0);
  const totalTarget = (goals || []).reduce((acc, g) => acc + (Number(g.target_amount) || 0), 0);
  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalSavings / totalTarget) * 100)) : 0;

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
      case 'low':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      default:
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
  };

  const getGoalBarGradient = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-r from-pink-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
      case 'low':
        return 'bg-gradient-to-r from-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(45,212,191,0.4)]';
      default:
        return 'bg-gradient-to-r from-purple-400 to-indigo-400 shadow-[0_0_10px_rgba(192,132,252,0.4)]';
    }
  };

  return (
    <motion.div
      layout
      className="glass-card p-6 flex flex-col justify-start relative overflow-hidden group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)] h-full"
    >
      <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div>
            <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight">Savings Goals</h3>
            <p className="text-overline text-[var(--outline)]">Target Progress</p>
          </div>
          <Link
            to="/savings"
            className="text-label-sm text-[var(--primary)] hover:text-white flex items-center gap-0.5 font-semibold transition-colors group/link shrink-0"
          >
            View All <ChevronRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Overall progress summary card */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-3.5 relative z-10 shadow-sm">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[var(--on-surface-variant)] font-semibold flex items-center gap-1.5">
              <PiggyBank size={15} className="text-[var(--primary)]" /> Total Goal Fund
            </span>
            <span className="text-white font-extrabold text-sm">{overallPercent}% achieved</span>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xl font-black text-white tracking-tight">
              {formatCurrency(totalSavings, defaultCurrency || 'NZD')}
            </span>
            <span className="text-xs text-[var(--outline)] font-bold">
              of {formatCurrency(totalTarget, defaultCurrency || 'NZD')}
            </span>
          </div>
          {/* Main glowing progress bar */}
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10 relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 shadow-[0_0_12px_rgba(208,188,255,0.5)] transition-all duration-700"
              style={{ width: `${Math.max(2, overallPercent)}%` }}
            />
          </div>
        </div>

        {/* List of top active goals */}
        {displayGoals.length > 0 ? (
          <div className="space-y-2.5 relative z-10">
            {displayGoals.map((goal) => {
              const current = Number(goal.current_amount) || 0;
              const target = Number(goal.target_amount) || 1;
              const percent = Math.min(100, Math.round((current / target) * 100));

              return (
                <div
                  key={goal.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[rgba(208,188,255,0.12)] text-[var(--primary)] flex items-center justify-center shrink-0 border border-[rgba(208,188,255,0.2)]">
                        <Target size={13} />
                      </div>
                      <span className="text-label-md text-white font-extrabold truncate">{goal.name}</span>
                    </div>
                    <span className={`badge-pill border text-[10px] font-extrabold ${getPriorityBadge(goal.priority)}`}>
                      {goal.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-1.5 text-[var(--on-surface-variant)]">
                    <span className="font-semibold text-slate-200">
                      {formatCurrency(current, defaultCurrency || 'NZD')} / {formatCurrency(target, defaultCurrency || 'NZD')}
                    </span>
                    <span className="font-extrabold text-white">{percent}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getGoalBarGradient(goal.priority)}`}
                      style={{ width: `${Math.max(2, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--outline)] text-center py-4">No active savings goals.</p>
        )}
      </div>
    </motion.div>
  );
}
