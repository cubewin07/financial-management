import { useMemo } from 'react';
import SummaryMetricCard from '../components/ui/SummaryMetricCard';
import CategoryBarChart from '../components/breakdown/CategoryBarChart';
import BudgetDonut from '../components/breakdown/BudgetDonut';
import DailyTrendChart from '../components/breakdown/DailyTrendChart';
import TopExpensesRow from '../components/breakdown/TopExpensesRow';
import {
  PERIOD_OPTIONS,
  formatCurrency,
  getChartCategoryBreakdown,
  getDailyTrend,
  getMonthOverMonthDelta,
  getProjectedDailyTrend,
} from '../utils/finance';

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
  defaultCurrency,
}) {
  const categoryData = useMemo(() => getChartCategoryBreakdown(expenses), [expenses]);
  
  const { actualTrend, projectedTrend } = useMemo(() => {
    const rawActual = getDailyTrend(expenses);
    
    let projected = [];
    if (period === 'current-month') {
      projected = getProjectedDailyTrend(rawActual);
    }
    
    // Convert rawActual to cumulative for plotting
    let runningTotal = 0;
    const cumulativeActual = rawActual.map(item => {
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

  const handleCustomStartChange = (e) => {
    onCustomRangeChange({ ...customRange, start: e.target.value });
  };

  const handleCustomEndChange = (e) => {
    onCustomRangeChange({ ...customRange, end: e.target.value });
  };

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </button>
          <h1 className="text-headline-lg font-headline-lg text-[var(--on-surface)]">
            Spending Breakdown
          </h1>
          <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
            Where your money went this period.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onBack} className="btn-secondary hidden xl:inline-flex h-10 px-4 items-center justify-center whitespace-nowrap">
            Back to dashboard
          </button>
          <select 
            value={period} 
            onChange={(e) => onPeriodChange(e.target.value)}
            className="input-shell h-10 px-3 min-w-[160px] cursor-pointer appearance-none bg-[var(--surface-container)] text-[var(--on-surface)] bg-no-repeat"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbc3d7\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px'
            }}
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          {period === 'custom' && (
             <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 value={customRange?.start || ''} 
                 onChange={handleCustomStartChange}
                 className="input-shell h-10 px-3 w-[140px] bg-[var(--surface-container)] text-[var(--on-surface)]"
                 style={{ colorScheme: 'dark' }}
               />
               <span className="text-[var(--on-surface-variant)] text-sm">to</span>
               <input 
                 type="date" 
                 value={customRange?.end || ''} 
                 onChange={handleCustomEndChange}
                 className="input-shell h-10 px-3 w-[140px] bg-[var(--surface-container)] text-[var(--on-surface)]"
                 style={{ colorScheme: 'dark' }}
               />
             </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <SummaryMetricCard
          label="Total Spent"
          value={formatCurrency(summary.totalSpent, defaultCurrency || 'USD')}
          delta={momDelta ? `${momDelta.isIncrease ? '+' : ''}${momDelta.percent}% vs last month` : undefined}
        />
        <SummaryMetricCard
          label="Budget Remaining"
          value={formatCurrency(summary.remaining, defaultCurrency || 'USD')}
          hint={summary.remaining < 0 ? 'Over budget' : 'On track'}
        />
        <SummaryMetricCard
          label="Transactions"
          value={String(summary.transactionCount)}
          hint={`${categoryData.length} categories`}
        />
      </div>

      {/* Top Expenses */}
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

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6 flex flex-col">
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-6">Category Breakdown</h2>
          <CategoryBarChart data={categoryData} defaultCurrency={defaultCurrency} />
        </div>
        
        <div className="glass-card p-6 flex flex-col">
          <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-6">Budget Overview</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
             <BudgetDonut summary={summary} defaultCurrency={defaultCurrency} />
          </div>
        </div>
      </div>
      
      <div className="glass-card p-6">
        <h2 className="text-headline-md font-headline-md text-[var(--on-surface)] mb-6">Daily Trend</h2>
        <DailyTrendChart actualTrend={actualTrend} projectedTrend={projectedTrend} defaultCurrency={defaultCurrency} />
      </div>
    </main>
  );
}

export default SpendingBreakdownPage;
