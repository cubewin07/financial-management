import {
  formatCurrency,
  getBudgetProgressTone,
  getBudgetRemainingPercent,
} from '../utils/finance';

function BalanceCard({ remaining, budget, spent, onClick }) {
  const progress = Math.min((spent / budget) * 100, 100);
  const isOverspent = remaining < 0;
  const progressTone = getBudgetProgressTone(progress);
  const remainingPercent = getBudgetRemainingPercent(remaining, budget);

  return (
    <button
      type="button"
      onClick={onClick}
      className="premium-card block w-full rounded-2xl p-8 text-left transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Remaining this month</p>
          <p className="mt-1 text-sm text-gray-500">Money left this month</p>
        </div>
        <span className="premium-panel rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          Open breakdown
        </span>
      </div>
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-4">
          <h2
            className={`text-6xl font-extrabold tracking-tight [text-shadow:0_6px_24px_rgba(34,197,94,0.18)] sm:text-7xl ${
              isOverspent ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {formatCurrency(remaining)}
          </h2>
          <p className="max-w-md text-sm text-gray-400">
            {formatCurrency(spent)} spent from {formatCurrency(budget)}.
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Budget used</span>
            <span className="text-white">{progress.toFixed(0)}%</span>
          </div>
          <div className="premium-panel h-2 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressTone} transition-all`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-400">
              {isOverspent
                ? 'You are over budget this month.'
                : `${remainingPercent.toFixed(0)}% of your budget is still available.`}
            </p>
            <span className="text-gray-500">View details</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default BalanceCard;
