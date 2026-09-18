import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/finance';
import EmptyState from '../shell/EmptyState';

export default function MonthlySpendingChart({ data = [], defaultCurrency }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const TOKENS = ['var(--primary)', 'var(--secondary)', 'var(--tertiary)', 'var(--error)', '#00eefc'];
  const hasData = data && data.length > 0;

  const totalSpent = data.reduce((acc, cat) => acc + (Number(cat.value) || 0), 0);

  return (
    <div className="glass-card p-6 flex flex-col justify-between relative group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)] h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight">Spending by Category</h3>
          <p className="text-overline text-[var(--outline)]">Monthly Breakdown</p>
        </div>
        <span className="badge-pill bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 font-semibold">
          {data?.length || 0} Categories
        </span>
      </div>

      {hasData ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch min-h-0">
          {/* Bar Chart Container */}
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 0, bottom: 0, left: -10 }}
                onMouseMove={(state) => {
                  if (state && state.isTooltipActive) {
                    setActiveIndex(state.activeTooltipIndex);
                  } else {
                    setActiveIndex(null);
                  }
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 500 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const itemIndex = payload[0].payload.index ?? activeIndex ?? 0;
                      const color = TOKENS[(itemIndex >= 0 ? itemIndex : 0) % TOKENS.length];
                      return (
                        <div className="bg-[#191622]/95 border border-white/15 rounded-xl p-3 shadow-[0_12px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[var(--outline)] font-bold mb-0.5">{payload[0].payload.name}</p>
                            <p className="text-label-md text-white font-extrabold">{formatCurrency(payload[0].value, defaultCurrency || 'NZD')}</p>
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
                      key={`cell-${index}`}
                      fill={TOKENS[index % TOKENS.length]}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Legend List for Desktop View */}
          <div className="lg:w-48 shrink-0 flex flex-col justify-center space-y-2 border-t lg:border-t-0 lg:border-l border-white/10 pt-3 lg:pt-0 lg:pl-4">
            <span className="text-[10px] uppercase font-bold text-[var(--outline)] tracking-wider">Top Breakdown</span>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 hide-scrollbar">
              {data.map((item, idx) => {
                const color = TOKENS[idx % TOKENS.length];
                const pct = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                      activeIndex === idx ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-[var(--on-surface-variant)] truncate font-medium">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs text-white font-bold block">{formatCurrency(item.value, defaultCurrency)}</span>
                      <span className="text-[10px] text-[var(--outline)] font-medium block">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <EmptyState type="category" />
        </div>
      )}
    </div>
  );
}
