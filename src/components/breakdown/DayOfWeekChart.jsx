import { motion } from 'framer-motion';
import { getDayOfWeekPattern, formatCurrency } from '../../utils/finance';

export default function DayOfWeekChart({ expenses = [], defaultCurrency = 'NZD' }) {
  const pattern = getDayOfWeekPattern(expenses);
  const maxSpend = Math.max(...pattern.map((p) => p.total), 1);

  return (
    <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-headline-md font-headline-md text-[var(--on-surface)]">
          Day-of-Week Pattern
        </h2>
        <p className="text-xs text-[var(--on-surface-variant)] mt-0.5 mb-5">
          Spending intensity across days of the week
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end h-36 pt-4">
        {pattern.map((item) => {
          const heightPercent = Math.max(8, Math.round((item.total / maxSpend) * 100));
          const isWeekend = item.day === 'Sat' || item.day === 'Sun';

          return (
            <div key={item.day} className="flex flex-col items-center gap-1.5 h-full justify-end group">
              <div className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                {item.total > 0 ? formatCurrency(item.total, defaultCurrency) : '$0'}
              </div>
              <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end h-24 relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.4 }}
                  className={`w-full rounded-t-lg transition-colors ${
                    isWeekend ? 'bg-purple-500/80 group-hover:bg-purple-400' : 'bg-teal-500/80 group-hover:bg-teal-400'
                  }`}
                />
              </div>
              <span className={`text-[11px] font-semibold ${isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
