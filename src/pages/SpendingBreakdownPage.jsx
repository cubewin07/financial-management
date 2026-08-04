import { useMemo } from 'react';
import { CreditCard, ShieldCheck, Calendar, Zap, PieChart } from 'lucide-react';
import SummaryMetricCard from '../components/SummaryMetricCard';
import CategoryBarChart from '../components/breakdown/CategoryBarChart';
import CategoryHealthCard from '../components/breakdown/CategoryHealthCard';
import DailyTrendChart from '../components/breakdown/DailyTrendChart';
import TopExpensesRow from '../components/breakdown/TopExpensesRow';
import VerdictBlock from '../components/breakdown/VerdictBlock';
import DayOfWeekChart from '../components/breakdown/DayOfWeekChart';
import {
  PERIOD_OPTIONS,
  formatCurrency,
  getChartCategoryBreakdown,
  getDailyTrend,
  getMonthOverMonthDelta,
  getProjectedDailyTrend,
  getDailyBurnRate,
  getFixedVsDiscretionarySplit,
  getPeriodLabel,
} from '../utils/finance';
import { CustomSelect, CustomDatePicker } from '../components/ui/forms';

function SpendingBreakdownPage({
  expenses = [],
  allExpenses = [],
  period = 'current-month',
  summary = { totalSpent: 0, remaining: 0, transactionCount: 0 },
  customRange,
  snapshots = [],
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
  const activeAllExpenses = allExpenses.length > 0 ? allExpenses : expenses;

  const categoryLimits = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;
    const currentSnapshot = snapshots.find((s) => s.month === snapshots[0]?.month);
    return currentSnapshot?.category_limits || snapshots[0]?.category_limits || null;
  }, [snapshots]);

  const burnRate = useMemo(() => getDailyBurnRate(expenses, period), [expenses, period]);

  const { actualTrend, projectedTrend, previousMonthTrend } = useMemo(() => {
    const { actualTrend: rawActual, previousMonthTrend: prevTrend } = getDailyTrend(
      expenses,
      period,
      customRange,
      activeAllExpenses,
    );

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

    return { actualTrend: cumulativeActual, projectedTrend: projected, previousMonthTrend: prevTrend };
  }, [expenses, period, customRange, activeAllExpenses]);

  const momDelta = useMemo(() => {
    if (period !== 'current-month') return null;
    return getMonthOverMonthDelta(snapshots, null, activeAllExpenses);
  }, [snapshots, period, activeAllExpenses]);

  const fixedVsDisc = useMemo(() => getFixedVsDiscretionarySplit(expenses), [expenses]);
  const periodLabelText = useMemo(() => getPeriodLabel(period, customRange), [period, customRange]);

  // Compute Monthly Average Spend when looking at multi-month ranges
  const monthlyAvgInfo = useMemo(() => {
    let monthsCount = 1;
    if (period === 'last-90-days') {
      monthsCount = 3;
    } else if (period === 'this-year') {
      monthsCount = Math.max(1, new Date().getMonth() + 1);
    } else if (period === 'custom' && customRange?.start && customRange?.end) {
      const startDate = new Date(customRange.start);
      const endDate = new Date(customRange.end);
      const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      monthsCount = Math.max(1, Math.round(diffDays / 30));
    } else if (period === 'all-time') {
      monthsCount = Math.max(1, snapshots.length || 1);
    }
    const avg = summary.totalSpent / monthsCount;
    return { avg, monthsCount };
  }, [period, customRange, snapshots, summary.totalSpent]);

  return (
    <main className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Loading or Sync Error Callout */}
      {isLoading && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
          <span>Updating spending analytics...</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <span>Error loading breakdown: {error}</span>
        </div>
      )}

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
            {periodLabelText} • {summary.transactionCount} transactions across {categoryData.length} categories
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

      {/* Decision Verdict Block (Top Priority for "Should I slack off") */}
      <VerdictBlock
        totalSpent={summary.totalSpent}
        effectiveBudget={summary.remaining + summary.totalSpent}
        burnRate={burnRate}
        period={period}
        defaultCurrency={defaultCurrency}
      />

      {/* Visually Distinct Summary Metrics Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <SummaryMetricCard
          variant="cyan"
          icon={CreditCard}
          label="Total Spent"
          value={formatCurrency(summary.totalSpent, defaultCurrency)}
          delta={momDelta ? `${momDelta.isIncrease ? '+' : ''}${momDelta.percent}% vs last month` : undefined}
          invertDeltaColor={true}
        />

        {period === 'current-month' ? (
          <SummaryMetricCard
            variant="emerald"
            icon={ShieldCheck}
            label="Budget Remaining"
            value={formatCurrency(summary.remaining, defaultCurrency)}
            progress={summary.remaining + summary.totalSpent > 0 ? (summary.totalSpent / (summary.remaining + summary.totalSpent)) * 100 : 0}
            progressColor={summary.remaining < 0 ? 'bg-rose-500' : 'bg-emerald-400'}
            statusBadge={
              summary.remaining < 0
                ? { text: 'Over budget', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
                : { text: 'On track', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
            }
          />
        ) : (
          <SummaryMetricCard
            variant="sky"
            icon={Calendar}
            label="Monthly Average"
            value={`${formatCurrency(monthlyAvgInfo.avg, defaultCurrency)} / mo`}
            hint={`Avg across ${monthlyAvgInfo.monthsCount} month${monthlyAvgInfo.monthsCount === 1 ? '' : 's'}`}
          />
        )}

        <SummaryMetricCard
          variant="amber"
          icon={Zap}
          label="Daily Burn Rate"
          value={`${formatCurrency(burnRate.dailyAvg, defaultCurrency)} / day`}
          hint={`Pace across ${burnRate.daysCovered} days`}
        />

        <SummaryMetricCard
          variant="purple"
          icon={PieChart}
          label="Fixed vs Discretionary"
          value={`${fixedVsDisc.fixedPercent}% Fixed`}
          progress={fixedVsDisc.fixedPercent}
          progressColor="bg-purple-400"
          hint={`Fixed: ${formatCurrency(fixedVsDisc.fixedTotal, defaultCurrency)} • Disc: ${formatCurrency(fixedVsDisc.discretionaryTotal, defaultCurrency)}`}
        />
      </div>

      {/* Daily Cumulative Trend Chart (High Value, Moved Up) */}
      <div className="glass-card p-5 sm:p-6">
        <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-2">
          Daily Cumulative Trend
        </h2>
        <p className="text-xs text-[var(--on-surface-variant)] mb-4">
          Compare cumulative spending trajectory against past month pace
        </p>
        <DailyTrendChart
          actualTrend={actualTrend}
          projectedTrend={projectedTrend}
          previousMonthTrend={previousMonthTrend}
          defaultCurrency={defaultCurrency}
        />
      </div>

      {/* Main Charts & Category Health Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryHealthCard
          expenses={expenses}
          categoryLimits={categoryLimits}
          allExpenses={activeAllExpenses}
          defaultCurrency={defaultCurrency}
        />

        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-4">
            Category Spending Distribution
          </h2>
          <CategoryBarChart data={categoryData} categoryLimits={categoryLimits} defaultCurrency={defaultCurrency} />
        </div>
      </div>

      {/* Day-of-Week Spending Pattern & Top Expenses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DayOfWeekChart expenses={expenses} defaultCurrency={defaultCurrency} />

        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-4">
            Top Expenses
          </h2>
          <TopExpensesRow
            expenses={expenses}
            onOpenComments={onOpenComments}
            commentCounts={commentCounts}
            onDeleteExpense={onDeleteExpense}
            canDeleteExpense={canDeleteExpense}
            defaultCurrency={defaultCurrency}
          />
        </div>
      </div>
    </main>
  );
}

export default SpendingBreakdownPage;
