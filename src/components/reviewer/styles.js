import { ShieldCheck, AlertTriangle, Flame, AlertCircle } from 'lucide-react';

export const CARD =
  'relative overflow-hidden rounded-3xl border border-white/[0.03] ' +
  'bg-gradient-to-b from-[#1b1526]/90 via-[#161120]/95 to-[#110d19]/95 backdrop-blur-2xl ' +
  'shadow-[0_12px_40px_rgba(0,0,0,0.5)]';

export const ROW =
  'rounded-2xl bg-[#100d17]/50 hover:bg-[#1a1426]/70 border border-white/[0.02] transition-colors';

export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70';

export const STATUS = {
  'on-track': {
    label: 'On track',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    bar: 'bg-emerald-400',
    Icon: ShieldCheck,
  },
  watch: {
    label: 'Watch',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    bar: 'bg-amber-400',
    Icon: AlertTriangle,
  },
  over: {
    label: 'Over',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    bar: 'bg-rose-400',
    Icon: Flame,
  },
  none: {
    label: 'No budget',
    text: 'text-slate-400',
    bg: 'bg-white/5',
    bar: 'bg-slate-500',
    Icon: AlertCircle,
  },
  unavailable: {
    label: 'Unavailable',
    text: 'text-slate-400',
    bg: 'bg-white/5',
    bar: 'bg-slate-600',
    Icon: AlertCircle,
  },
};
