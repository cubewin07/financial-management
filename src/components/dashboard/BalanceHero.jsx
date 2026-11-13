import { formatCurrency } from '../../utils/finance';
import { ArrowUpRight, Wallet, ArrowRightLeft, CreditCard } from 'lucide-react';

export default function BalanceHero({
  remaining = 0,
  effectiveBudget = 0,
  spent = 0,
  carryOverAmount = 0,
  budgetTopUp = 0,
  onClick,
  defaultCurrency,
}) {
  const hasBudget = effectiveBudget > 0;
  const percentSpent = !hasBudget ? 0 : Math.max((spent / effectiveBudget) * 100, 0);
  const remainingPercent = !hasBudget ? 0 : Math.max(100 - percentSpent, 0);
  // Effective budget = base budget + allocated top-up (unallocated reserve stays outside effective budget).
  const baseBudget = Math.max(0, Math.round((effectiveBudget - (Number(budgetTopUp) || 0)) * 100) / 100);
  const currency = defaultCurrency || 'NZD';
  const isOverBudget = hasBudget && remaining < 0;

  const handleKeyDown = (event) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const middlePillLabel = budgetTopUp > 0 ? 'Top-Up' : 'Reserve';
  const middlePillAmount = budgetTopUp > 0 ? budgetTopUp : carryOverAmount;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Open spending breakdown' : undefined}
      onKeyDown={handleKeyDown}
      className="glass-card p-4 sm:p-7 cursor-pointer relative overflow-hidden group shadow-[0_0_30px_rgba(208,188,255,0.08)] hover:shadow-[0_0_40px_rgba(208,188,255,0.2)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-300 h-full flex flex-col justify-between text-left"
      onClick={onClick}
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--primary)] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--secondary)] opacity-10 blur-3xl group-hover:opacity-20 transition-opacity rounded-full pointer-events-none" />

      {/* Top Row: Remaining Budget Display & Action */}
      <div className="flex items-start justify-between gap-2.5 sm:gap-3 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-overline tracking-wider text-[var(--outline)] font-bold uppercase text-[10px] sm:text-[11px]">
              Remaining Budget
            </span>
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isOverBudget
                  ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                  : 'bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
            <h2
              className={`text-2xl sm:text-display-lg font-black tracking-tight tabular-nums ${
                isOverBudget
                  ? 'text-rose-400'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[var(--primary)]'
              }`}
            >
              {formatCurrency(remaining, currency)}
            </h2>
            <span className="text-xs sm:text-body-md text-[var(--outline)] font-semibold tabular-nums">
              / {formatCurrency(effectiveBudget, currency)} budget
            </span>
          </div>
          {budgetTopUp > 0 && carryOverAmount !== 0 && (
            <div className="mt-1 sm:hidden">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tabular-nums ${
                  carryOverAmount > 0
                    ? 'bg-[rgba(0,238,252,0.1)] text-[var(--secondary)] border-[rgba(0,238,252,0.3)]'
                    : 'bg-[rgba(255,180,171,0.1)] text-[var(--error)] border-[rgba(255,180,171,0.3)]'
                }`}
              >
                {carryOverAmount > 0 ? '+' : ''}{formatCurrency(carryOverAmount, currency)} carry-over left
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
          {carryOverAmount !== 0 && (
            <div
              className={`hidden sm:inline-flex badge-pill border font-extrabold text-xs px-3 py-1.5 backdrop-blur-md shadow-sm ${
                carryOverAmount > 0
                  ? 'bg-[rgba(0,238,252,0.1)] text-[var(--secondary)] border-[rgba(0,238,252,0.3)] shadow-[0_0_12px_rgba(0,238,252,0.15)]'
                  : 'bg-[rgba(255,180,171,0.1)] text-[var(--error)] border-[rgba(255,180,171,0.3)]'
              }`}
            >
              {carryOverAmount > 0 ? '+' : ''}{formatCurrency(carryOverAmount, currency)} carry-over
            </div>
          )}
          <span className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[var(--on-surface-variant)] group-hover:text-white group-hover:bg-[var(--primary)]/20 transition-all shadow-sm flex items-center justify-center">
            <ArrowUpRight size={16} className="sm:w-[18px] sm:h-[18px]" />
          </span>
        </div>
      </div>

      {/* Middle Row: Minimal Budget Composition Pills (High-density on mobile) */}
      <div className="my-3 sm:my-5 grid grid-cols-3 gap-2 sm:gap-3 relative z-10">
        <div className="min-w-0 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider flex items-center gap-1 truncate">
            <Wallet size={11} className="text-purple-400 shrink-0" /> Base
          </span>
          <span className="text-xs sm:text-base font-extrabold text-white mt-0.5 sm:mt-1 truncate tabular-nums">
            {formatCurrency(baseBudget, currency)}
          </span>
        </div>

        <div className="min-w-0 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider flex items-center gap-1 truncate">
            <ArrowRightLeft size={11} className="text-[var(--secondary)] shrink-0" /> {middlePillLabel}
          </span>
          <span
            className={`text-xs sm:text-base font-extrabold mt-0.5 sm:mt-1 truncate tabular-nums ${
              middlePillAmount >= 0 ? 'text-[var(--secondary)]' : 'text-[var(--error)]'
            }`}
          >
            {middlePillAmount > 0 ? '+' : ''}{formatCurrency(middlePillAmount, currency)}
          </span>
        </div>

        <div className="min-w-0 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider flex items-center gap-1 truncate">
            <CreditCard size={11} className="text-pink-400 shrink-0" /> Spent
          </span>
          <span className="text-xs sm:text-base font-extrabold text-white mt-0.5 sm:mt-1 truncate tabular-nums">
            {formatCurrency(spent, currency)}
          </span>
        </div>
      </div>

      {/* Bottom Row: Glowing Progress Bar */}
      <div className="relative z-10">
        <div className="flex justify-between items-center text-[11px] sm:text-xs mb-1.5 sm:mb-2 gap-2">
          <span className="font-extrabold text-white flex items-center gap-1.5 min-w-0 truncate tabular-nums">
            <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0" />
            {formatCurrency(spent, currency)} spent{hasBudget ? ` (${percentSpent.toFixed(0)}%)` : ''}
          </span>
          <span className="text-[var(--outline)] font-bold shrink-0 tabular-nums">
            {hasBudget ? `${remainingPercent.toFixed(0)}% available` : 'No budget set'}
          </span>
        </div>

        <div className="h-2.5 sm:h-3 rounded-full bg-white/10 border border-white/10 overflow-hidden relative shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isOverBudget
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                : 'bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 shadow-[0_0_15px_rgba(208,188,255,0.5)]'
            }`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
