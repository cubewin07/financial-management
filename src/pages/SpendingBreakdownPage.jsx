import AnimatedSelect from '../components/AnimatedSelect';
import CategoryChart from '../components/CategoryChart';
import ExpenseList from '../components/ExpenseList';
import TrendChart from '../components/TrendChart';
import { FlexibleSummaryGrid } from '../components/SummaryCard';
import { Calendar } from '../components/ui/calendar';
import { format } from 'date-fns';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  PERIOD_OPTIONS,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getCategoryBreakdown,
  getDateRangeMeta,
  getDailyTrend,
  getPeriodLabel,
} from '../utils/finance';

function CalendarGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3V6M17 3V6M4 9H20M5 5H19C19.5523 5 20 5.44772 20 6V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V6C4 5.44772 4.44772 5 5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L13.9 8.1L19 10L13.9 11.9L12 17L10.1 11.9L5 10L10.1 8.1L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfinityGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.178 8.5C15.801 8.5 14.44 11.5 12 11.5C9.56 11.5 8.199 8.5 5.822 8.5C3.711 8.5 2 10.179 2 12.25C2 14.321 3.711 16 5.822 16C8.199 16 9.56 13 12 13C14.44 13 15.801 16 18.178 16C20.289 16 22 14.321 22 12.25C22 10.179 20.289 8.5 18.178 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpendingBreakdownPage({
  expenses,
  period,
  summary,
  customRange,
  onBack,
  onPeriodChange,
  onCustomRangeChange,
}) {
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const categoryData = getCategoryBreakdown(expenses);
  const trendData = getDailyTrend(expenses);
  const averageSpend = expenses.length > 0 ? summary.totalSpent / expenses.length : 0;
  const averagePerDay =
    trendData.length > 0 ? summary.totalSpent / trendData.length : summary.totalSpent;
  const topCategory = categoryData[0];
  const dateMeta = getDateRangeMeta(expenses);
  const selectedRange = useMemo(
    () => ({
      from: customRange?.start ? new Date(`${customRange.start}T00:00:00`) : undefined,
      to: customRange?.end ? new Date(`${customRange.end}T00:00:00`) : undefined,
    }),
    [customRange],
  );
  const periodOptions = [
    {
      ...PERIOD_OPTIONS[0],
      icon: <CalendarGlyph />,
      description: 'Current budget window',
      accent: '#22c55e',
    },
    {
      ...PERIOD_OPTIONS[1],
      icon: <ClockGlyph />,
      description: 'Trailing quarter snapshot',
      accent: '#3b82f6',
    },
    {
      ...PERIOD_OPTIONS[2],
      icon: <SparkGlyph />,
      description: 'Year to date spending',
      accent: '#8b5cf6',
    },
    {
      ...PERIOD_OPTIONS[3],
      icon: <InfinityGlyph />,
      description: 'Everything recorded locally',
      accent: '#f59e0b',
    },
    {
      ...PERIOD_OPTIONS[4],
      icon: <CalendarGlyph />,
      description: 'Choose your own date range',
      accent: '#ec4899',
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
  ];

  const handleRangeSelect = (range) => {
    onCustomRangeChange({
      start: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
      end: range?.to ? format(range.to, 'yyyy-MM-dd') : '',
    });

    if (range?.from && range?.to) {
      setRangePickerOpen(false);
    }
  };

  useEffect(() => {
    if (period === 'custom') {
      setRangePickerOpen(true);
    }
  }, [period]);

  return (
    <main className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-12">
        <section className="premium-card relative z-10 rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5 lg:col-span-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Spending breakdown</p>
              <h2 className="text-4xl font-bold tracking-tight text-white">
                Explore where your money went.
              </h2>
              <p className="max-w-md text-sm text-gray-400">
                Compare category mix, daily movement, and recent purchases across any time window.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="premium-panel rounded-lg px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
            >
              Back to dashboard
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="premium-panel rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Range</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {getPeriodLabel(period, customRange)}
              </p>
            </div>
            <div className="premium-panel rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Days covered</p>
              <p className="mt-2 text-lg font-semibold text-white">{dateMeta.daysCovered || 0}</p>
            </div>
            <div className="premium-panel rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Avg per day</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(averagePerDay)}</p>
            </div>
          </div>
        </section>

        <section className="premium-card relative z-20 rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5 lg:col-span-5">
          <p className="text-sm text-gray-400">Period</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Tune the timeframe
          </h3>
          <p className="mt-3 max-w-md text-sm text-gray-400">
            Use quick presets or set your own start and end dates for a custom review.
          </p>

          <div className="mt-6">
            <AnimatedSelect
              options={periodOptions}
              value={period}
              onChange={onPeriodChange}
              onSelectCustom={() => setRangePickerOpen(true)}
            />
          </div>

          {period === 'custom' ? (
            <button
              type="button"
              onClick={() => setRangePickerOpen(true)}
              className="premium-panel mt-6 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition duration-200 hover:bg-white/10"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Custom range</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {customRange?.start && customRange?.end
                    ? `${formatLongDate(customRange.start)} to ${formatLongDate(customRange.end)}`
                    : 'Choose start and end dates'}
                </p>
              </div>
              <span className="text-sm text-gray-400">
                {customRange?.start && customRange?.end ? 'Edit' : 'Select'}
              </span>
            </button>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="premium-panel rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Top category</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {topCategory?.name || 'No data'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {topCategory ? formatCurrency(topCategory.value) : 'Add expenses to see this.'}
              </p>
            </div>
            <div className="premium-panel rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Coverage</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {dateMeta.startDate ? formatShortDate(dateMeta.startDate) : 'No range'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {dateMeta.endDate ? `to ${formatLongDate(dateMeta.endDate)}` : 'Waiting for dates'}
              </p>
            </div>
          </div>
        </section>
      </section>

      <FlexibleSummaryGrid items={summaryItems} />

      <section className="grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryData} />
        <TrendChart data={trendData} />
      </section>

      <ExpenseList
        expenses={expenses}
        maxItems={8}
        title="Expenses in this period"
        subtitle="Recent activity"
        emptyMessage="No expenses found for this period."
      />

      <AnimatePresence>
        {rangePickerOpen ? (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
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
              className="premium-card w-full max-w-4xl rounded-3xl p-6 sm:p-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-gray-400">Custom range</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Select your spending period
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-gray-400">
                    Pick a start date and an end date. The days between them become your custom range.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customRange?.start && customRange?.end) {
                      setRangePickerOpen(false);
                    }
                  }}
                  className="premium-panel rounded-xl px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-white/10"
                >
                  {customRange?.start && customRange?.end ? 'Close' : 'Choose both dates'}
                </button>
              </div>

              <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={selectedRange}
                    onSelect={handleRangeSelect}
                    defaultMonth={selectedRange.from}
                  />
                </div>

                <div className="space-y-3">
                  <div className="premium-panel min-h-[112px] rounded-2xl px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Start</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {customRange?.start ? formatLongDate(customRange.start) : 'Pick the first day'}
                    </p>
                  </div>
                  <div className="premium-panel min-h-[112px] rounded-2xl px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-400">End</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {customRange?.end ? formatLongDate(customRange.end) : 'Pick the last day'}
                    </p>
                  </div>
                  <div className="premium-panel min-h-[132px] rounded-2xl px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Period</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {customRange?.start && customRange?.end
                        ? `${getPeriodLabel('custom', customRange)}`
                        : 'Waiting for both dates'}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
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
