import { formatCurrency } from '../utils/finance';

function SummaryCard({ label, value, hint, tone = 'purple' }) {
  return (
    <article className={`surface-card surface-card-${tone} rounded-[26px] p-5`}>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
        {value}
      </h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{hint}</p>
    </article>
  );
}

export function SummaryGrid({ summary }) {
  const items = [
    {
      label: 'Total spent',
      value: formatCurrency(summary.totalSpent),
      hint: 'Current month spending',
      tone: 'coral',
    },
    {
      label: 'Remaining',
      value: formatCurrency(summary.remaining),
      hint: 'Money left before month end',
      tone: 'teal',
    },
    {
      label: 'Budget used',
      value: `${summary.percentSpent.toFixed(0)}%`,
      hint: `${summary.transactionCount} expenses logged`,
      tone: 'purple',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <SummaryCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          tone={item.tone}
        />
      ))}
    </div>
  );
}

export function FlexibleSummaryGrid({ items }) {
  const columns =
    items.length >= 4 ? 'xl:grid-cols-4' : items.length === 2 ? 'lg:grid-cols-2' : 'xl:grid-cols-3';
  const fallbackTones = ['purple', 'teal', 'blue', 'amber'];

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${columns}`}>
      {items.map((item, index) => (
        <SummaryCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          tone={item.tone || fallbackTones[index % fallbackTones.length]}
        />
      ))}
    </div>
  );
}

export default SummaryCard;
