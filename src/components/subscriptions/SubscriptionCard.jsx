import { useState } from 'react';
import { formatCurrency } from '../../utils/finance';
import { getServicePresentation, projectSubscriptionCost, getNextBillingDate, formatNextBilling, getUpcomingBillingAlerts } from '../../utils/subscriptions';
import { differenceInCalendarDays } from 'date-fns';

export default function SubscriptionCard({ subscription, onClick, onToggle, canManage, defaultCurrency }) {
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

  return (
    <div className="glass-card p-6 flex flex-col text-left w-full hover:bg-white/[0.02] transition-colors relative focus-within:ring-2 focus-within:ring-[var(--primary)]">
      <button
        type="button"
        onClick={() => onClick(subscription)}
        className="absolute inset-0 w-full h-full z-0 cursor-pointer focus:outline-none rounded-xl"
        aria-label={`View details for ${name}`}
      />
      <div className="flex items-start justify-between w-full mb-4 relative z-10 pointer-events-none">
        <div className="flex items-center gap-4">
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              onError={() => setImgError(true)}
              className="w-12 h-12 rounded-full object-cover shadow-lg border border-[var(--outline-variant)]/30 bg-[var(--surface-container-high)]"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-[var(--background)] shadow-lg"
              style={{ backgroundColor: displayColor }}
            >
              {displayInitials}
            </div>
          )}
          <div>
            <h3 className="text-body-lg font-semibold text-[var(--on-surface)] m-0">{name}</h3>
            <p className="text-label-sm text-[var(--on-surface-variant)]">{plan_tier || name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
               {active ? (
                 <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] font-bold">
                   Active
                 </span>
               ) : (
                 <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] font-bold">
                   Inactive
                 </span>
               )}
               {isAlert && active && (
                 <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(255,180,171,0.15)] text-[var(--error)] border border-[rgba(255,180,171,0.25)] font-bold">
                   {alertText}
                 </span>
               )}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="pointer-events-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={active}
                onChange={() => onToggle(id)}
                aria-label={`Toggle active status for ${name}`}
              />
              <div className="w-11 h-6 bg-[var(--surface-container-highest)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
            </label>
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 w-full relative z-10 pointer-events-none">
        <div>
          <p className="text-xs text-[var(--on-surface-variant)] mb-1">Cost / mo</p>
          <p className="text-lg font-semibold text-[var(--on-surface)] tabular-nums">
            {formatCurrency(monthlyCost, subscription.currency || defaultCurrency || 'USD')}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--on-surface-variant)] mb-1">Next Billing</p>
          <p className="text-lg font-semibold text-[var(--on-surface)]">
            {active ? formatNextBilling(nextBillingDate) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
