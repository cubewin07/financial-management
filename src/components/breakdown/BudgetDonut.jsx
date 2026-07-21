import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/finance';

function BudgetDonut({ summary, defaultCurrency }) {
  if (!summary) return null;

  const { totalSpent, remaining } = summary;
  const isOverBudget = remaining < 0;

  const data = [
    { name: 'Spent', value: totalSpent, color: isOverBudget ? 'var(--error)' : 'var(--primary)' },
    { name: 'Remaining', value: isOverBudget ? 0 : remaining, color: 'var(--surface-container-high)' },
  ];

  const overBudgetData = [
    { name: 'Budget', value: totalSpent + remaining, color: 'var(--surface-container-high)' },
    { name: 'Over Budget', value: Math.abs(remaining), color: 'var(--error)' },
  ];

  const chartData = isOverBudget ? overBudgetData : data;

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-container-highest)',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '0.75rem',
              color: 'var(--on-surface)',
              backdropFilter: 'blur(10px)',
            }}
            itemStyle={{ color: 'var(--on-surface)' }}
            formatter={(value) => [formatCurrency(value, defaultCurrency || 'USD'), 'Amount']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold tracking-tight text-[var(--on-surface)]">
          {Math.round(summary.percentSpent)}%
        </span>
        <span className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider">
          {isOverBudget ? 'Over Budget' : 'Spent'}
        </span>
      </div>
    </div>
  );
}

export default BudgetDonut;
