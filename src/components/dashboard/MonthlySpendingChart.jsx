import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/finance';
import EmptyState from '../shell/EmptyState';

export default function MonthlySpendingChart({ data, defaultCurrency }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const TOKENS = ['var(--primary)', 'var(--secondary)', 'var(--tertiary)', 'var(--error)', '#00eefc'];
  const hasData = data && data.length > 0;

  return (
    <div className="glass-card p-6 h-[320px] flex flex-col relative group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)]">
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
        <div className="flex-1 min-h-0">
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
                tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 500 }}
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
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <EmptyState type="category" />
        </div>
      )}
    </div>
  );
}
