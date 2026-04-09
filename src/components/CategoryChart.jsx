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
    <div className="rounded-2xl bg-zinc-900 px-4 py-3 shadow-md">
      <p className="text-sm text-gray-400">{item.name}</p>
      <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(item.value)}</p>
      <p className="mt-1 text-xs text-gray-400">{percent.toFixed(0)}% of spending</p>
    </div>
  );
}

function CategoryChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map((item) => ({ ...item, total }));

  return (
    <section className="premium-card rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
      <p className="text-sm text-gray-400">Spending by category</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
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
                innerRadius={74}
                outerRadius={104}
                paddingAngle={3}
                stroke="rgba(24,24,27,0.8)"
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
          <div className="premium-panel flex h-full items-center justify-center rounded-2xl text-gray-400">
            Add expenses to see category insights.
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="premium-panel flex items-center justify-between rounded-2xl px-4 py-3 transition duration-200 hover:bg-white/8"
          >
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-white">{item.name}</span>
            </div>
            <span className="text-sm font-medium text-white">
              {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CategoryChart;
