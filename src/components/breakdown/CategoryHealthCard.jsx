import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, CheckCircle, Sliders } from 'lucide-react';
import { formatCurrency, getCategoryHealthAlerts } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function CategoryHealthCard({ expenses = [], categoryLimits = null, allExpenses = [], defaultCurrency = 'NZD' }) {
  const navigate = useNavigate();
  const { items, alertCount } = getCategoryHealthAlerts(expenses, categoryLimits, allExpenses);

  if (!items || items.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col justify-center items-center h-full">
        <EmptyState title="No category health data" description="Record expenses to track category budget limits." />
      </div>
    );
  }

  const hasAnyLimits = items.some((item) => item.hasLimit);

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
              Category Budget Health
            </h2>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-colors inline-flex items-center gap-1"
              title="Configure Category Limits in Settings"
            >
              <Sliders size={12} />
              <span>Edit Limits</span>
            </button>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
            Spending relative to set limits & historical 3-month averages
          </p>
        </div>
        {hasAnyLimits ? (
          alertCount > 0 ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <AlertTriangle size={12} />
              {alertCount} Needs Attention
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle size={12} />
              All Limits On Track
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors flex items-center gap-1"
          >
            <Sliders size={12} />
            Set Category Limits
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map((cat) => {
          const formattedSpent = formatCurrency(cat.value, defaultCurrency);
          const formattedLimit = cat.hasLimit ? formatCurrency(cat.limit, defaultCurrency) : null;
          const formattedTrailing = cat.trailingAvg ? formatCurrency(cat.trailingAvg, defaultCurrency) : null;
          
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
            <div key={cat.name} className="p-3.5 rounded-xl bg-[var(--surface-container-high)]/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[var(--on-surface)]">{cat.name}</span>
                  {cat.isOverBudget && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Over limit
                    </span>
                  )}
                  {cat.isWarning && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <AlertCircle size={10} />
                      Near limit
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
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
                <div className="flex items-center justify-between text-[11px] text-[var(--on-surface-variant)]">
                  <span className="italic">No limit set</span>
                  {formattedTrailing && (
                    <span className="text-slate-400">
                      3-mo avg: {formattedTrailing} {cat.trailingDeltaPercent !== null && (
                        <span className={cat.trailingDeltaPercent > 0 ? 'text-amber-400 font-semibold' : 'text-teal-400 font-semibold'}>
                          ({cat.trailingDeltaPercent > 0 ? '+' : ''}{cat.trailingDeltaPercent}%)
                        </span>
                      )}
                    </span>
                  )}
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
