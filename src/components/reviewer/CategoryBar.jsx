import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, getCategoryColor } from '../../utils/finance';
import { CARD, ROW, FOCUS } from './styles';

export default function CategoryBar({
  data = [],
  total = 0,
  currency = 'NZD',
  onSelect,
}) {
  const [showAll, setShowAll] = useState(false);
  const reduceMotion = useReducedMotion();

  const validData = (data || []).filter((item) => Number(item?.value || 0) > 0);
  const safeTotal = total > 0 ? total : validData.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const displayedItems = showAll ? validData : validData.slice(0, 4);
  const hasMore = validData.length > 4;

  return (
    <section className={`${CARD} p-5 sm:p-6 space-y-4`} aria-label="Spending by Category">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Spending by Category
        </h3>
        <span className="text-xs font-black tabular-nums text-slate-100">
          {formatCurrency(safeTotal, currency)}
        </span>
      </div>

      {validData.length === 0 ? (
        <div className="text-xs text-slate-400 py-3">No category spending recorded.</div>
      ) : (
        <>
          {/* Proportional Flex Bar - never exceeds 100% */}
          <div
            className="flex h-3 w-full rounded-full overflow-hidden bg-white/5 gap-[2px]"
            role="img"
            aria-label="Category spending breakdown"
          >
            {validData.map((item) => {
              const color = item.color || getCategoryColor(item.name);
              const val = Number(item.value || 0);

              return (
                <button
                  key={item.name}
                  type="button"
                  title={`${item.name}: ${formatCurrency(val, currency)}`}
                  aria-label={`${item.name}: ${formatCurrency(val, currency)}`}
                  onClick={() => onSelect && onSelect(item.name)}
                  style={{
                    flexGrow: Math.max(1, val),
                    flexBasis: 0,
                    minWidth: 4,
                    backgroundColor: color,
                  }}
                  className="h-full transition-opacity hover:opacity-80 cursor-pointer focus:outline-none"
                />
              );
            })}
          </div>

          {/* Category Legend */}
          <motion.div
            layout={!reduceMotion}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
          >
            {displayedItems.map((item) => {
              const color = item.color || getCategoryColor(item.name);
              const val = Number(item.value || 0);
              const pct = safeTotal > 0 ? Math.round((val / safeTotal) * 100) : 0;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onSelect && onSelect(item.name)}
                  className={`min-h-[44px] px-3.5 py-2 ${ROW} flex items-center justify-between text-left cursor-pointer ${FOCUS}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-xs font-black tabular-nums text-slate-100">
                      {formatCurrency(val, currency)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 tabular-nums w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Show All / Show Less Toggle */}
          {hasMore && (
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors cursor-pointer ${FOCUS}`}
              >
                <span>{showAll ? 'Show less' : `Show all (${validData.length})`}</span>
                {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
