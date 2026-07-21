import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import AnimatedSelect from '../components/AnimatedSelect';
import CategoryChart from '../components/CategoryChart';
import DateRangePicker from '../components/DateRangePicker';
import ExpenseList from '../components/ExpenseList';
import TrendChart from '../components/TrendChart';
import { FlexibleSummaryGrid } from '../components/SummaryCard';
import {
  PERIOD_OPTIONS,
  formatCurrency,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  getChartCategoryBreakdown,
  getDateRangeMeta,
  getDailyTrend,
  getPeriodLabel,
} from '../utils/finance';

function CalendarGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3V6M17 3V6M4 9H20M5 5H19C19.5523 5 20 5.44772 20 6V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V6C4 5.44772 4.44772 5 5 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfinityGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18.178 8.5C15.801 8.5 14.44 11.5 12 11.5C9.56 11.5 8.199 8.5 5.822 8.5C3.711 8.5 2 10.179 2 12.25C2 14.321 3.711 16 5.822 16C8.199 16 9.56 13 12 13C14.44 13 15.801 16 18.178 16C20.289 16 22 14.321 22 12.25C22 10.179 20.289 8.5 18.178 8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
}) {
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const categoryData = getChartCategoryBreakdown(expenses);
  const trendData = getDailyTrend(expenses);
  const averageSpend = expenses.length > 0 ? summary.totalSpent / expenses.length : 0;
  const averagePerDay = trendData.length > 0 ? summary.totalSpent / trendData.length : summary.totalSpent;
  
  const selectedRange = useMemo(
    () => ({
      start: customRange?.start || '',
      end: customRange?.end || '',
    }),
    [customRange],
  );

  const handleCustomRangeChange = (range) => {
    onCustomRangeChange(range);
    if (range.start && range.end) {
      setRangePickerOpen(false);
    }
  };

  const periodOptions = [
    {
      ...PERIOD_OPTIONS[0],
      icon: <CalendarGlyph />,
      description: 'Current budget window',
      accent: '#2DD4BF',
    },
    {
      ...PERIOD_OPTIONS[1],
      icon: <ClockGlyph />,
      description: 'Trailing quarter snapshot',
      accent: '#60A5FA',
    },
    {
      ...PERIOD_OPTIONS[2],
      icon: <SparkGlyph />,
      description: 'Year to date spending',
      accent: '#7C6FE0',
    },
    {
      ...PERIOD_OPTIONS[3],
      icon: <InfinityGlyph />,
      description: 'Everything recorded locally',
      accent: '#FBBF24',
    },
    {
      ...PERIOD_OPTIONS[4],
      icon: <CalendarGlyph />,
      description: 'Choose your own date range',
      accent: '#F87171',
    },
  ];

  const summaryItems = [
    {
      label: 'Total spent',
      value: formatCurrency(summary.totalSpent),
      hint: 'Spending in this period',
    },
    {
      label: 'Transactions',
      value: String(summary.transactionCount),
      hint: 'Expenses recorded',
    },
    {
      label: 'Average spend',
      value: formatCurrency(averageSpend),
      hint: 'Average per expense',
    },
    {
      label: 'Avg per day',
      value: formatCurrency(averagePerDay),
      hint: 'Daily pace across active days',
    },
  ];

  useEffect(() => {
    if (period === 'custom') {
      setRangePickerOpen(true);
    }
  }, [period]);

  return (
    <main className="space-y-6">
      <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8 !overflow-visible relative z-[40]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] transition text-[var(--text-primary)] xl:hidden">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <p className="text-sm text-[var(--text-secondary)]">Spending breakdown</p>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
              Explore where your money went.
            </h2>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Compare category mix, daily movement, and recent purchases across any time window.
            </p>
          </div>

          <div className="flex flex-col gap-4 xl:items-end w-full xl:w-[320px]">
            <button type="button" onClick={onBack} className="btn-secondary hidden xl:inline-flex">
              Back to dashboard
            </button>
            <div className="w-full relative z-30">
              <AnimatedSelect
                options={periodOptions}
                value={period}
                onChange={onPeriodChange}
                onSelectCustom={() => setRangePickerOpen(true)}
              />
            </div>
            {period === 'custom' && (
              <button
                type="button"
                onClick={() => setRangePickerOpen(true)}
                className="text-sm text-[var(--accent-purple)] hover:underline xl:text-right"
              >
                {customRange?.start && customRange?.end
                  ? `${formatShortDate(customRange.start)} - ${formatShortDate(customRange.end)}`
                  : 'Select custom dates'}
              </button>
            )}
          </div>
        </div>
      </section>

      <FlexibleSummaryGrid items={summaryItems} />

      <section className="grid gap-6 xl:grid-cols-2">
        <CategoryChart data={categoryData} />
        <TrendChart data={trendData} />
      </section>

      <section className="section-shell section-shell-blue rounded-[32px] p-6 sm:p-8">
        <div className="mb-6">
           <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Detailed Categories</h3>
           <p className="text-sm text-[var(--text-secondary)] mt-1">Breakdown by category for the selected period.</p>
        </div>
        {categoryData.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {categoryData.map(c => (
              <div key={c.name} className="surface-panel rounded-[20px] p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{backgroundColor: c.color}}></span>
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">{formatCurrency(c.value)}</span>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {summary.totalSpent > 0 ? Math.round((c.value / summary.totalSpent) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-panel rounded-[20px] p-6 text-sm text-[var(--text-secondary)]">No category data for this period.</div>
        )}
      </section>

      <ExpenseList
        expenses={expenses}
        maxItems={8}
        title="Expenses in this period"
        subtitle="Recent activity"
        emptyMessage="No expenses found for this period."
        commentCounts={commentCounts}
        onOpenComments={onOpenComments}
        onDeleteExpense={onDeleteExpense}
        canDeleteExpense={canDeleteExpense}
      />

      <AnimatePresence>
        {rangePickerOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            onClick={() => {
              if (customRange?.start && customRange?.end) {
                setRangePickerOpen(false);
              }
            }}
          >
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
              className="section-shell section-shell-purple w-full max-w-6xl rounded-[32px] p-5 sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Custom range</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    Select your spending period
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                    Pick a start date and an end date. The days between them form a single continuous band, just like a flight date picker.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customRange?.start && customRange?.end) {
                      setRangePickerOpen(false);
                    }
                  }}
                  className="btn-secondary"
                >
                  {customRange?.start && customRange?.end ? 'Close' : 'Choose both dates'}
                </button>
              </div>

              <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(28,28,40,0.66)] p-3 sm:p-4">
                  <DateRangePicker range={selectedRange} onChange={handleCustomRangeChange} />
                </div>

                <div className="space-y-3">
                  <div className="surface-panel min-h-[112px] rounded-[24px] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Start</p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                      {customRange?.start ? formatLongDate(customRange.start) : 'Pick the first day'}
                    </p>
                  </div>
                  <div className="surface-panel min-h-[112px] rounded-[24px] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">End</p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                      {customRange?.end ? formatLongDate(customRange.end) : 'Pick the last day'}
                    </p>
                  </div>
                  <div className="surface-panel min-h-[132px] rounded-[24px] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Period</p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                      {customRange?.start && customRange?.end
                        ? getPeriodLabel('custom', customRange)
                        : 'Waiting for both dates'}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Select both the start and end date to finish this range and close the picker.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export default SpendingBreakdownPage;
