import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function DailyTrendChart({ actualTrend, projectedTrend, previousMonthTrend, defaultCurrency = 'NZD', effectiveBudget = 0 }) {
  const [showProjection, setShowProjection] = useState(true);
  const [showIdeal, setShowIdeal] = useState(true);

  if (!actualTrend || actualTrend.length === 0) {
    return <EmptyState title="No trend data" description="No daily trend information recorded for this period." />;
  }

  // Map previous month trend by date label for easy overlay lookup
  const prevMonthLookup = new Map(
    (previousMonthTrend || []).map((item) => [item.date, item.total])
  );

  const hasIdeal = effectiveBudget > 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Combine actual, projected, previous month trend data, and ideal linear baseline
  const combinedData = actualTrend.map((item) => {
    const dayNum = item.isoDate ? new Date(item.isoDate).getDate() : 1;
    const idealVal = hasIdeal ? Math.round((effectiveBudget / daysInMonth) * dayNum) : null;

    return {
      date: item.date,
      isoDate: item.isoDate,
      Actual: item.total,
      'Prev Month': prevMonthLookup.get(item.date) ?? null,
      'Ideal Budget': idealVal,
    };
  });

  if (showProjection && projectedTrend && projectedTrend.length > 0) {
    projectedTrend.forEach((item) => {
      const dayNum = item.isoDate ? new Date(item.isoDate).getDate() : 1;
      const idealVal = hasIdeal ? Math.round((effectiveBudget / daysInMonth) * dayNum) : null;
      const existing = combinedData.find((d) => d.isoDate === item.isoDate);

      if (existing) {
        existing.Projected = item.total;
      } else {
        combinedData.push({
          date: item.date,
          isoDate: item.isoDate,
          Projected: item.total,
          'Prev Month': prevMonthLookup.get(item.date) ?? null,
          'Ideal Budget': idealVal,
        });
      }
    });
  }

  // Sort by date
  combinedData.sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));

  const hasProjectionData = projectedTrend && projectedTrend.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs font-medium text-[var(--on-surface-variant)] justify-between flex-wrap">
        <span className="text-[11px] text-slate-400">
          {hasProjectionData && showProjection ? 'Cumulative pace vs ideal budget runway.' : 'Cumulative spending pace.'}
        </span>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded bg-[#00eefc]" />
            <span className="text-slate-200">This Month</span>
          </div>

          {hasIdeal && (
            <button
              type="button"
              onClick={() => setShowIdeal(!showIdeal)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${
                showIdeal
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle ideal linear budget trajectory"
            >
              <div className="w-3 h-0.5 rounded border-b-2 border-dashed border-emerald-400" />
              <span>Ideal Runway</span>
            </button>
          )}

          {previousMonthTrend && previousMonthTrend.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-0.5 rounded border-b-2 border-dashed border-[#c084fc]" />
              <span className="text-[#c084fc] font-semibold">Last Month (Ghost)</span>
            </div>
          )}

          {hasProjectionData && (
            <button
              type="button"
              onClick={() => setShowProjection(!showProjection)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${
                showProjection
                  ? 'bg-slate-700/60 border-slate-500 text-slate-200'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle forecast projection line"
            >
              <div className={`w-3 h-0.5 rounded border-b border-dashed ${showProjection ? 'border-slate-300' : 'border-slate-500'}`} />
              <span>Forecast</span>
            </button>
          )}
        </div>
      </div>

      <div className="h-72 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combinedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              stroke="var(--on-surface-variant)" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              minTickGap={25}
            />
            <YAxis 
              tickFormatter={(val) => formatCurrency(val, defaultCurrency)}
              stroke="var(--on-surface-variant)" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              width={75}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                color: 'var(--on-surface)',
                backdropFilter: 'blur(10px)',
              }}
              itemStyle={{ color: 'var(--on-surface)', fontSize: '12px' }}
              formatter={(value, name) => {
                let label = name;
                if (name === 'Projected') label = 'Projected (Pace Forecast)';
                if (name === 'Ideal Budget') label = 'Ideal Linear Budget';
                return [formatCurrency(value, defaultCurrency), label];
              }}
              labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px', fontSize: '11px' }}
            />
            {hasIdeal && showIdeal && (
              <Line
                type="monotone"
                dataKey="Ideal Budget"
                stroke="#34d399"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.8}
                dot={false}
                activeDot={false}
              />
            )}
            {previousMonthTrend && previousMonthTrend.length > 0 && (
              <Line
                type="monotone"
                dataKey="Prev Month"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.85}
                dot={false}
                activeDot={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="Actual"
              stroke="#00eefc"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: '#00eefc' }}
            />
            {showProjection && hasProjectionData && (
              <Line
                type="monotone"
                dataKey="Projected"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.65}
                dot={false}
                activeDot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DailyTrendChart;
