import CarryOverPill from './CarryOverPill';
import {
  formatCurrency,
  getBudgetProgressTone,
  getBudgetRemainingPercent,
} from '../utils/finance';

function BalanceCard({ remaining, effectiveBudget, spent, carryOverAmount, onClick }) {
  const progress = effectiveBudget <= 0 ? 0 : Math.min((spent / effectiveBudget) * 100, 100);
  const isOverspent = remaining < 0;
  const remainingPercent = getBudgetRemainingPercent(remaining, effectiveBudget);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group section-shell section-shell-purple block w-full rounded-[32px] p-6 text-left sm:p-8"
    >
      <div className="transition-transform duration-200 group-hover:scale-[1.01]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Remaining this month</p>
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">
              Effective budget: {formatCurrency(effectiveBudget)}
            </p>
          </div>
          <span className="inline-flex min-h-11 items-center rounded-full border border-[rgba(124,111,224,0.22)] bg-[rgba(124,111,224,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-purple)]">
            Open breakdown
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <h2
              className={`text-5xl font-semibold tracking-tight tabular-nums sm:text-7xl ${
                isOverspent ? 'text-[var(--accent-coral)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {formatCurrency(remaining)}
            </h2>
            <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              {formatCurrency(spent)} spent from your current working budget.
            </p>
            <CarryOverPill amount={carryOverAmount} />
          </div>

          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>Budget used</span>
              <span className="tabular-nums text-[var(--text-primary)]">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: getBudgetProgressTone(progress),
                }}
              />
            </div>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[var(--text-secondary)]">
                {isOverspent
                  ? 'You are running behind your effective budget this month.'
                  : `${remainingPercent.toFixed(0)}% of this month’s working budget is still available.`}
              </p>
              <span className="text-[var(--text-tertiary)]">View details</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default BalanceCard;
