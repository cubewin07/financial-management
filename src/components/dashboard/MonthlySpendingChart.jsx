import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/finance';

export default function MonthlySpendingChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 h-[300px] flex items-center justify-center">
        <p className="text-body-md text-[var(--on-surface-variant)]">No spending data this month</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 h-[300px] flex flex-col">
      <h3 className="text-headline-md text-[var(--on-surface)] mb-6">Spending by Category</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }}
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-xl p-3 shadow-xl">
                      <p className="text-label-md text-[var(--on-surface)] mb-1">{payload[0].payload.name}</p>
                      <p className="text-body-md text-[var(--primary)] font-semibold">{formatCurrency(payload[0].value)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || 'var(--primary)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
