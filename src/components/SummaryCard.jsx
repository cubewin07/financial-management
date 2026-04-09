import { formatCurrency } from '../utils/finance';

function SummaryCard({ label, value, hint }) {
  return (
    <article className="premium-card rounded-2xl p-4 transition duration-200 hover:scale-[1.02] sm:p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-2xl">{value}</h3>
      <p className="mt-1 text-xs text-gray-400 sm:text-sm">{hint}</p>
    </article>
  );
}

export function SummaryGrid({ summary }) {
  const items = [
    {
      label: 'Total spent',
      value: formatCurrency(summary.totalSpent),
      hint: 'Current month spending',
    },
    {
      label: 'Remaining',
      value: formatCurrency(summary.remaining),
      hint: 'Money left before month end',
    },
    {
      label: 'Budget used',
      value: `${summary.percentSpent.toFixed(0)}%`,
      hint: `${summary.transactionCount} expenses logged`,
    },
  ];

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[44rem] grid-cols-3 gap-3 md:min-w-0">
        {items.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>
    </div>
  );
}

export function FlexibleSummaryGrid({ items }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[44rem] grid-cols-3 gap-3 md:min-w-0">
        {items.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>
    </div>
  );
}

export default SummaryCard;
