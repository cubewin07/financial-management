import { Link } from 'react-router-dom';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { displayName } from '../../utils/reviewInsights';
import { formatCurrency } from '../../utils/finance';
import StatusChip from './StatusChip';
import { STATUS, FOCUS, CARD } from './styles';

export default function CandidateRow({ candidate, overview, loading = false }) {
  const reduceMotion = useReducedMotion();
  const ownerId = candidate.owner_user_id;
  const name = displayName(candidate.owner_email || candidate.email);
  const initial = name.charAt(0).toUpperCase() || 'U';

  const status = overview?.status || 'none';
  const statusMeta = STATUS[status] || STATUS.none;
  const currency = overview?.currency || 'NZD';
  const spent = overview?.monthSpent ?? 0;
  const budget = overview?.monthlyBudget ?? 0;
  const hasBudget = budget > 0 && status !== 'none';
  const pct = hasBudget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const newCount = overview?.newCount ?? 0;

  return (
    <>
      {/* Mobile view (< sm): Dense high-density row view */}
      <Link
        to={`/review-hub/${ownerId}`}
        className={`sm:hidden block w-full min-h-[72px] px-4 py-3 bg-[#100d17]/50 active:bg-[#1a1426] border-b border-white/[0.04] last:border-b-0 transition-colors ${FOCUS}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar 40px */}
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center font-bold text-sm shrink-0">
              {initial}
            </div>

            <div className="min-w-0">
              <span className="block text-sm font-bold text-white truncate">{name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <div className="w-16 h-5 rounded-full bg-white/10 animate-pulse" />
            ) : (
              <StatusChip status={status} />
            )}
            <ChevronRight size={16} className="text-slate-500" />
          </div>
        </div>

        {/* Details row: spent / budget + progress bar + new count */}
        <div className="mt-2.5 space-y-1.5 pl-[52px]">
          {loading ? (
            <div className="space-y-1.5 py-1">
              <div className="w-28 h-3 rounded bg-white/10 animate-pulse" />
              <div className="w-full h-1 rounded-full bg-white/10 animate-pulse" />
            </div>
          ) : status === 'unavailable' ? (
            <div className="flex items-center justify-between text-xs text-rose-300 py-1">
              <span>Failed to load summary</span>
              <span className="text-[11px] text-slate-400">Open report →</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs tabular-nums text-slate-300">
                <span>
                  <strong className="text-white font-bold">{formatCurrency(spent, currency)}</strong>
                  {hasBudget && <span> / {formatCurrency(budget, currency)} · {pct}%</span>}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {newCount > 0 ? (
                    <span className="text-cyan-300 font-semibold">
                      {newCount} new since you last looked
                    </span>
                  ) : (
                    <span>Up to date</span>
                  )}
                </span>
              </div>

              {hasBudget && (
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusMeta.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Link>

      {/* Desktop / Tablet view (>= sm): Roomy card variant */}
      <Link
        to={`/review-hub/${ownerId}`}
        className={`hidden sm:flex flex-col justify-between ${CARD} p-5 hover:border-cyan-400/30 transition-all ${
          reduceMotion ? '' : 'hover:-translate-y-0.5'
        } ${FOCUS}`}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center font-bold text-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{name}</h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {candidate.owner_email || 'Shared budget'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="w-16 h-5 rounded-full bg-white/10 animate-pulse" />
            ) : (
              <StatusChip status={status} />
            )}
          </div>

          {/* Spent figure */}
          {loading ? (
            <div className="py-2 space-y-2">
              <div className="w-36 h-6 rounded bg-white/10 animate-pulse" />
              <div className="w-full h-1.5 rounded-full bg-white/10 animate-pulse" />
            </div>
          ) : status === 'unavailable' ? (
            <div className="py-2 text-xs text-rose-300">
              Failed to load summary. Tap below to view full report.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black tabular-nums text-white">
                  {formatCurrency(spent, currency)}
                </span>
                {hasBudget && (
                  <span className="text-xs text-slate-400 tabular-nums">
                    of {formatCurrency(budget, currency)} ({pct}%)
                  </span>
                )}
              </div>

              {hasBudget && (
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusMeta.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-medium">
            {newCount > 0 ? (
              <span className="text-cyan-300 font-semibold">
                {newCount} new since you last looked
              </span>
            ) : (
              <span>Up to date</span>
            )}
          </span>

          <span className="text-cyan-400 font-semibold inline-flex items-center gap-1 group">
            <span>Open report</span>
            <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </>
  );
}
