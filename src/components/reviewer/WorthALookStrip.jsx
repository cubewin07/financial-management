import { Flag, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';
import { ROW, FOCUS } from './styles';

export default function WorthALookStrip({
  items = [],
  currency = 'NZD',
  onOpenExpense,
  onOpenCategory,
  variant = 'strip',
}) {
  const isList = variant === 'list';

  return (
    <section className="space-y-3" aria-label="Worth a look">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Worth a look
        </h3>
        {items.length > 0 && (
          <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full">
            {items.length} flag{items.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className={`${ROW} p-4 flex items-center gap-3 text-slate-400 text-xs`}>
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>Nothing unusual this month.</span>
        </div>
      ) : isList ? (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const isCategory = item.type === 'category';
            const handleClick = () => {
              if (isCategory && onOpenCategory) {
                onOpenCategory(item.category);
              } else if (!isCategory && onOpenExpense && item.expense) {
                onOpenExpense(item.expense);
              }
            };

            return (
              <button
                key={item.expense?.id || `${item.category}-${idx}`}
                type="button"
                onClick={handleClick}
                className={`w-full ${ROW} p-3 flex items-center justify-between text-left cursor-pointer ${FOCUS}`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {item.title}
                    </span>
                    <Flag size={11} className="text-amber-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-amber-300/80 font-medium truncate mt-0.5">
                    {item.detail}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold tabular-nums text-slate-100">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 scrollbar-none">
          {items.map((item, idx) => {
            const isCategory = item.type === 'category';
            const handleClick = () => {
              if (isCategory && onOpenCategory) {
                onOpenCategory(item.category);
              } else if (!isCategory && onOpenExpense && item.expense) {
                onOpenExpense(item.expense);
              }
            };

            return (
              <button
                key={item.expense?.id || `${item.category}-${idx}`}
                type="button"
                onClick={handleClick}
                className={`snap-start shrink-0 w-[232px] h-[88px] ${ROW} p-3.5 flex flex-col justify-between text-left cursor-pointer ${FOCUS}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white truncate">
                    {item.title}
                  </span>
                  <Flag size={13} className="text-amber-400 shrink-0 mt-0.5" />
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-black tabular-nums text-slate-100">
                    {formatCurrency(item.amount, currency)}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-300/90 truncate">
                    {item.detail}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
