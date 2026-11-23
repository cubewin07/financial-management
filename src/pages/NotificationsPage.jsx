import { Link } from 'react-router-dom';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { Bell, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { getBillingAmount, getUpcomingBillingAlerts, formatNextBilling } from '../utils/subscriptions';
import { formatCurrency } from '../utils/finance';

export default function NotificationsPage({ subscriptions = [], defaultCurrency = 'NZD' }) {
  const resolvedCurrency = defaultCurrency || 'NZD';
  const today = startOfDay(new Date());
  const alerts = getUpcomingBillingAlerts(subscriptions || [], { today, daysAhead: 30, maxDaysUntilDue: 30 });

  const convertedAlerts = alerts.filter((sub) => !sub.conversion_missing);
  const missingConversionCount = alerts.length - convertedAlerts.length;
  const totalUpcomingConverted = Math.round(
    convertedAlerts.reduce((sum, sub) => sum + getBillingAmount(sub), 0) * 100
  ) / 100;

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-label-md text-[var(--primary)] uppercase tracking-wider mb-1 font-bold">
            Activity Center
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--on-surface)]">
            Notifications
          </h2>
          <p className="text-xs sm:text-sm text-[var(--on-surface-variant)] mt-1">
            Upcoming subscription renewals within their reminder window over the next 30 days.
          </p>
        </div>

        {alerts.length > 0 && (
          <div className="glass-card px-4 py-2.5 rounded-2xl border border-white/10 flex items-center justify-between sm:justify-end gap-4 shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {alerts.length} Upcoming Renewal{alerts.length === 1 ? '' : 's'}
              </p>
              <p className="text-base sm:text-lg font-black tabular-nums text-[var(--primary)]">
                {convertedAlerts.length === 0 && missingConversionCount > 0
                  ? '—'
                  : formatCurrency(totalUpcomingConverted, resolvedCurrency)}
              </p>
              {missingConversionCount > 0 && (
                <p className="text-[10px] text-amber-300">
                  +{missingConversionCount} pending FX rate
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="space-y-2.5 sm:space-y-4 max-w-3xl">
        {alerts.length > 0 ? (
          alerts.map((sub) => {
            const daysUntil = sub.nextBilling
              ? differenceInCalendarDays(startOfDay(sub.nextBilling), today)
              : null;
            const urgencyText =
              daysUntil === null
                ? 'Upcoming Renewal'
                : daysUntil <= 0
                  ? 'Due today'
                  : daysUntil === 1
                    ? 'Due tomorrow'
                    : `Due in ${daysUntil} days`;
            const isUrgent = daysUntil !== null && daysUntil <= 1;
            const subCurrency = sub.currency || resolvedCurrency;
            const displayAmount = sub.conversion_missing
              ? formatCurrency(sub.amount, subCurrency)
              : formatCurrency(getBillingAmount(sub), resolvedCurrency);
            const showConvertedFrom =
              !sub.conversion_missing && sub.currency && sub.currency !== resolvedCurrency;

            return (
              <Link
                key={sub.id}
                to="/subscriptions"
                className="glass-card p-3.5 sm:p-5 rounded-2xl flex items-center justify-between gap-3 hover:border-[var(--primary)]/40 transition-all group min-h-[60px]"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isUrgent
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                      : 'bg-[rgba(255,176,202,0.15)] text-[var(--tertiary)] border border-[var(--tertiary)]/20'
                  }`}>
                    <Bell size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--on-surface)] truncate group-hover:text-[var(--primary)] transition-colors">
                        {sub.label}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                        isUrgent
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20'
                      }`}>
                        {urgencyText}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--on-surface-variant)] flex items-center gap-1.5 mt-1">
                      <Calendar size={12} className="shrink-0" />
                      <span>
                        {formatNextBilling(sub.nextBilling)} · {sub.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2.5">
                  <div>
                    <span className="text-base sm:text-xl text-[var(--primary)] font-black tabular-nums block">
                      {displayAmount}
                    </span>
                    {sub.conversion_missing ? (
                      <p className="text-[10px] text-amber-300 font-medium">FX unavailable</p>
                    ) : showConvertedFrom ? (
                      <p className="text-[10px] text-slate-400">
                        Billed {formatCurrency(sub.amount, subCurrency)}
                      </p>
                    ) : null}
                  </div>
                  <ArrowRight size={15} className="text-slate-500 group-hover:text-[var(--primary)] transition-colors hidden sm:block" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="glass-card p-8 sm:p-12 rounded-3xl text-center flex flex-col items-center justify-center min-h-[240px]">
            <div className="w-12 h-12 rounded-full bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] flex items-center justify-center mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-headline-md text-[var(--on-surface)]">All caught up!</h3>
            <p className="text-sm text-[var(--on-surface-variant)] mt-1 max-w-sm">
              No upcoming subscription renewals or reminder alerts within the next 30 days.
            </p>
            <Link
              to="/subscriptions"
              className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-semibold text-slate-200 inline-flex items-center gap-2 transition-colors"
            >
              Manage Subscriptions
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
