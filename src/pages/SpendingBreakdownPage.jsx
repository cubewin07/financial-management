import { useState, useMemo } from 'react';
import { CreditCard, ShieldCheck, Calendar, Zap, PieChart, ArrowUpRight, BarChart2, LayoutGrid, Clock, ListOrdered } from 'lucide-react';
import SummaryMetricCard from '../components/SummaryMetricCard';
import CategoryBarChart from '../components/breakdown/CategoryBarChart';
import CategoryAnalysisTable from '../components/breakdown/CategoryAnalysisTable';
import DailyTrendChart from '../components/breakdown/DailyTrendChart';
import TopExpensesRow from '../components/breakdown/TopExpensesRow';
import VerdictBlock from '../components/breakdown/VerdictBlock';
import TimePatternVerdict from '../components/breakdown/TimePatternVerdict';
import TransactionVerdict from '../components/breakdown/TransactionVerdict';
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
  getExpenseStats,
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
  onSaveCategoryLimits,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categoryData = useMemo(() => getChartCategoryBreakdown(expenses), [expenses]);
  const activeAllExpenses = allExpenses.length > 0 ? allExpenses : expenses;
  const expenseStats = useMemo(() => getExpenseStats(expenses), [expenses]);

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

  const effectiveBudget = (summary.remaining || 0) + (summary.totalSpent || 0);

  // Purposeful pacing metrics for card visualizations
  const currentMonthPacing = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
    const safeAllowance = effectiveBudget > 0 ? Math.max(0, (summary.remaining || 0) / daysRemaining) : 0;
    const isBurnUnderSafe = effectiveBudget > 0 ? burnRate.dailyAvg <= safeAllowance : true;
    const remainingPercent = effectiveBudget > 0
      ? Math.max(0, Math.round(((summary.remaining || 0) / effectiveBudget) * 100))
      : 0;
    const largestSharePercent = expenseStats.maxTransaction && summary.totalSpent > 0
      ? Math.round((expenseStats.maxTransaction.amount / summary.totalSpent) * 100)
      : 0;

    return {
      daysInMonth,
      currentDay,
      daysRemaining,
      safeAllowance,
      isBurnUnderSafe,
      remainingPercent,
      largestSharePercent,
    };
  }, [effectiveBudget, summary.remaining, summary.totalSpent, burnRate.dailyAvg, expenseStats.maxTransaction]);

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

      {/* Interactive Category Filter Banner (Laptop & Mobile) */}
      {selectedCategory && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200 animate-in fade-in shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
            <span>
              Filtered by <strong className="text-white font-bold">{selectedCategory}</strong> ({expenses.filter((e) => (e.category || '').toLowerCase() === selectedCategory.toLowerCase()).length} transactions)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors text-xs"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Top Hero Command Banner: Verdict & Pace */}
      {period === 'current-month' && (
        <VerdictBlock
          totalSpent={summary.totalSpent}
          effectiveBudget={effectiveBudget}
          burnRate={burnRate}
          period={period}
          defaultCurrency={defaultCurrency}
          variant="detailed"
        />
      )}

      {/* Tiered Metrics Section: Primary Hero Metrics */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Tier 1: Core Primary Metrics (2 Columns) */}
        <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2">
          <SummaryMetricCard
            featured={true}
            variant="cyan"
            icon={CreditCard}
            label="Total Spent"
            value={formatCurrency(summary.totalSpent, defaultCurrency)}
            delta={momDelta ? `${momDelta.isIncrease ? '+' : ''}${momDelta.percent}% vs last month` : undefined}
            invertDeltaColor={true}
            hint={`${summary.transactionCount} transactions recorded`}
          />

          {period === 'current-month' ? (
            <SummaryMetricCard
              featured={true}
              variant={summary.remaining < 0 ? 'rose' : 'emerald'}
              icon={ShieldCheck}
              circularGauge={{
                percent: currentMonthPacing.remainingPercent,
                color: summary.remaining < 0
                  ? 'text-rose-400'
                  : currentMonthPacing.remainingPercent < 20
                  ? 'text-amber-400'
                  : 'text-emerald-400',
                label: summary.remaining < 0 ? '0%' : `${currentMonthPacing.remainingPercent}%`,
              }}
              label="Budget Remaining"
              value={formatCurrency(summary.remaining, defaultCurrency)}
              statusBadge={
                summary.remaining < 0
                  ? { text: 'Over Budget', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
                  : { text: 'On Track', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
              }
              hint={effectiveBudget > 0 ? `${Math.round((summary.totalSpent / effectiveBudget) * 100)}% used of ${formatCurrency(effectiveBudget, defaultCurrency)} limit` : undefined}
            />
          ) : (
            <SummaryMetricCard
              featured={true}
              variant="sky"
              icon={Calendar}
              label="Monthly Average"
              value={`${formatCurrency(monthlyAvgInfo.avg, defaultCurrency)} / mo`}
              hint={`Averaged across ${monthlyAvgInfo.monthsCount} month${monthlyAvgInfo.monthsCount === 1 ? '' : 's'}`}
            />
          )}
        </div>

        {/* Tier 2: Secondary Supporting Metrics (3 Columns) */}
        <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3">
          <SummaryMetricCard
            variant="amber"
            icon={Zap}
            label="Daily Burn Rate"
            value={`${formatCurrency(burnRate.dailyAvg, defaultCurrency)}`}
            statusBadge={
              period === 'current-month' && effectiveBudget > 0
                ? {
                    text: currentMonthPacing.isBurnUnderSafe ? 'Safe Pace' : 'High Pace',
                    color: currentMonthPacing.isBurnUnderSafe
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                  }
                : undefined
            }
            hint={
              period === 'current-month' && effectiveBudget > 0
                ? `Cap: ${formatCurrency(currentMonthPacing.safeAllowance, defaultCurrency)}/d (${burnRate.daysCovered}d avg)`
                : `Avg across ${burnRate.daysCovered} days`
            }
          />

          <SummaryMetricCard
            variant="purple"
            icon={PieChart}
            label="Fixed vs Discretionary"
            value={`${fixedVsDisc.fixedPercent}% Fixed`}
            segmentedRatio={{
              segments: [
                {
                  label: 'Fixed',
                  percent: fixedVsDisc.fixedPercent,
                  bgColor: 'bg-purple-500',
                  dotColor: 'bg-purple-400',
                  amount: formatCurrency(fixedVsDisc.fixedTotal, defaultCurrency),
                },
                {
                  label: 'Flex',
                  percent: fixedVsDisc.discretionaryPercent,
                  bgColor: 'bg-teal-400',
                  dotColor: 'bg-teal-300',
                  amount: formatCurrency(fixedVsDisc.discretionaryTotal, defaultCurrency),
                },
              ],
            }}
            hint={`Fixed: ${formatCurrency(fixedVsDisc.fixedTotal, defaultCurrency)} • Flex: ${formatCurrency(fixedVsDisc.discretionaryTotal, defaultCurrency)}`}
          />

          <div className="col-span-2 sm:col-span-1 h-full">
            <SummaryMetricCard
              variant="sky"
              icon={ArrowUpRight}
              label="Largest Transaction"
              value={expenseStats.maxTransaction ? formatCurrency(expenseStats.maxTransaction.amount, defaultCurrency) : '$0.00'}
              statusBadge={
                expenseStats.maxTransaction && summary.totalSpent > 0
                  ? {
                      text: `${currentMonthPacing.largestSharePercent}% of total`,
                      color: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold',
                    }
                  : undefined
              }
              hint={
                expenseStats.maxTransaction
                  ? `${expenseStats.maxTransaction.category}${expenseStats.maxTransaction.note ? ` • ${expenseStats.maxTransaction.note}` : ''}`
                  : `Median: ${formatCurrency(expenseStats.median, defaultCurrency)}`
              }
            />
          </div>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="border-b border-white/10 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-purple-500/25 text-purple-100 border border-purple-500/40 shadow-lg shadow-purple-500/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Overview & Categories</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('time-patterns')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'time-patterns'
                ? 'bg-purple-500/25 text-purple-100 border border-purple-500/40 shadow-lg shadow-purple-500/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Clock size={16} />
            <span>Time & Day Patterns</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-purple-500/25 text-purple-100 border border-purple-500/40 shadow-lg shadow-purple-500/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <ListOrdered size={16} />
            <span>Top Expenses & Insights</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Overview & Categories */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Daily Cumulative Trend Chart */}
          <div className="glass-card p-5 sm:p-6">
            <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-1">
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
              effectiveBudget={effectiveBudget}
            />
          </div>

          {/* Consolidated Category Analysis Table & Category Bar Chart Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <CategoryAnalysisTable
                expenses={expenses}
                period={period}
                customRange={customRange}
                categoryLimits={categoryLimits}
                allExpenses={activeAllExpenses}
                defaultCurrency={defaultCurrency}
                onSaveCategoryLimits={onSaveCategoryLimits}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            <div className="lg:col-span-5 glass-card p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-1">
                  Category Spending Distribution
                </h2>
                <p className="text-xs text-[var(--on-surface-variant)] mb-4">
                  Visual proportion across spending categories
                </p>
              </div>
              <CategoryBarChart data={categoryData} categoryLimits={categoryLimits} defaultCurrency={defaultCurrency} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Time & Day Patterns */}
      {activeTab === 'time-patterns' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <TimePatternVerdict expenses={expenses} defaultCurrency={defaultCurrency} />
          <DayOfWeekChart expenses={expenses} defaultCurrency={defaultCurrency} />
        </div>
      )}

      {/* Tab 3: Top Expenses & Insights */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
                  Top Expenses {selectedCategory ? `(${selectedCategory})` : ''}
                </h2>
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>
              <TopExpensesRow
                expenses={
                  selectedCategory
                    ? expenses.filter((e) => (e.category || '').toLowerCase() === selectedCategory.toLowerCase())
                    : expenses
                }
                onOpenComments={onOpenComments}
                commentCounts={commentCounts}
                onDeleteExpense={onDeleteExpense}
                canDeleteExpense={canDeleteExpense}
                defaultCurrency={defaultCurrency}
              />
            </div>

            <TransactionVerdict expenses={expenses} defaultCurrency={defaultCurrency} />
          </div>
        </div>
      )}
    </main>
  );
}

export default SpendingBreakdownPage;
