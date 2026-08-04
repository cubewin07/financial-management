import { useMemo } from 'react';
import SummaryMetricCard from '../components/ui/SummaryMetricCard';
import CategoryBarChart from '../components/breakdown/CategoryBarChart';
import CategoryHealthCard from '../components/breakdown/CategoryHealthCard';
import DailyTrendChart from '../components/breakdown/DailyTrendChart';
import TopExpensesRow from '../components/breakdown/TopExpensesRow';
import {
  PERIOD_OPTIONS,
  formatCurrency,
  getChartCategoryBreakdown,
  getDailyTrend,
  getMonthOverMonthDelta,
  getProjectedDailyTrend,
  getDailyBurnRate,
} from '../utils/finance';
import { CustomSelect, CustomDatePicker } from '../components/ui/forms';

function SpendingBreakdownPage({
  expenses,
  period,
  summary,
  customRange,
  snapshots,
  onBack,
  onPeriodChange,
  onCustomRangeChange,
  onOpenComments,
  commentCounts,
  onDeleteExpense,
  canDeleteExpense,
  defaultCurrency = 'NZD',
  isLoading = false,
  error = null,
}) {
  const categoryData = useMemo(() => getChartCategoryBreakdown(expenses), [expenses]);

  const categoryLimits = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;
    const currentMonthKey = snapshots[0]?.month; // snapshots are sorted latest first
    const currentSnapshot = snapshots.find((s) => s.month === currentMonthKey);
    return currentSnapshot?.category_limits || null;
  }, [snapshots]);

  const burnRate = useMemo(() => getDailyBurnRate(expenses), [expenses]);

  const { actualTrend, projectedTrend } = useMemo(() => {
    const rawActual = getDailyTrend(expenses);

    let projected = [];
    if (period === 'current-month') {
      projected = getProjectedDailyTrend(rawActual);
    }

    // Convert rawActual to cumulative for plotting
    let runningTotal = 0;
    const cumulativeActual = rawActual.map((item) => {
      runningTotal += item.total;
      return {
        ...item,
        total: runningTotal,
      };
    });

    return { actualTrend: cumulativeActual, projectedTrend: projected };
  }, [expenses, period]);

  const momDelta = useMemo(() => {
    if (period !== 'current-month') return null;
    return getMonthOverMonthDelta(snapshots);
  }, [snapshots, period]);

  return (
    <main className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[var(--primary)] hover:underline mb-2 xl:hidden inline-flex items-center gap-1 font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
          <h1 className="text-headline-lg font-headline-lg text-[var(--on-surface)]">
            Spending Breakdown
          </h1>
          <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
            Where your money went this period.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <button
            type="button"
            onClick={onBack}
            className="hidden xl:inline-flex h-11 px-4 items-center justify-center rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
          >
            Back to dashboard
          </button>

          <div className="w-48">
            <CustomSelect
              options={PERIOD_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
              value={period}
              onChange={onPeriodChange}
            />
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="w-36">
                <CustomDatePicker
                  placeholder="Start"
                  value={customRange?.start || ''}
                  onChange={(val) => onCustomRangeChange({ ...customRange, start: val })}
                />
              </div>
              <span className="text-slate-400 text-sm">to</span>
              <div className="w-36">
                <CustomDatePicker
                  placeholder="End"
                  value={customRange?.end || ''}
                  onChange={(val) => onCustomRangeChange({ ...customRange, end: val })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* High-Density Summary Metrics Grid (2x2 on mobile, 4-col on desktop) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <SummaryMetricCard
          label="Total Spent"
          value={formatCurrency(summary.totalSpent, defaultCurrency)}
          delta={momDelta ? `${momDelta.isIncrease ? '+' : ''}${momDelta.percent}% vs last month` : undefined}
        />
        <SummaryMetricCard
          label="Budget Remaining"
          value={formatCurrency(summary.remaining, defaultCurrency)}
          hint={summary.remaining < 0 ? 'Over budget' : 'On track'}
        />
        <SummaryMetricCard
          label="Daily Burn Rate"
          value={`${formatCurrency(burnRate.dailyAvg, defaultCurrency)}`}
          hint={`Avg over ${burnRate.daysCovered} days`}
        />
        <SummaryMetricCard
          label="Transactions"
          value={String(summary.transactionCount)}
          hint={`${categoryData.length} categories`}
        />
      </div>

      {/* Main Charts & Category Health Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6 flex flex-col">
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-6">
            Category Breakdown
          </h2>
          <CategoryBarChart data={categoryData} categoryLimits={categoryLimits} defaultCurrency={defaultCurrency} />
        </div>

        <CategoryHealthCard
          expenses={expenses}
          categoryLimits={categoryLimits}
          defaultCurrency={defaultCurrency}
        />
      </div>

      {/* Daily Trend Chart */}
      <div className="glass-card p-6">
        <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-6">Daily Cumulative Trend</h2>
        <DailyTrendChart actualTrend={actualTrend} projectedTrend={projectedTrend} defaultCurrency={defaultCurrency} />
      </div>

      {/* Top Expenses (Micro Drilldown Section at Bottom) */}
      <div>
        <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-4">Top Expenses</h2>
        <TopExpensesRow
          expenses={expenses}
          limit={5}
          onOpenComments={onOpenComments}
          commentCounts={commentCounts}
          defaultCurrency={defaultCurrency}
        />
      </div>
    </main>
  );
}

export default SpendingBreakdownPage;
