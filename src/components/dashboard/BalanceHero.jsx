import { formatCurrency } from '../../utils/finance';
import { ArrowUpRight, Wallet, ArrowRightLeft, CreditCard } from 'lucide-react';

export default function BalanceHero({ remaining, effectiveBudget, spent, carryOverAmount, onClick, defaultCurrency }) {
  const percentSpent = effectiveBudget === 0 ? 0 : Math.max((spent / effectiveBudget) * 100, 0);
  const remainingPercent = Math.max(100 - percentSpent, 0);
  const baseBudget = Math.max(0, effectiveBudget - carryOverAmount);
  const currency = defaultCurrency || 'NZD';

  return (
    <div 
      className="glass-card p-5 sm:p-7 cursor-pointer relative overflow-hidden group shadow-[0_0_30px_rgba(208,188,255,0.08)] hover:shadow-[0_0_40px_rgba(208,188,255,0.2)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-300 h-full flex flex-col justify-between"
      onClick={onClick}
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--primary)] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--secondary)] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity rounded-full pointer-events-none" />

      {/* Top Row: Remaining Budget Display & Action */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-overline tracking-wider text-[var(--outline)] font-bold uppercase text-[10px] sm:text-[11px]">
              Remaining Budget
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-3xl sm:text-display-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[var(--primary)] tracking-tight">
              {formatCurrency(remaining, currency)}
            </h2>
            <span className="text-xs sm:text-body-md text-[var(--outline)] font-semibold">
              / {formatCurrency(effectiveBudget, currency)} budget
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {carryOverAmount !== 0 && (
            <div className={`badge-pill border font-extrabold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 backdrop-blur-md shadow-sm ${
              carryOverAmount > 0 
                ? 'bg-[rgba(0,238,252,0.1)] text-[var(--secondary)] border-[rgba(0,238,252,0.3)] shadow-[0_0_12px_rgba(0,238,252,0.15)]' 
                : 'bg-[rgba(255,180,171,0.1)] text-[var(--error)] border-[rgba(255,180,171,0.3)]'
            }`}>
              {carryOverAmount > 0 ? '+' : ''}{formatCurrency(carryOverAmount, currency)} carry-over
            </div>
          )}
          <span className="p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--on-surface-variant)] group-hover:text-white group-hover:bg-[var(--primary)]/20 transition-all shadow-sm">
            <ArrowUpRight size={16} className="sm:w-[18px] sm:h-[18px]" />
          </span>
        </div>
      </div>

      {/* Middle Row: Minimal Budget Composition Pills (High-density on mobile) */}
      <div className="my-3.5 sm:my-5 grid grid-cols-3 gap-2 sm:gap-3 relative z-10">
        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider flex items-center gap-1">
            <Wallet size={11} className="text-purple-400" /> Base
          </span>
          <span className="text-xs sm:text-base font-extrabold text-white mt-0.5 sm:mt-1 truncate">
            {formatCurrency(baseBudget, currency)}
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider flex items-center gap-1">
            <ArrowRightLeft size={11} className="text-[var(--secondary)]" /> Carry
          </span>
          <span className={`text-xs sm:text-base font-extrabold mt-0.5 sm:mt-1 truncate ${carryOverAmount >= 0 ? 'text-[var(--secondary)]' : 'text-[var(--error)]'}`}>
            {carryOverAmount > 0 ? '+' : ''}{formatCurrency(carryOverAmount, currency)}
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider flex items-center gap-1">
            <CreditCard size={11} className="text-pink-400" /> Spent
          </span>
          <span className="text-xs sm:text-base font-extrabold text-white mt-0.5 sm:mt-1 truncate">
            {formatCurrency(spent, currency)}
          </span>
        </div>
      </div>

      {/* Bottom Row: Glowing Progress Bar */}
      <div className="relative z-10">
        <div className="flex justify-between items-center text-[11px] sm:text-xs mb-1.5 sm:mb-2">
          <span className="font-extrabold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            {formatCurrency(spent, currency)} spent ({percentSpent.toFixed(0)}%)
          </span>
          <span className="text-[var(--outline)] font-bold">
            {remainingPercent.toFixed(0)}% available
          </span>
        </div>

        <div className="h-2.5 sm:h-3 rounded-full bg-white/10 border border-white/10 overflow-hidden relative shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 shadow-[0_0_15px_rgba(208,188,255,0.5)] transition-all duration-1000"
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
