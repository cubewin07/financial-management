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

function DailyTrendChart({ actualTrend, projectedTrend, previousMonthTrend, defaultCurrency = 'NZD' }) {
  if (!actualTrend || actualTrend.length === 0) {
    return <EmptyState title="No trend data" description="No daily trend information recorded for this period." />;
  }

  // Map previous month trend by date label for easy overlay lookup
  const prevMonthLookup = new Map(
    (previousMonthTrend || []).map((item) => [item.date, item.total])
  );

  // Combine actual, projected, and previous month trend data
  const combinedData = actualTrend.map((item) => ({
    date: item.date,
    isoDate: item.isoDate,
    Actual: item.total,
    'Prev Month': prevMonthLookup.get(item.date) ?? null,
  }));

  if (projectedTrend && projectedTrend.length > 0) {
    projectedTrend.forEach((item) => {
      const existing = combinedData.find((d) => d.isoDate === item.isoDate);
      if (existing) {
        existing.Projected = item.total;
      } else {
        combinedData.push({
          date: item.date,
          isoDate: item.isoDate,
          Projected: item.total,
          'Prev Month': prevMonthLookup.get(item.date) ?? null,
        });
      }
    });
  }

  // Sort by date
  combinedData.sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs font-medium text-[var(--on-surface-variant)] justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 rounded bg-[#00eefc]" />
          <span>This Month</span>
        </div>
        {previousMonthTrend && previousMonthTrend.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded border-b border-dashed border-purple-400/60" />
            <span className="text-purple-300/80">Last Month (Ghost)</span>
          </div>
        )}
        {projectedTrend && projectedTrend.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded border-b border-dashed border-slate-400" />
            <span>Projected</span>
          </div>
        )}
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
              formatter={(value, name) => [formatCurrency(value, defaultCurrency), name]}
              labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px', fontSize: '11px' }}
            />
            {previousMonthTrend && previousMonthTrend.length > 0 && (
              <Line
                type="monotone"
                dataKey="Prev Month"
                stroke="#c084fc"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.6}
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
            {projectedTrend && projectedTrend.length > 0 && (
              <Line
                type="monotone"
                dataKey="Projected"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 4"
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
