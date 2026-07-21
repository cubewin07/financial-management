import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../utils/finance';

function CategoryBarChart({ data, defaultCurrency }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--on-surface-variant)]">
        No category data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formattedData = data.map((item) => ({
    ...item,
    percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0,
    labelWithPercent: `${item.name} (${total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)`,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tickFormatter={(val) => `$${val}`} stroke="var(--on-surface-variant)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis dataKey="labelWithPercent" type="category" stroke="var(--on-surface-variant)" fontSize={12} tickLine={false} axisLine={false} width={120} />
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
            formatter={(value, _, props) => [
              `${formatCurrency(value, defaultCurrency || 'USD')} (${props.payload?.percentage || 0}%)`,
              'Spent',
            ]}
            labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || 'var(--primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryBarChart;
