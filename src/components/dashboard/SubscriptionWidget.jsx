import { useState } from 'react';
import { formatCurrency } from '../../utils/finance';
import { Calendar } from 'lucide-react';
import { getServicePresentation, getNextBillingDate, formatNextBilling, getUpcomingBillingAlerts } from '../../utils/subscriptions';
import { differenceInCalendarDays } from 'date-fns';

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

export default function SubscriptionWidget({ subscriptions, defaultCurrency }) {
  const activeSubs = subscriptions.filter(s => s.active).slice(0, 3);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-headline-md text-[var(--on-surface)]">Active Subscriptions</h3>
      </div>

      {activeSubs.length > 0 ? (
        <div className="space-y-3 flex-1 relative z-10">
          {activeSubs.map(sub => {
            const { name, initials, color, logoUrl } = getServicePresentation(sub);
            const nextBillingDate = getNextBillingDate({ startDate: sub.start_date, frequency: sub.frequency });
            const nextBilling = formatNextBilling(nextBillingDate);

            const displayInitials = initials || name.substring(0, 2).toUpperCase();
            const displayColor = color || 'var(--primary-container)';

            const isAlert = getUpcomingBillingAlerts([sub]).length > 0;
            const daysUntil = differenceInCalendarDays(nextBillingDate, new Date());
            const reminderText = daysUntil === 0 ? 'Reminder today' : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;

            return (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl">
                <div className="flex items-center gap-3">
                  <SubscriptionWidgetLogo
                    logoUrl={logoUrl}
                    name={name}
                    displayColor={displayColor}
                    displayInitials={displayInitials}
                  />
                  <div>
                    <p className="text-label-md text-[var(--on-surface)] truncate">{name}</p>
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
                <p className="text-label-md text-[var(--on-surface)]">
                  {formatCurrency(sub.amount, sub.currency || defaultCurrency || 'USD')}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <p className="text-body-md text-[var(--on-surface-variant)]">No active subscriptions</p>
        </div>
      )}
    </div>
  );
}
