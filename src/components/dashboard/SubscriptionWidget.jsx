import { formatCurrency } from '../../utils/finance';
import { Calendar } from 'lucide-react';
import { getSubscriptionBudgetShare } from '../../utils/subscriptions';
import { addMonths, addWeeks, addYears, isAfter, parseISO, format } from 'date-fns';

export default function SubscriptionWidget({ subscriptions }) {
  const activeSubs = subscriptions.filter(s => s.active).slice(0, 3);
  
  const getNextBilling = (start_date, frequency) => {
    if (!start_date) return '—';
    try {
      let current = parseISO(start_date);
      const now = new Date();
      const freq = frequency?.toLowerCase();
      
      if (freq === 'monthly') {
        while (!isAfter(current, now)) current = addMonths(current, 1);
      } else if (freq === 'weekly') {
        while (!isAfter(current, now)) current = addWeeks(current, 1);
      } else if (freq === 'yearly') {
        while (!isAfter(current, now)) current = addYears(current, 1);
      } else {
        return format(current, 'MMM d');
      }
      return format(current, 'MMM d');
    } catch {
      return '—';
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col h-full relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-headline-md text-[var(--on-surface)]">Active Subscriptions</h3>
      </div>

      {activeSubs.length > 0 ? (
        <div className="space-y-3 flex-1 relative z-10">
          {activeSubs.map(sub => (
            <div key={sub.id} className="flex items-center justify-between p-3 bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--secondary-container)] text-[var(--background)] flex items-center justify-center font-bold text-label-sm">
                  {sub.label?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <p className="text-label-md text-[var(--on-surface)] truncate">{sub.label}</p>
                  <div className="flex items-center gap-1 text-[var(--secondary)] text-label-sm">
                    <Calendar size={12} />
                    <span>{getNextBilling(sub.start_date, sub.frequency)}</span>
                  </div>
                </div>
              </div>
              <p className="text-label-md text-[var(--on-surface)]">{formatCurrency(sub.amount)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <p className="text-body-md text-[var(--on-surface-variant)]">No active subscriptions</p>
        </div>
      )}
    </div>
  );
}
