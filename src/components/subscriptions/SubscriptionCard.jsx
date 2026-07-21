import { formatCurrency } from '../../utils/finance';
import { projectSubscriptionCost, getNextBillingDate, formatNextBilling } from '../../utils/subscriptions';

export default function SubscriptionCard({ subscription, onClick, onToggle, canManage }) {
  const { id, label, active, start_date, frequency } = subscription;
  const initial = label ? label.charAt(0).toUpperCase() : '?';
  const monthlyCost = projectSubscriptionCost(subscription);
  const nextBillingDate = getNextBillingDate(start_date, frequency);
  
  return (
    <button 
      type="button" 
      onClick={() => onClick(subscription)}
      className="glass-card p-6 flex flex-col text-left w-full hover:bg-white/[0.02] transition-colors relative"
    >
      <div className="flex items-start justify-between w-full mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-[var(--primary-container)] text-[var(--on-primary)] shadow-[0_0_15px_rgba(208,188,255,0.3)]">
            {initial}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--on-surface)] m-0">{label}</h3>
            <div className="flex items-center gap-2 mt-1">
               {active ? (
                 <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] font-bold">
                   Active
                 </span>
               ) : (
                 <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] font-bold">
                   Inactive
                 </span>
               )}
            </div>
          </div>
        </div>
        
        {canManage && (
          <div onClick={(e) => e.stopPropagation()} className="pointer-events-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={active}
                onChange={() => onToggle(id)}
              />
              <div className="w-11 h-6 bg-[var(--surface-container-highest)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
            </label>
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 w-full">
        <div>
          <p className="text-xs text-[var(--on-surface-variant)] mb-1">Cost / mo</p>
          <p className="text-lg font-semibold text-[var(--on-surface)] tabular-nums">
            {formatCurrency(monthlyCost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--on-surface-variant)] mb-1">Next Billing</p>
          <p className="text-lg font-semibold text-[var(--on-surface)]">
            {active ? formatNextBilling(nextBillingDate) : '—'}
          </p>
        </div>
      </div>
    </button>
  );
}
