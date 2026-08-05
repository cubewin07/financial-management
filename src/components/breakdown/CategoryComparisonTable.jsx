import { formatCurrency, getCategorySideBySideComparison } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

export default function CategoryComparisonTable({
  expenses = [],
  period = 'current-month',
  customRange = null,
  allExpenses = [],
  defaultCurrency = 'NZD',
}) {
  const comparisonItems = getCategorySideBySideComparison(expenses, period, customRange, allExpenses);

  if (!comparisonItems || comparisonItems.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col justify-center items-center h-full">
        <EmptyState title="No category comparison data" description="No expenses recorded for period comparison." />
      </div>
    );
  }

  const getPeriodComparisonLabel = () => {
    if (period === 'current-month') return 'vs Previous Month';
    if (period === 'last-90-days') return 'vs Prior 90 Days';
    if (period === 'this-year') return 'vs Last Year';
    return 'vs Prior Period';
  };

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
            Category Comparison (Side-by-Side)
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
            Raw spending comparison {getPeriodComparisonLabel()} (Descriptive analytics)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[var(--on-surface-variant)] font-semibold">
              <th className="pb-3 pt-1 px-2">Category</th>
              <th className="pb-3 pt-1 px-2 text-right">Current Period</th>
              <th className="pb-3 pt-1 px-2 text-right">Previous Period</th>
              <th className="pb-3 pt-1 px-2 text-right">Raw Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comparisonItems.map((cat) => {
              const currentFormatted = formatCurrency(cat.currentVal, defaultCurrency);
              const prevFormatted = formatCurrency(cat.prevVal, defaultCurrency);
              const diffFormatted = formatCurrency(Math.abs(cat.diffVal), defaultCurrency);
              const isIncrease = cat.diffVal > 0;
              const isDecrease = cat.diffVal < 0;

              return (
                <tr key={cat.name} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-[var(--on-surface)]">{cat.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({cat.shareOfTotal}% of total)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-[var(--on-surface)]">
                    {currentFormatted}
                  </td>
                  <td className="py-3 px-2 text-right text-slate-400 font-medium">
                    {prevFormatted}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-medium">
                    {isIncrease && (
                      <span className="text-slate-300">
                        +{diffFormatted} ({cat.diffPercent > 0 ? `+${cat.diffPercent}%` : '0%'})
                      </span>
                    )}
                    {isDecrease && (
                      <span className="text-slate-300">
                        -{diffFormatted} ({cat.diffPercent}%)
                      </span>
                    )}
                    {!isIncrease && !isDecrease && (
                      <span className="text-slate-400">$0.00 (0%)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
