import { motion, useReducedMotion } from 'framer-motion';
import { Users, ShieldCheck } from 'lucide-react';
import { FOCUS } from './styles';

export default function HubViewSwitch({
  activeView = 'reviewing',
  onChange,
  reviewingCount = 0,
  myReviewersCount = 0,
  hasUnreadFeedback = false,
}) {
  const reduceMotion = useReducedMotion();

  const options = [
    {
      id: 'reviewing',
      label: 'Reviewing',
      icon: Users,
      count: reviewingCount,
      showDot: false,
    },
    {
      id: 'mine',
      label: 'My Reviewers',
      icon: ShieldCheck,
      count: myReviewersCount,
      showDot: hasUnreadFeedback,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Review Hub views"
      className="inline-flex items-center w-full sm:w-auto h-12 p-1 rounded-2xl bg-[#100d17]/80 border border-white/[0.06] backdrop-blur-md"
    >
      {options.map((opt) => {
        const isSelected = activeView === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id)}
            className={`relative flex-1 sm:flex-initial sm:px-5 h-full rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${FOCUS} ${
              isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="hubViewSwitchPill"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 450, damping: 35 }
                }
                className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
              />
            )}
            <Icon size={16} className="relative z-10" />
            <span className="relative z-10">{opt.label}</span>

            {opt.count > 0 && (
              <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 tabular-nums">
                {opt.count}
              </span>
            )}

            {opt.showDot && (
              <span
                className="relative z-10 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#100d17] animate-pulse"
                title="New feedback from reviewers"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
