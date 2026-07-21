import { Bell, Calendar, CheckCircle2 } from 'lucide-react';
import { getUpcomingBillingAlerts, formatNextBilling } from '../utils/subscriptions';
import { formatCurrency } from '../utils/finance';

export default function NotificationsPage({ subscriptions = [], defaultCurrency }) {
  const alerts = getUpcomingBillingAlerts(subscriptions || [], { today: new Date(), daysAhead: 30 });

  return (
    <main className="space-y-8 animate-in fade-in duration-500">
      <header>
        <p className="text-label-md text-[var(--primary)] uppercase tracking-wider mb-2">Activity Center</p>
        <h1 className="text-headline-lg text-[var(--on-surface)]">Notifications</h1>
        <p className="text-body-md text-[var(--on-surface-variant)] mt-2">
          Stay informed about upcoming billing dates and account alerts.
        </p>
      </header>

      <div className="space-y-4 max-w-3xl">
        {alerts.length > 0 ? (
          alerts.map((sub) => (
            <div key={sub.id} className="glass-card p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[rgba(255,176,202,0.15)] text-[var(--tertiary)] flex items-center justify-center shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-body-lg font-semibold text-[var(--on-surface)]">{sub.label}</h3>
                  <p className="text-label-sm text-[var(--on-surface-variant)] flex items-center gap-1 mt-0.5">
                    <Calendar size={12} />
                    Due on {formatNextBilling(sub.nextBilling)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-headline-md text-[var(--primary)] font-bold">
                  {formatCurrency(sub.amount, sub.currency || defaultCurrency || 'NZD')}
                </span>
                <p className="text-label-sm text-[var(--secondary)] font-medium">Upcoming Renewal</p>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[240px]">
            <div className="w-12 h-12 rounded-full bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] flex items-center justify-center mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-headline-md text-[var(--on-surface)]">All caught up!</h3>
            <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
              No upcoming subscription renewals or alerts within the next 30 days.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
