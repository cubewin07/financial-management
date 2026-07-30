import { formatCurrency } from '../../utils/finance';
import { ArrowUpRight } from 'lucide-react';

export default function BalanceHero({ remaining, effectiveBudget, spent, carryOverAmount, onClick, defaultCurrency }) {
  const percentSpent = effectiveBudget === 0 ? 0 : Math.max((spent / effectiveBudget) * 100, 0);
  const remainingPercent = Math.max(100 - percentSpent, 0);

  return (
    <div 
      className="glass-card p-6 sm:p-8 cursor-pointer relative overflow-hidden group shadow-[0_0_30px_rgba(208,188,255,0.08)] hover:shadow-[0_0_40px_rgba(208,188,255,0.2)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-300"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--primary)] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity rounded-full pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-overline">Remaining Budget</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] animate-pulse" />
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-display-lg text-transparent bg-clip-text bg-gradient-to-r from-white via-[var(--on-surface)] to-[var(--primary)]">
              {formatCurrency(remaining, defaultCurrency || 'NZD')}
            </h2>
            <span className="text-body-md text-[var(--outline)] font-medium">
              / {formatCurrency(effectiveBudget, defaultCurrency || 'NZD')} budget
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {carryOverAmount !== 0 && (
            <div className={`badge-pill border backdrop-blur-sm ${
              carryOverAmount > 0 
                ? 'bg-[rgba(0,238,252,0.08)] text-[var(--secondary)] border-[rgba(0,238,252,0.25)] shadow-[0_0_12px_rgba(0,238,252,0.15)]' 
                : 'bg-[rgba(255,180,171,0.08)] text-[var(--error)] border-[rgba(255,180,171,0.25)]'
            }`}>
              {carryOverAmount > 0 ? '+' : ''}{formatCurrency(carryOverAmount, defaultCurrency || 'NZD')} carry-over
            </div>
          )}
          <span className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--on-surface-variant)] group-hover:text-white group-hover:bg-[var(--primary)]/20 transition-colors">
            <ArrowUpRight size={16} />
          </span>
        </div>
      </div>

      <div className="mt-8 relative z-10">
        <div className="flex justify-between items-center text-label-sm mb-2.5">
          <span className="font-semibold text-[var(--on-surface)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--tertiary)]" />
            {formatCurrency(spent, defaultCurrency || 'NZD')} spent ({percentSpent.toFixed(0)}%)
          </span>
          <span className="text-[var(--outline)] font-medium">
            {remainingPercent.toFixed(0)}% available
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[rgba(255,255,255,0.06)] p-0.5 border border-white/5 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--tertiary)] to-[var(--secondary)] shadow-[0_0_12px_var(--primary)] transition-all duration-1000"
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
