import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCompactCurrency, formatCurrency, getCategoryColor } from '../../utils/finance';
import EmptyState from '../shell/EmptyState';

export default function MonthlySpendingChart({ data = [], defaultCurrency }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const activeIndex = hoveredIndex ?? selectedIndex;
  const hasData = data && data.length > 0;

  const totalSpent = data.reduce((acc, cat) => acc + (Number(cat.value) || 0), 0);

  return (
    <div className="glass-card p-4 sm:p-6 flex flex-col justify-between relative group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)] h-full">
      <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4">
        <div className="min-w-0">
          <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight truncate">Spending by Category</h3>
          <p className="text-overline text-[var(--outline)]">Monthly Breakdown</p>
        </div>
        <span className="badge-pill bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 font-semibold shrink-0">
          {data?.length || 0} Categories
        </span>
      </div>

      {hasData ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-3.5 sm:gap-4 items-stretch min-h-0">
          {/* Bar Chart Container */}
          <div className="flex-1 h-[190px] sm:h-[220px] lg:h-auto lg:min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={190}>
              <BarChart
                data={data}
                margin={{ top: 10, right: 4, bottom: 4, left: 0 }}
                onMouseMove={(state) => {
                  if (state && state.isTooltipActive) {
                    setHoveredIndex(state.activeTooltipIndex);
                  } else {
                    setHoveredIndex(null);
                  }
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(val) => (String(val).length > 7 ? `${String(val).slice(0, 6)}…` : val)}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 10, fontWeight: 500 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 500 }}
                  width={48}
                  tickFormatter={(value) => formatCompactCurrency(value, defaultCurrency)}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const entry = payload[0].payload;
                      const color = entry.color || getCategoryColor(entry.name);
                      return (
                        <div className="bg-[#191622]/95 border border-white/15 rounded-xl p-3 shadow-[0_12px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[var(--outline)] font-bold mb-0.5">{entry.name}</p>
                            <p className="text-label-md text-white font-extrabold tabular-nums">{formatCurrency(payload[0].value, defaultCurrency || 'NZD')}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name || index}`}
                      fill={entry.color || getCategoryColor(entry.name)}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Legend List (Tap-friendly on Mobile & Hover on Desktop) */}
          <div className="lg:w-48 shrink-0 flex flex-col justify-center space-y-2 border-t lg:border-t-0 lg:border-l border-white/10 pt-3 lg:pt-0 lg:pl-4">
            <span className="text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider">Top Breakdown</span>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 hide-scrollbar">
              {data.map((item, idx) => {
                const color = item.color || getCategoryColor(item.name);
                const pct = totalSpent > 0 ? Math.round(((Number(item.value) || 0) / totalSpent) * 100) : 0;
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={item.name}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedIndex(isSelected ? null : idx)}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`w-full text-left flex items-center justify-between p-2 sm:p-1.5 min-h-[44px] sm:min-h-0 rounded-lg border transition-all cursor-pointer ${
                      isSelected ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-[var(--on-surface-variant)] truncate font-medium">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2 tabular-nums">
                      <span className="text-xs text-white font-bold block">{formatCurrency(item.value, defaultCurrency)}</span>
                      <span className="text-[10px] text-[var(--outline)] font-medium block">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <EmptyState type="category" />
        </div>
      )}
    </div>
  );
}
