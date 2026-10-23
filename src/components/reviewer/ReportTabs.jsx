import { motion, useReducedMotion } from 'framer-motion';
import { FOCUS } from './styles';

export default function ReportTabs({
  tabs = [],
  value,
  onChange,
  needsReviewCount = 0,
}) {
  const reduceMotion = useReducedMotion();

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      const nextId = tabs[nextIndex].id;
      onChange(nextId);
      document.getElementById(`tab-${nextId}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      const prevId = tabs[prevIndex].id;
      onChange(prevId);
      document.getElementById(`tab-${prevId}`)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Report sections"
      className="sticky top-2 z-20 flex items-center p-1 rounded-2xl bg-[#0e0a14]/90 backdrop-blur-xl border border-white/[0.05] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
    >
      {tabs.map((tab, index) => {
        const isSelected = value === tab.id;
        const isTransactions = tab.id === 'transactions';
        const showBadge = isTransactions && needsReviewCount > 0;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative flex-1 min-h-[40px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${FOCUS} ${
              isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="reviewTabPill"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 35 }
                }
                className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {showBadge && (
              <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {needsReviewCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
