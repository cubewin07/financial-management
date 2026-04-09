import {
  CartesianGrid,
  Dot,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../utils/finance';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-zinc-900 px-4 py-3 shadow-md">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function TrendChart({ data }) {
  const today = new Date().toISOString().slice(0, 10);

  const renderDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload?.isoDate !== today) {
      return null;
    }

    return <Dot {...props} cx={cx} cy={cy} r={5} fill="#22c55e" stroke="#fafafa" strokeWidth={2} />;
  };

  return (
    <section className="premium-card rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
      <p className="text-sm text-gray-400">Spending over time</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Daily trend
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-400">
        Hover over the line to see how much you spent on each day in the selected period.
      </p>

      <div className="mt-6 h-72 sm:h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#a1a1aa"
                tickFormatter={(value) => `$${value}`}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.18)' }} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#22c55e"
                strokeWidth={3}
                dot={renderDot}
                activeDot={{ r: 5, fill: '#22c55e', stroke: '#18181b', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="premium-panel flex h-full items-center justify-center rounded-2xl text-gray-400">
            Your spending trend appears here as you log expenses.
          </div>
        )}
      </div>
    </section>
  );
}

export default TrendChart;
