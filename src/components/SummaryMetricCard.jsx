import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, AlertTriangle, Calendar, Zap, PieChart } from 'lucide-react';

export default function SummaryMetricCard({
  variant = 'cyan', // 'cyan' | 'emerald' | 'amber' | 'purple' | 'sky'
  label,
  value,
  delta,
  hint,
  icon: IconComponent,
  progress,
  progressColor = 'bg-teal-400',
  statusBadge,
  invertDeltaColor = false,
}) {
  // Color themes for each variant
  const themes = {
    cyan: {
      border: 'hover:border-[#00eefc]/40',
      glow: 'bg-[#00eefc]/10',
      iconBg: 'bg-[#00eefc]/10 text-[#00eefc] border-[#00eefc]/20',
      accentText: 'text-[#00eefc]',
    },
    emerald: {
      border: 'hover:border-emerald-400/40',
      glow: 'bg-emerald-500/10',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accentText: 'text-emerald-400',
    },
    sky: {
      border: 'hover:border-sky-400/40',
      glow: 'bg-sky-500/10',
      iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      accentText: 'text-sky-400',
    },
    amber: {
      border: 'hover:border-amber-400/40',
      glow: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      accentText: 'text-amber-400',
    },
    purple: {
      border: 'hover:border-purple-400/40',
      glow: 'bg-purple-500/10',
      iconBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      accentText: 'text-purple-300',
    },
  };

  const theme = themes[variant] || themes.cyan;

  // Delta color formatting
  const isIncrease = delta?.startsWith('+') || delta?.startsWith('↑');
  let deltaBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  if (delta) {
    if (invertDeltaColor) {
      deltaBadgeStyle = isIncrease
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else {
      deltaBadgeStyle = isIncrease
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  }

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group shadow-xl transition-all ${theme.border} min-h-[110px] sm:min-h-[135px]`}
    >
      {/* Glow effect */}
      <div className={`absolute -top-6 -right-6 w-32 h-32 ${theme.glow} opacity-0 group-hover:opacity-100 blur-2xl pointer-events-none rounded-full transition-opacity duration-300`} />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {IconComponent && (
          <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border ${theme.iconBg} shrink-0`}>
            <IconComponent size={14} className="sm:w-4 sm:h-4" />
          </div>
        )}
      </div>

      {/* Main Value Display */}
      <div className="my-1 sm:my-1.5">
        <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-100 tracking-tight truncate">
          {value}
        </p>
      </div>

      {/* Optional Progress Segment Bar */}
      {typeof progress === 'number' && (
        <div className="w-full h-1 sm:h-1.5 rounded-full bg-white/5 overflow-hidden my-0.5 sm:my-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Footer Info Row */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap text-xs">
        {delta && (
          <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full border ${deltaBadgeStyle}`}>
            {delta}
          </span>
        )}
        {statusBadge && (
          <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full border ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        )}
        {hint && (
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-full">
            {hint}
          </span>
        )}
      </div>
    </motion.div>
  );
}
