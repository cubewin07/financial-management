import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/finance';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const total = item.payload.total || 0;
  const percent = total > 0 ? (item.value / total) * 100 : 0;

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(19,19,26,0.96)] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <p className="text-sm text-[var(--text-secondary)]">{item.name}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
        {formatCurrency(item.value)}
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{percent.toFixed(0)}% of spending</p>
    </div>
  );
}

function CategoryChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map((item) => ({ ...item, total }));

  return (
    <section className="section-shell section-shell-blue rounded-[32px] p-6 sm:p-8">
      <p className="text-sm text-[var(--text-secondary)]">Spending by category</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
        Category split
      </h3>

      <div className="mt-6 h-72 sm:h-80">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={78}
                outerRadius={108}
                paddingAngle={3}
                stroke="rgba(19,19,26,0.9)"
                strokeWidth={4}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="surface-panel flex h-full items-center justify-center rounded-[24px] text-[var(--text-secondary)]">
            Add expenses to see category insights.
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="surface-panel flex items-center justify-between rounded-[22px] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
            </div>
            <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
              {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CategoryChart;
