import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency, getCategoryColor } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

function CategoryBarChart({ data, categoryLimits, defaultCurrency = 'NZD' }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No category data" description="No spending recorded for this period." />;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formattedData = data.map((item) => {
    const limit = categoryLimits?.[item.name];
    const hasLimit = limit !== undefined && limit !== null && limit > 0;
    const percentageOfLimit = hasLimit ? (item.value / limit) * 100 : null;
    const isExceeded = hasLimit && item.value > limit;

    return {
      ...item,
      limit,
      hasLimit,
      percentageOfLimit,
      isExceeded,
      percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0,
    };
  });

  const yAxisWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 110;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} layout="vertical" margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tickFormatter={(val) => formatCurrency(val, defaultCurrency)} stroke="var(--on-surface-variant)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" stroke="var(--on-surface-variant)" fontSize={11} tickLine={false} axisLine={false} width={yAxisWidth} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            contentStyle={{
              backgroundColor: 'var(--surface-container-high)',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '0.75rem',
              color: 'var(--on-surface)',
              backdropFilter: 'blur(10px)',
            }}
            itemStyle={{ color: 'var(--on-surface)' }}
            formatter={(value, _, props) => {
              const payload = props.payload;
              const spentStr = formatCurrency(value, defaultCurrency);
              const shareStr = `${payload?.percentage || 0}% of total spend`;

              if (payload?.hasLimit) {
                const limitStr = formatCurrency(payload.limit, defaultCurrency);
                const percentOfLimitStr = `${Math.round(payload.percentageOfLimit)}% of budget limit`;
                return [`${spentStr} (${shareStr}) • ${limitStr} max (${percentOfLimitStr})`, 'Category Spend'];
              }
              return [`${spentStr} (${shareStr})`, 'Category Spend'];
            }}
            labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
            {formattedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isExceeded ? 'var(--error)' : (entry.color || getCategoryColor(entry.name))}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryBarChart;
