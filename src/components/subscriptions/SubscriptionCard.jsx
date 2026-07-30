import { useState } from 'react';
import { formatCurrency } from '../../utils/finance';
import { getServicePresentation, projectSubscriptionCost, getNextBillingDate, formatNextBilling, getUpcomingBillingAlerts, skipNextBillingCycle } from '../../utils/subscriptions';
import { differenceInCalendarDays } from 'date-fns';
import { Calendar, FastForward, Power } from 'lucide-react';

export default function SubscriptionCard({ subscription, onClick, onToggle, onUpdate, canManage, defaultCurrency }) {
  const [imgError, setImgError] = useState(false);
  const { id, active, start_date, frequency, plan_tier } = subscription;
  const { name, initials, color, logoUrl } = getServicePresentation(subscription);
  const monthlyCost = projectSubscriptionCost(subscription);
  const nextBillingDate = getNextBillingDate({ startDate: start_date, frequency });

  const displayInitials = initials || name.substring(0, 2).toUpperCase();
  const displayColor = color || 'var(--primary-container)';

  const isAlert = getUpcomingBillingAlerts([subscription]).length > 0;
  const daysUntil = differenceInCalendarDays(nextBillingDate, new Date());
  const alertText = daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  const formattedDate = active ? formatNextBilling(nextBillingDate) : '—';

  const handleSkipNext = (e) => {
    e.stopPropagation();
    if (!onUpdate) return;
    const nextDate = skipNextBillingCycle(subscription);
    if (nextDate) {
      onUpdate(id, { start_date: nextDate });
    }
  };

  return (
    <div className={`glass-card relative overflow-hidden group transition-all duration-300 rounded-2xl sm:rounded-3xl ${
      active 
        ? 'hover:border-[var(--primary)]/40 hover:shadow-[0_0_30px_rgba(208,188,255,0.12)] bg-gradient-to-br from-white/[0.03] to-transparent' 
        : 'opacity-60 border-white/5 bg-slate-950/40'
    }`}>
      {/* Background ambient glow (desktop only) */}
      <div 
        className={`hidden sm:block absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none transition-opacity duration-300 ${
          active ? 'opacity-15 group-hover:opacity-25' : 'opacity-0'
        }`}
        style={{ backgroundColor: displayColor }}
      />

      <button
        type="button"
        onClick={() => onClick(subscription)}
        className="absolute inset-0 w-full h-full z-0 cursor-pointer focus:outline-none rounded-2xl sm:rounded-3xl"
        aria-label={`View and edit details for ${name}`}
      />

      {/* ========================================================
          MOBILE COMPACT VIEW (< sm) — Optimized for iPhone / Mobile
          ======================================================== */}
      <div className="sm:hidden flex items-center justify-between p-3.5 gap-2.5 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              onError={() => setImgError(true)}
              className="w-9 h-9 rounded-xl object-cover border border-white/15 bg-slate-900 shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-slate-950 border border-white/20 shrink-0"
              style={{ backgroundColor: displayColor }}
            >
              {displayInitials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-100 truncate">{name}</h3>
              {!active && (
                <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-white/10 shrink-0">
                  Off
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
              <span className="font-extrabold text-[var(--secondary)]">{formattedDate}</span>
              <span className="text-slate-400 font-semibold">· {formatCurrency(monthlyCost, subscription.currency || defaultCurrency || 'NZD')}/m</span>
            </div>
          </div>
        </div>

        {/* Mobile Quick Action Buttons: Skip + Toggle */}
        <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
          {active && canManage && onUpdate && (
            <button
              type="button"
              onClick={handleSkipNext}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30 transition-all flex items-center gap-1 active:scale-95"
              title="Skip next cycle"
            >
              <FastForward className="w-2.5 h-2.5" />
              Skip
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(id);
              }}
              className={`relative inline-flex items-center h-5.5 rounded-full w-10 transition-colors focus:outline-none cursor-pointer ${
                active ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-slate-700/80 border border-white/10'
              }`}
              aria-label={`Toggle active status for ${name}`}
            >
              <span
                className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${
                  active ? 'translate-x-5.5' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          DESKTOP DETAILED VIEW (>= sm) — Full Luminous Velocity Card
          ======================================================== */}
      <div className="hidden sm:flex p-5 flex-col justify-between h-full min-h-[225px] relative z-10 pointer-events-none">
        {/* Top Section */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt={`${name} logo`}
                  onError={() => setImgError(true)}
                  className="w-11 h-11 rounded-2xl object-cover shadow-md border border-white/15 bg-slate-900 shrink-0"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold text-slate-950 shadow-md border border-white/20 shrink-0"
                  style={{ backgroundColor: displayColor }}
                >
                  {displayInitials}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-100 tracking-tight truncate group-hover:text-[var(--primary)] transition-colors">{name}</h3>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5 capitalize">
                  {plan_tier || `${frequency} plan`}
                </p>
              </div>
            </div>

            {canManage && (
              <div className="pointer-events-auto shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(id);
                  }}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400/40 cursor-pointer ${
                    active ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-slate-700/80 border border-white/10'
                  }`}
                  title={active ? 'Click to stop / disable subscription' : 'Click to activate subscription'}
                  aria-label={`Toggle active status for ${name}`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Badges & Actions Row */}
          <div className="flex items-center justify-between gap-2 min-h-[26px]">
            <div className="flex items-center gap-2 flex-wrap">
              {active ? (
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-extrabold border border-[var(--primary)]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_5px_var(--primary)]" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-white/10 flex items-center gap-1">
                  <Power className="w-2.5 h-2.5" />
                  Disabled
                </span>
              )}

              {isAlert && active && (
                <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse">
                  {alertText}
                </span>
              )}
            </div>

            {active && canManage && onUpdate && (
              <button
                type="button"
                onClick={handleSkipNext}
                className="pointer-events-auto text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-400/25 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                title={`Skip next ${frequency === 'weekly' ? 'week (uni off)' : 'billing cycle'}`}
              >
                <FastForward className="w-2.5 h-2.5" />
                Skip {frequency === 'weekly' ? 'Week' : 'Next'}
              </button>
            )}
          </div>
        </div>

        {/* Footer Grid */}
        <div className="pt-3 border-t border-white/10 mt-4">
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Cost / mo</p>
              <p className="text-xl font-black text-slate-100 tabular-nums tracking-tight">
                {formatCurrency(monthlyCost, subscription.currency || defaultCurrency || 'NZD')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Next Billing</p>
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--secondary)]">
                <Calendar className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


