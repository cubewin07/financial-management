import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/finance';
import EmptyState from '../shell/EmptyState';

export default function MonthlySpendingChart({ data, defaultCurrency }) {
  const TOKENS = ['var(--primary)', 'var(--secondary)', 'var(--tertiary)', 'var(--error)', '#00eefc'];
  const hasData = data && data.length > 0;

  return (
    <div className="glass-card p-6 h-[320px] flex flex-col relative group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)]">
      <h3 className="text-headline-md text-[var(--on-surface)] mb-4">Spending by Category</h3>

      {hasData ? (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }}
                tickFormatter={(value) => `NZ$${value}`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-xl p-3 shadow-xl">
                        <p className="text-label-md text-[var(--on-surface)] mb-1">{payload[0].payload.name}</p>
                        <p className="text-body-md text-[var(--primary)] font-semibold">{formatCurrency(payload[0].value, defaultCurrency || 'NZD')}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TOKENS[index % TOKENS.length]} />
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
