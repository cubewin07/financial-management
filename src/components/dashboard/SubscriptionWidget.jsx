import { useState } from 'react';
import { formatCurrency } from '../../utils/finance';
import { Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getServicePresentation, getNextBillingDate, formatNextBilling, getUpcomingBillingAlerts } from '../../utils/subscriptions';
import { differenceInCalendarDays } from 'date-fns';
import EmptyState from '../shell/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';

function SubscriptionWidgetLogo({ logoUrl, name, displayColor, displayInitials }) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-xl object-cover shadow-[0_0_12px_rgba(255,255,255,0.1)] border border-white/15 bg-[var(--surface-container-high)]"
      />
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-label-sm text-white shadow-[0_0_12px_rgba(208,188,255,0.25)] border border-white/20"
      style={{ backgroundColor: displayColor }}
    >
      {displayInitials}
    </div>
  );
}

export default function SubscriptionWidget({ subscriptions = [], defaultCurrency }) {
  const activeSubs = (subscriptions || []).filter(s => s.active);
  const totalBurden = activeSubs.reduce((acc, s) => acc + Number(s.amount || 0), 0);
  const displaySubs = activeSubs.slice(0, 3);

  return (
    <motion.div 
      layout
      className="glass-card p-6 flex flex-col justify-start relative overflow-hidden group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(211,251,255,0.1)] h-full"
    >
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight">Active Subscriptions</h3>
            <span className="badge-pill bg-[rgba(0,238,252,0.1)] text-[var(--secondary)] border border-[rgba(0,238,252,0.2)] font-semibold text-[11px]">
              {formatCurrency(totalBurden, defaultCurrency || 'NZD')}/mo
            </span>
          </div>
          <p className="text-overline text-[var(--outline)]">Recurring Bills</p>
        </div>
        <Link 
          to="/subscriptions" 
          className="text-label-sm text-[var(--primary)] hover:text-white flex items-center gap-0.5 font-semibold transition-colors group/link"
        >
          Manage <ChevronRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {displaySubs.length > 0 ? (
        <div className="space-y-2.5 relative z-10">
          <AnimatePresence mode="popLayout">
            {displaySubs.map((sub, idx) => {
              const { name, initials, color, logoUrl } = getServicePresentation(sub);
              const nextBillingDate = getNextBillingDate({ startDate: sub.start_date, frequency: sub.frequency });
              const nextBilling = formatNextBilling(nextBillingDate);

              const displayInitials = initials || name.substring(0, 2).toUpperCase();
              const displayColor = color || 'var(--primary-container)';

              const isAlert = getUpcomingBillingAlerts([sub]).length > 0;
              const daysUntil = differenceInCalendarDays(nextBillingDate, new Date());
              const reminderText = daysUntil === 0 ? 'Reminder today' : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SubscriptionWidgetLogo
                      logoUrl={logoUrl}
                      name={name}
                      displayColor={displayColor}
                      displayInitials={displayInitials}
                    />
                    <div className="min-w-0">
                      <p className="text-label-md text-white truncate font-bold">{name}</p>
                      <div className="flex items-center gap-1.5 text-[var(--secondary)] text-label-sm mt-0.5">
                        <Calendar size={12} className="shrink-0" />
                        <span className="truncate">{nextBilling}</span>
                        {isAlert && (
                          <span className="badge-pill bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                            {reminderText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-label-md text-[var(--on-surface)] font-extrabold px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 inline-block">
                      {formatCurrency(sub.amount, sub.currency || defaultCurrency || 'NZD')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-2 flex items-center justify-center relative z-10">
          <EmptyState type="subscriptions" />
        </div>
      )}
    </motion.div>
  );
}
