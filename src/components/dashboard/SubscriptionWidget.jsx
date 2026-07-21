import { useState } from 'react';
import { formatCurrency } from '../../utils/finance';
import { Calendar, CreditCard } from 'lucide-react';
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
        className="w-8 h-8 rounded-full object-cover shadow-sm border border-[var(--outline-variant)]/30 bg-[var(--surface-container-high)]"
      />
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-sm text-[var(--background)]"
      style={{ backgroundColor: displayColor }}
    >
      {displayInitials}
    </div>
  );
}

export default function SubscriptionWidget({ subscriptions = [], defaultCurrency }) {
  const activeSubs = (subscriptions || []).filter(s => s.active).slice(0, 3);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative overflow-hidden group transition-all duration-300 hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(211,251,255,0.1)]">
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-headline-md text-[var(--on-surface)]">Active Subscriptions</h3>
      </div>

      {activeSubs.length > 0 ? (
        <div className="space-y-3 flex-1 relative z-10">
          <AnimatePresence mode="popLayout">
            {activeSubs.map((sub, idx) => {
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
                  className="flex items-center justify-between p-3 bg-[var(--surface-container-low)] border border-[var(--outline-variant)] hover:border-[rgba(255,255,255,0.15)] transition-all rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <SubscriptionWidgetLogo
                      logoUrl={logoUrl}
                      name={name}
                      displayColor={displayColor}
                      displayInitials={displayInitials}
                    />
                    <div>
                      <p className="text-label-md text-[var(--on-surface)] truncate font-semibold">{name}</p>
                      <div className="flex items-center gap-1 text-[var(--secondary)] text-label-sm">
                        <Calendar size={12} />
                        <span>{nextBilling}</span>
                        {isAlert && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 font-bold ml-1">
                            {reminderText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-label-md text-[var(--on-surface)] font-bold">
                    {formatCurrency(sub.amount, sub.currency || defaultCurrency || 'NZD')}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <EmptyState
            title="No Active Subscriptions"
            description="Your active subscriptions will appear here."
            icon={CreditCard}
          />
        </div>
      )}
    </div>
  );
}
