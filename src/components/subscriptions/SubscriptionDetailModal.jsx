import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/finance';
import { getNextBillingDate, formatNextBilling, getSubscriptionBudgetShare } from '../../utils/subscriptions';

export default function SubscriptionDetailModal({ 
  subscription, 
  budget, 
  onClose, 
  onToggle, 
  onRemove, 
  canManage 
}) {
  const { id, label, amount, frequency, start_date, active } = subscription;
  
  const annualTotal = frequency === 'monthly' ? amount * 12 : frequency === 'weekly' ? amount * 52 : amount;
  const nextBillingDate = getNextBillingDate(start_date, frequency);
  
  // Create a temporary array to calculate this sub's budget share
  const budgetShare = getSubscriptionBudgetShare([{...subscription, active: true}], budget);

  const handleCancel = () => {
    if (active) {
      onToggle(id);
    }
    onClose();
  };

  const handleRemove = () => {
    onRemove(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-[var(--surface-container-lowest)]/80 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-card relative w-full max-w-md p-8 flex flex-col gap-6"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold bg-[var(--primary-container)] text-[var(--on-primary)] shadow-[0_0_15px_rgba(208,188,255,0.3)]">
              {label ? label.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)] m-0">{label}</h2>
              <p className="text-sm text-[var(--on-surface-variant)] capitalize">{frequency} Plan</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-black/20 rounded-xl p-4 border border-white/5">
          <div>
             <p className="text-xs text-[var(--on-surface-variant)] mb-1">Billing Amount</p>
             <p className="text-xl font-semibold text-[var(--on-surface)]">{formatCurrency(amount)}</p>
          </div>
          <div>
             <p className="text-xs text-[var(--on-surface-variant)] mb-1">Next Billing</p>
             <p className="text-xl font-semibold text-[var(--secondary)]">{active ? formatNextBilling(nextBillingDate) : 'Inactive'}</p>
          </div>
          <div>
             <p className="text-xs text-[var(--on-surface-variant)] mb-1">Annual Total</p>
             <p className="text-lg font-medium text-[var(--on-surface)]">{formatCurrency(annualTotal)}</p>
          </div>
          <div>
             <p className="text-xs text-[var(--on-surface-variant)] mb-1">Budget Impact</p>
             <p className="text-lg font-medium text-[var(--tertiary)]">{budgetShare.toFixed(1)}%</p>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-col gap-3 mt-2">
             <button onClick={onClose} className="btn-primary w-full py-3 rounded-lg font-semibold">
               Close
             </button>
             <div className="flex gap-3">
               <button 
                 onClick={handleCancel} 
                 className="btn-secondary flex-1 py-3 rounded-lg text-sm"
               >
                 {active ? 'Cancel Subscription' : 'Already Cancelled'}
               </button>
               <button 
                 onClick={handleRemove} 
                 className="bg-[var(--error-container)] text-[var(--error)] border border-[var(--error)]/30 hover:bg-[var(--error)] hover:text-black transition-colors flex-1 py-3 rounded-lg text-sm font-semibold"
               >
                 Remove
               </button>
             </div>
          </div>
        ) : (
          <div className="mt-2">
             <button onClick={onClose} className="btn-primary w-full py-3 rounded-lg font-semibold">
               Close
             </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
