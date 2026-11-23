import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactCurrency, formatCurrency, getCategoryColor } from '../../utils/finance';
import EmptyState from '../ui/EmptyState';

const roundCurrency = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

function findMonthlyLimit(categoryLimits, categoryName) {
  if (!categoryLimits || !categoryName) return undefined;
  if (categoryLimits[categoryName] !== undefined) return categoryLimits[categoryName];
  const lower = String(categoryName).toLowerCase();
  const matchedKey = Object.keys(categoryLimits).find((key) => String(key).toLowerCase() === lower);
  return matchedKey ? categoryLimits[matchedKey] : undefined;
}

function CategoryTooltip({ active, payload, defaultCurrency }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="max-w-[230px] rounded-xl bg-slate-900/95 border border-white/15 px-3 py-2 shadow-xl backdrop-blur-md text-xs">
      <p className="font-bold text-slate-100 truncate mb-1">{item.name}</p>
      <p className="font-semibold text-white tabular-nums">
        {formatCurrency(item.value, defaultCurrency)}
        <span className="text-slate-400 font-normal"> ({item.percentage}% of spend)</span>
      </p>
      {item.hasLimit && (
        <p className={`mt-1 text-[11px] font-medium tabular-nums ${item.isExceeded ? 'text-rose-300' : 'text-slate-300'}`}>
          Limit: {formatCurrency(item.limit, defaultCurrency)} ({Math.round(item.percentageOfLimit)}%)
        </p>
      )}
    </div>
  );
}

function CategoryBarChart({ data, categoryLimits, defaultCurrency = 'NZD', limitMonths = 1 }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No category data" description="No spending recorded for this period." />;
  }

  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const formattedData = data.map((item) => {
    const monthlyLimit = findMonthlyLimit(categoryLimits, item.name);
    const numericMonthly = Number(monthlyLimit);
    const hasLimit = monthlyLimit !== undefined && monthlyLimit !== null && Number.isFinite(numericMonthly) && numericMonthly > 0;
    const limit = hasLimit ? roundCurrency(numericMonthly * limitMonths) : null;
    const percentageOfLimit = hasLimit && limit > 0 ? (item.value / limit) * 100 : null;
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

  const chartHeight = Math.min(480, Math.max(200, formattedData.length * 40 + 40));

  return (
    <div className="w-full" style={{ height: `${chartHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} layout="vertical" margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number"
            tickFormatter={(val) => formatCompactCurrency(val, defaultCurrency)}
            stroke="var(--on-surface-variant)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            stroke="var(--on-surface-variant)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={96}
            tickFormatter={(val) => (String(val).length > 13 ? `${String(val).slice(0, 12)}…` : val)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            content={<CategoryTooltip defaultCurrency={defaultCurrency} />}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
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
