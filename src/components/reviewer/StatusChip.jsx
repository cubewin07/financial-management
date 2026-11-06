import { STATUS } from './styles';

export default function StatusChip({ status, className = '' }) {
  const meta = STATUS[status] || STATUS.none;
  const { label, text, bg, Icon } = meta;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums ${bg} ${text} ${className}`}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
}
