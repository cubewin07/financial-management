import { formatCurrency } from '../../utils/finance';

export default function BalanceHero({ remaining, effectiveBudget, spent, carryOverAmount, onClick }) {
  const percentSpent = effectiveBudget === 0 ? 0 : Math.max((spent / effectiveBudget) * 100, 0);
  const remainingPercent = Math.max(100 - percentSpent, 0);

  return (
    <div 
      className="glass-card p-6 sm:p-8 cursor-pointer relative overflow-hidden group shadow-[0_0_30px_rgba(208,188,255,0.15)] hover:shadow-[0_0_40px_rgba(208,188,255,0.25)] transition-shadow duration-300"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity rounded-full pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
        <div>
          <p className="text-label-md text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Remaining Budget</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-display text-[var(--on-surface)]">{formatCurrency(remaining)}</h2>
            <span className="text-body-md text-[var(--on-surface-variant)]">/ {formatCurrency(effectiveBudget)}</span>
          </div>
        </div>
        
        {carryOverAmount !== 0 && (
          <div className={`px-3 py-1 rounded-full text-label-md border ${
            carryOverAmount > 0 
              ? 'bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] border-[rgba(211,251,255,0.2)]' 
              : 'bg-[rgba(255,180,171,0.1)] text-[var(--error)] border-[rgba(255,180,171,0.2)]'
          }`}>
            {carryOverAmount > 0 ? '+' : ''}{formatCurrency(carryOverAmount)} carry-over
          </div>
        )}
      </div>

      <div className="mt-8 relative z-10">
        <div className="flex justify-between text-label-sm text-[var(--on-surface-variant)] mb-2">
          <span>{percentSpent.toFixed(0)}% spent</span>
          <span>{remainingPercent.toFixed(0)}% remaining</span>
        </div>
        <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] shadow-[0_0_10px_var(--primary)] transition-all duration-1000"
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
