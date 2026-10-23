import { motion, useReducedMotion } from 'framer-motion';
import { REVIEWER_PERIOD_OPTIONS } from '../../utils/finance';
import { FOCUS } from './styles';

const PERIOD_LABELS = {
  'current-month': 'Month',
  'last-90-days': '90d',
  'this-year': 'Year',
  'all-time': 'All',
};

export default function PeriodSegmented({ value, onChange }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="Filter period"
      className="inline-flex items-center w-full sm:w-auto h-10 p-1 rounded-2xl bg-[#100d17]/80 border border-white/[0.06] backdrop-blur-md"
    >
      {REVIEWER_PERIOD_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const shortLabel = PERIOD_LABELS[option.value] || option.label;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`relative flex-1 sm:flex-initial sm:px-3.5 h-full rounded-xl text-xs font-semibold transition-colors duration-150 flex items-center justify-center cursor-pointer ${FOCUS} ${
              isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="reviewPeriodPill"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 35 }
                }
                className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
              />
            )}
            <span className="relative z-10">{shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
