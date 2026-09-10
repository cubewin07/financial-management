import { useState } from 'react';
import { Sliders, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  formatCurrency,
  getCategorySideBySideComparison,
  getCategoryHealthAlerts,
  CATEGORIES,
  getCategoryColor,
} from '../../utils/finance';
import CategoryLimitsModal from './CategoryLimitsModal';

export default function CategoryAnalysisTable({
  expenses = [],
  period = 'current-month',
  customRange = null,
  categoryLimits = null,
  allExpenses = [],
  defaultCurrency = 'NZD',
  onSaveCategoryLimits,
  selectedCategory = null,
  onSelectCategory = null,
}) {
  const [showZeroSpend, setShowZeroSpend] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);

  // Raw side-by-side comparison data
  const comparisonItems = getCategorySideBySideComparison(expenses, period, customRange, allExpenses);
  // Health alert details
  const { items: healthItems, alertCount } = getCategoryHealthAlerts(expenses, categoryLimits, allExpenses);

  if ((!comparisonItems || comparisonItems.length === 0) && (!healthItems || healthItems.length === 0)) {
    return (
      <div className="glass-card p-6 flex flex-col justify-center items-center h-full">
        <EmptyState title="No category data" description="No expenses recorded for period comparison or health tracking." />
      </div>
    );
  }

  // Build a lookup map of health item data by category name
  const healthLookup = new Map((healthItems || []).map((item) => [item.name, item]));

  // Combine comparison & health details for all standard categories + any custom ones present
  const allCategoryNames = Array.from(
    new Set([
      ...CATEGORIES,
      ...comparisonItems.map((c) => c.name),
      ...healthItems.map((h) => h.name),
    ])
  );

  const totalSpentAll = comparisonItems.reduce((sum, item) => sum + (item.currentVal || 0), 0);

  const mergedRows = allCategoryNames.map((catName) => {
    const comp = comparisonItems.find((c) => c.name === catName) || {
      name: catName,
      currentVal: 0,
      prevVal: 0,
      diffVal: 0,
      diffPercent: 0,
      shareOfTotal: 0,
      color: getCategoryColor(catName),
    };

    const health = healthLookup.get(catName) || {
      limit: categoryLimits?.[catName] || null,
      hasLimit: Boolean(categoryLimits?.[catName]),
      utilization: null,
      isOverBudget: false,
      isWarning: false,
    };

    const share = totalSpentAll > 0 ? Math.round(((comp.currentVal || 0) / totalSpentAll) * 100) : 0;

    return {
      name: catName,
      color: comp.color || getCategoryColor(catName),
      currentVal: comp.currentVal || 0,
      prevVal: comp.prevVal || 0,
      diffVal: comp.diffVal || 0,
      diffPercent: comp.diffPercent || 0,
      shareOfTotal: share,
      limit: health.limit,
      hasLimit: health.hasLimit,
      utilization: health.utilization,
      isOverBudget: health.isOverBudget,
      isWarning: health.isWarning,
    };
  });

  // Sort rows: active spending / over budget first, then by currentVal descending
  mergedRows.sort((a, b) => {
    if (a.isOverBudget && !b.isOverBudget) return -1;
    if (!a.isOverBudget && b.isOverBudget) return 1;
    if (b.currentVal !== a.currentVal) return b.currentVal - a.currentVal;
    if (b.prevVal !== a.prevVal) return b.prevVal - a.prevVal;
    return 0;
  });

  // Partition into active vs zero-spend categories
  const activeRows = mergedRows.filter((r) => r.currentVal > 0 || r.prevVal > 0 || r.hasLimit);
  const zeroSpendRows = mergedRows.filter((r) => r.currentVal === 0 && r.prevVal === 0 && !r.hasLimit);

  const displayedRows = showZeroSpend ? mergedRows : activeRows;
  const hasAnyLimits = mergedRows.some((r) => r.hasLimit);

  const getPeriodComparisonLabel = () => {
    if (period === 'current-month') return 'vs Prev Month';
    if (period === 'last-90-days') return 'vs Prior 90 Days';
    if (period === 'this-year') return 'vs Last Year';
    return 'vs Prior Period';
  };

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col">
      {/* Header with Title & Action Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
              Category Analysis & Budget Health
            </h2>
            <button
              type="button"
              onClick={() => setIsLimitsModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-colors inline-flex items-center gap-1"
              title="Set or Edit Category Budget Limits"
            >
              <Sliders size={12} />
              <span>Edit Limits</span>
            </button>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
            Spending vs. limits and raw change {getPeriodComparisonLabel()}
          </p>
        </div>

        {/* Health Status Indicator Pill */}
        <div>
          {hasAnyLimits ? (
            alertCount > 0 ? (
              <button
                type="button"
                onClick={() => setIsLimitsModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors flex items-center gap-1"
              >
                <AlertTriangle size={12} />
                {alertCount} Over/Near Limit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLimitsModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors flex items-center gap-1"
              >
                <CheckCircle size={12} />
                Limits On Track
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => setIsLimitsModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors flex items-center gap-1"
            >
              <Sliders size={12} />
              Set Budget Limits
            </button>
          )}
        </div>
      </div>

      {/* Unified Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[var(--on-surface-variant)] font-semibold">
              <th className="pb-3 pt-1 px-2">Category</th>
              <th className="pb-3 pt-1 px-2 text-right">Current Spent</th>
              <th className="pb-3 pt-1 px-3 min-w-[180px]">Budget Health</th>
              <th className="pb-3 pt-1 px-2 text-right">Prev Period & Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayedRows.map((cat) => {
              const currentFormatted = formatCurrency(cat.currentVal, defaultCurrency);
              const prevFormatted = formatCurrency(cat.prevVal, defaultCurrency);
              const diffFormatted = formatCurrency(Math.abs(cat.diffVal), defaultCurrency);
              const isIncrease = cat.diffVal > 0;
              const isDecrease = cat.diffVal < 0;

              let progressBarColor = 'bg-teal-400';
              if (cat.isOverBudget) progressBarColor = 'bg-rose-500';
              else if (cat.isWarning) progressBarColor = 'bg-amber-400';

              const barPercent = cat.hasLimit ? Math.min(cat.utilization || 0, 100) : 0;

              const isSelected = selectedCategory?.toLowerCase() === cat.name.toLowerCase();

              return (
                <tr
                  key={cat.name}
                  onClick={() => onSelectCategory?.(isSelected ? null : cat.name)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/20 text-white font-semibold'
                      : 'hover:bg-white/[0.04]'
                  }`}
                  title={isSelected ? 'Click to clear filter' : `Click to filter by ${cat.name}`}
                >
                  {/* Category Name & Color */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className={`font-semibold ${isSelected ? 'text-purple-200' : 'text-[var(--on-surface)]'}`}>{cat.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-300 font-bold">
                          Active
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Current Spend */}
                  <td className="py-3 px-2 text-right font-mono font-bold text-slate-100">
                    {currentFormatted}
                  </td>

                  {/* Budget Health / Utilization Bar */}
                  <td className="py-3 px-3">
                    {cat.hasLimit ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium text-slate-300">
                            Limit: {formatCurrency(cat.limit, defaultCurrency)}
                          </span>
                          <span className={cat.isOverBudget ? 'text-rose-400 font-bold' : cat.isWarning ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                            {cat.utilization}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">—</span>
                    )}
                  </td>

                  {/* Previous Period & Raw Change */}
                  <td className="py-3 px-2 text-right font-mono font-medium">
                    <div className="text-[11px] text-slate-400">{prevFormatted}</div>
                    <div className="text-[10px]">
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
                        <span className="text-slate-500">$0.00 (0%)</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Collapsible Row for Zero-Spend Categories */}
      {zeroSpendRows.length > 0 && (
        <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>
            {zeroSpendRows.length} category{zeroSpendRows.length === 1 ? '' : 'ies'} with $0 spend this period ({zeroSpendRows.map((r) => r.name).join(', ')})
          </span>
          <button
            type="button"
            onClick={() => setShowZeroSpend(!showZeroSpend)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <span>{showZeroSpend ? 'Hide zero spend' : 'Show all'}</span>
            {showZeroSpend ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      {/* Category Budget Limits Modal */}
      <CategoryLimitsModal
        open={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
        categoryLimits={categoryLimits}
        onSaveCategoryLimits={onSaveCategoryLimits}
        defaultCurrency={defaultCurrency}
      />
    </div>
  );
}
