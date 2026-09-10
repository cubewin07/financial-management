import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, AlertTriangle, Calendar, Zap, PieChart } from 'lucide-react';

function CircularGauge({
  percent = 0,
  color = 'text-emerald-400',
  size = 36,
  strokeWidth = 3.5,
  label,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums text-slate-200">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}

function SegmentedRatioBar({ segments = [] }) {
  if (!segments || segments.length === 0) return null;

  return (
    <div className="space-y-1.5 my-1">
      {/* 2-tone track */}
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden flex">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className={`h-full transition-all duration-500 ${seg.bgColor || 'bg-purple-500'}`}
            style={{ width: `${Math.max(0, Math.min(100, seg.percent))}%` }}
            title={`${seg.label}: ${seg.percent}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-slate-300">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${seg.dotColor || seg.bgColor || 'bg-purple-400'}`} />
            <span className="text-slate-400">{seg.label}:</span>
            <span className="text-slate-200 font-bold">{seg.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SummaryMetricCard({
  variant = 'cyan', // 'cyan' | 'emerald' | 'amber' | 'purple' | 'sky' | 'rose'
  label,
  value,
  delta,
  hint,
  icon: IconComponent,
  progress,
  progressColor = 'bg-teal-400',
  circularGauge,
  segmentedRatio,
  statusBadge,
  invertDeltaColor = false,
  featured = false,
}) {
  // Color themes for each variant
  const themes = {
    cyan: {
      border: 'hover:border-[#00eefc]/50 border-[#00eefc]/20',
      glow: 'bg-[#00eefc]/15',
      iconBg: 'bg-[#00eefc]/15 text-[#00eefc] border-[#00eefc]/30',
      accentText: 'text-[#00eefc]',
      featuredBg: 'bg-gradient-to-br from-[#00eefc]/10 via-slate-900/90 to-slate-900/95',
    },
    emerald: {
      border: 'hover:border-emerald-400/50 border-emerald-500/20',
      glow: 'bg-emerald-500/15',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      accentText: 'text-emerald-400',
      featuredBg: 'bg-gradient-to-br from-emerald-500/10 via-slate-900/90 to-slate-900/95',
    },
    sky: {
      border: 'hover:border-sky-400/50 border-sky-500/20',
      glow: 'bg-sky-500/15',
      iconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      accentText: 'text-sky-400',
      featuredBg: 'bg-gradient-to-br from-sky-500/10 via-slate-900/90 to-slate-900/95',
    },
    amber: {
      border: 'hover:border-amber-400/50 border-amber-500/20',
      glow: 'bg-amber-500/15',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      accentText: 'text-amber-400',
      featuredBg: 'bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-900/95',
    },
    purple: {
      border: 'hover:border-purple-400/50 border-purple-500/20',
      glow: 'bg-purple-500/15',
      iconBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      accentText: 'text-purple-300',
      featuredBg: 'bg-gradient-to-br from-purple-500/10 via-slate-900/90 to-slate-900/95',
    },
    rose: {
      border: 'hover:border-rose-400/50 border-rose-500/20',
      glow: 'bg-rose-500/15',
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      accentText: 'text-rose-400',
      featuredBg: 'bg-gradient-to-br from-rose-500/10 via-slate-900/90 to-slate-900/95',
    },
  };

  const theme = themes[variant] || themes.cyan;

  // Delta color formatting
  const isIncrease = delta?.startsWith('+') || delta?.startsWith('↑');
  let deltaBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  if (delta) {
    if (invertDeltaColor) {
      deltaBadgeStyle = isIncrease
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-bold'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold';
    } else {
      deltaBadgeStyle = isIncrease
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold';
    }
  }

  const containerBg = featured ? theme.featuredBg : 'bg-slate-900/70';
  const containerPadding = featured ? 'p-4 sm:p-5' : 'p-3 sm:p-4';
  const minHeight = featured ? 'min-h-[120px] sm:min-h-[140px]' : 'min-h-[96px] sm:min-h-[118px]';

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className={`${containerPadding} ${minHeight} h-full rounded-2xl sm:rounded-3xl border ${theme.border} ${containerBg} backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group shadow-lg hover:shadow-xl transition-all`}
    >
      {/* Glow effect */}
      <div className={`absolute -top-6 -right-6 w-32 h-32 ${theme.glow} opacity-20 group-hover:opacity-100 blur-2xl pointer-events-none rounded-full transition-opacity duration-300`} />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5">
        <span className={`font-bold tracking-wider uppercase truncate ${featured ? 'text-xs text-slate-300' : 'text-[11px] text-slate-400'}`}>
          {label}
        </span>
        {circularGauge ? (
          <CircularGauge
            percent={circularGauge.percent}
            color={circularGauge.color}
            label={circularGauge.label}
            size={featured ? 38 : 32}
            strokeWidth={featured ? 3.5 : 3}
          />
        ) : IconComponent ? (
          <div className={`p-1.5 sm:p-2 rounded-xl border ${theme.iconBg} shrink-0`}>
            <IconComponent size={featured ? 18 : 15} />
          </div>
        ) : null}
      </div>

      {/* Main Value Display */}
      <div className="my-1">
        <p className={`font-black text-slate-100 tracking-tight tabular-nums truncate ${featured ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl sm:text-2xl'}`}>
          {value}
        </p>
      </div>

      {/* Segmented Ratio Bar (for Composition metrics like Fixed vs Discretionary) */}
      {segmentedRatio && (
        <SegmentedRatioBar segments={segmentedRatio.segments} />
      )}

      {/* Optional Progress Segment Bar */}
      {!segmentedRatio && typeof progress === 'number' && (
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden my-1">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Footer Info Row */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap text-xs mt-0.5">
        {delta && (
          <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] rounded-full border ${deltaBadgeStyle}`}>
            {delta}
          </span>
        )}
        {statusBadge && (
          <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full border ${statusBadge.color}`}>
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

