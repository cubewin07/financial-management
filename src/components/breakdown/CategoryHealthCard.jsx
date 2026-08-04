import { formatCurrency, getCategoryHealthAlerts } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function CategoryHealthCard({ expenses = [], categoryLimits = null, defaultCurrency = 'NZD' }) {
  const { items, alertCount } = getCategoryHealthAlerts(expenses, categoryLimits);

  if (!items || items.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col justify-center items-center h-full">
        <EmptyState title="No category health data" description="Record expenses to track category budget limits." />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
            Category Budget Health
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
            Spending relative to set category limits
          </p>
        </div>
        {alertCount > 0 ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {alertCount} Needs Attention
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            All Limits On Track
          </span>
        )}
      </div>

      <div className="space-y-4 overflow-y-auto max-h-72 pr-1 custom-scrollbar">
        {items.map((cat) => {
          const formattedSpent = formatCurrency(cat.value, defaultCurrency);
          const formattedLimit = cat.hasLimit ? formatCurrency(cat.limit, defaultCurrency) : null;
          
          let progressColor = 'bg-teal-500';
          let textColor = 'text-[var(--on-surface)]';

          if (cat.isOverBudget) {
            progressColor = 'bg-rose-500';
            textColor = 'text-rose-400';
          } else if (cat.isWarning) {
            progressColor = 'bg-amber-500';
            textColor = 'text-amber-400';
          }

          const barPercent = cat.hasLimit ? Math.min(cat.utilization, 100) : 100;

          return (
            <div key={cat.name} className="p-3 rounded-xl bg-[var(--surface-container-high)]/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--on-surface)]">{cat.name}</span>
                  {cat.isOverBudget && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300">
                      Over limit
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-bold ${textColor}`}>{formattedSpent}</span>
                  {cat.hasLimit && (
                    <span className="text-[var(--on-surface-variant)] ml-1">
                      / {formattedLimit}
                    </span>
                  )}
                </div>
              </div>

              {cat.hasLimit ? (
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--on-surface-variant)]">
                    <span>{cat.utilization}% used</span>
                    <span>
                      {cat.isOverBudget
                        ? `${formatCurrency(cat.value - cat.limit, defaultCurrency)} over`
                        : `${formatCurrency(cat.limit - cat.value, defaultCurrency)} left`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--on-surface-variant)] italic">
                  No limit configured
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryHealthCard;
