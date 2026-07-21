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

function DailyTrendChart({ actualTrend, projectedTrend }) {
  if (!actualTrend || actualTrend.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--on-surface-variant)]">
        No trend data available
      </div>
    );
  }

  // Combine actual and projected trend data for the chart
  const combinedData = [];
  const allDates = new Set();
  
  actualTrend.forEach(item => {
    combinedData.push({
      date: item.date,
      isoDate: item.isoDate,
      Actual: item.total,
    });
    allDates.add(item.isoDate);
  });

  if (projectedTrend && projectedTrend.length > 0) {
    projectedTrend.forEach(item => {
      const existing = combinedData.find(d => d.isoDate === item.isoDate);
      if (existing) {
        existing.Projected = item.total;
      } else {
        combinedData.push({
          date: item.date,
          isoDate: item.isoDate,
          Projected: item.total,
        });
        allDates.add(item.isoDate);
      }
    });
  }

  // Sort by date
  combinedData.sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            stroke="var(--on-surface-variant)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            minTickGap={20}
          />
          <YAxis 
            tickFormatter={(val) => `$${val}`} 
            stroke="var(--on-surface-variant)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-container-highest)',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '0.75rem',
              color: 'var(--on-surface)',
              backdropFilter: 'blur(10px)',
            }}
            itemStyle={{ color: 'var(--on-surface)' }}
            formatter={(value, name) => [formatCurrency(value), name]}
            labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px' }}
          />
          <Line
            type="monotone"
            dataKey="Actual"
            stroke="var(--secondary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: 'var(--secondary)' }}
          />
          {projectedTrend && projectedTrend.length > 0 && (
            <Line
              type="monotone"
              dataKey="Projected"
              stroke="var(--outline)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DailyTrendChart;
