import { formatCarryOver } from '../utils/carryOver';
import { formatCurrency } from '../utils/finance';

function CarryOverPill({ amount }) {
  const meta = formatCarryOver(amount);

  if (amount === 0) {
    return (
      <div className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm ${meta.colorClass}`}>
        {meta.label}
      </div>
    );
  }

  return (
    <div className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm ${meta.colorClass}`}>
      <span className="tabular-nums">
        {meta.sign}
        {formatCurrency(Math.abs(amount))}
      </span>
      <span className="ml-2">{meta.label}</span>
    </div>
  );
}

export default CarryOverPill;

