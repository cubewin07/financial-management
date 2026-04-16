import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
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
    <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(19,19,26,0.96)] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
        {formatCurrency(payload[0].value)}
      </p>
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

    return (
      <Dot
        {...props}
        cx={cx}
        cy={cy}
        r={5}
        fill="#2DD4BF"
        stroke="#F1F0FF"
        strokeWidth={2}
      />
    );
  };

  return (
    <section className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8">
      <p className="text-sm text-[var(--text-secondary)]">Spending over time</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
        Daily trend
      </h3>
      <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
        Hover over the curve to see how spending moved through the selected range.
      </p>

      <div className="mt-6 h-72 sm:h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7C6FE0" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#7C6FE0" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#9492B0" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#9492B0"
                tickFormatter={(value) => `$${value}`}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(124,111,224,0.3)' }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#7C6FE0"
                strokeWidth={3}
                fill="url(#trendFill)"
                dot={renderDot}
                activeDot={{ r: 5, fill: '#7C6FE0', stroke: '#F1F0FF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="surface-panel flex h-full items-center justify-center rounded-[24px] text-[var(--text-secondary)]">
            Your spending trend appears here as you log expenses.
          </div>
        )}
      </div>
    </section>
  );
}

export default TrendChart;
