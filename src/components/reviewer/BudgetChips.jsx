import { Link, useLocation } from 'react-router-dom';
import { displayName } from '../../utils/reviewInsights';
import { FOCUS } from './styles';

export default function BudgetChips({ candidates = [], activeId }) {
  const location = useLocation();

  if (!candidates || candidates.length <= 1) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x scrollbar-none"
      role="navigation"
      aria-label="Shared budget selector"
    >
      {candidates.map((candidate) => {
        const id = candidate.owner_user_id;
        const isSelected = id === activeId;
        const name = displayName(candidate.owner_email || candidate.email);
        const initial = name.charAt(0).toUpperCase() || 'U';

        return (
          <Link
            key={id}
            to={`/review-hub/${id}${location.search}`}
            replace
            aria-current={isSelected ? 'page' : undefined}
            className={`snap-start inline-flex items-center gap-2 h-10 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all ${FOCUS} ${
              isSelected
                ? 'bg-cyan-500/15 text-cyan-300 ring-2 ring-cyan-400/80 shadow-[0_0_15px_rgba(0,238,252,0.2)]'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.05]'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-white/10 text-slate-200'
              }`}
            >
              {initial}
            </span>
            <span className="truncate max-w-[120px]">{name}</span>
          </Link>
        );
      })}
    </div>
  );
}
