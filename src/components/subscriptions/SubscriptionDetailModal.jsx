import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/finance';
import { getNextBillingDate, formatNextBilling, getSubscriptionBudgetShare } from '../../utils/subscriptions';

export default function SubscriptionDetailModal({
  subscription,
  budget,
  onClose,
  onToggle,
  onRemove,
  onUpdate,
  canManage
}) {
  const { id, label, amount, frequency, start_date, active, domain, currency, plan_tier, remind_days_before } = subscription;

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label || '');
  const [editAmount, setEditAmount] = useState(amount ?? '');
  const [editFrequency, setEditFrequency] = useState(frequency || 'monthly');
  const [editDomain, setEditDomain] = useState(domain || '');
  const [editCurrency, setEditCurrency] = useState(currency || 'USD');
  const [editPlanTier, setEditPlanTier] = useState(plan_tier || '');
  const [editRemindEnabled, setEditRemindEnabled] = useState(remind_days_before != null);
  const [editRemindDays, setEditRemindDays] = useState(remind_days_before ?? 3);

  const annualTotal = frequency === 'monthly' ? amount * 12 : frequency === 'weekly' ? amount * 52 : amount;
  const nextBillingDate = getNextBillingDate(start_date, frequency);

  // Calculate this sub's budget share
  const budgetShare = getSubscriptionBudgetShare([{...subscription, active: true}], budget);

  const handleCancel = () => {
    if (active && onToggle) {
      onToggle(id);
    }
    onClose();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(id);
    }
    onClose();
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (!editLabel || !editAmount) return;

    const updates = {
      label: editLabel.trim(),
      amount: parseFloat(editAmount),
      frequency: editFrequency,
      domain: editDomain.trim() || null,
      currency: editCurrency.trim() || 'USD',
      plan_tier: editPlanTier.trim() || null,
      remind_days_before: editRemindEnabled ? Number(editRemindDays) || 3 : null,
    };

    if (onUpdate) {
      onUpdate(id, updates);
    }
    setIsEditing(false);
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
        className="glass-card relative w-full max-w-md p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold bg-[var(--primary-container)] text-[var(--on-primary)] shadow-[0_0_15px_rgba(208,188,255,0.3)]">
              {label ? label.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)] m-0">{label}</h2>
              <p className="text-sm text-[var(--on-surface-variant)] capitalize">
                {plan_tier ? `${plan_tier} (${frequency})` : `${frequency} Plan`}
              </p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] text-[var(--primary)] border border-[var(--primary)]/30 font-medium transition-colors"
            >
              {isEditing ? 'Cancel Edit' : 'Change Plan'}
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveUpdate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--on-surface-variant)]">Service Name</label>
              <input
                type="text"
                required
                className="input-shell"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--on-surface-variant)]">Amount</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="input-shell"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--on-surface-variant)]">Currency</label>
                <select
                  className="input-shell bg-[var(--surface-container)]"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="VND">VND</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--on-surface-variant)]">Domain</label>
                <input
                  type="text"
                  className="input-shell"
                  placeholder="domain.com"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--on-surface-variant)]">Plan Tier</label>
                <input
                  type="text"
                  className="input-shell"
                  placeholder="Plan Tier"
                  value={editPlanTier}
                  onChange={(e) => setEditPlanTier(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--on-surface-variant)]">Frequency</label>
              <select
                className="input-shell bg-[var(--surface-container)]"
                value={editFrequency}
                onChange={(e) => setEditFrequency(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 p-3 bg-[var(--surface-container)]/50 rounded-xl border border-white/5">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--on-surface)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editRemindEnabled}
                  onChange={(e) => setEditRemindEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span>Remind me before billing</span>
              </label>

              {editRemindEnabled && (
                <div className="flex items-center gap-2 pl-6 text-xs text-[var(--on-surface-variant)]">
                  <span>Remind</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editRemindDays}
                    onChange={(e) => setEditRemindDays(e.target.value)}
                    className="input-shell py-1 px-2 w-16 text-center text-xs"
                  />
                  <span>days prior</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary flex-1 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 bg-black/20 rounded-xl p-4 border border-white/5">
              <div>
                 <p className="text-xs text-[var(--on-surface-variant)] mb-1">Billing Amount</p>
                 <p className="text-xl font-semibold text-[var(--on-surface)]">{formatCurrency(amount, currency || 'USD')}</p>
              </div>
              <div>
                 <p className="text-xs text-[var(--on-surface-variant)] mb-1">Next Billing</p>
                 <p className="text-xl font-semibold text-[var(--secondary)]">{active ? formatNextBilling(nextBillingDate) : 'Inactive'}</p>
              </div>
              <div>
                 <p className="text-xs text-[var(--on-surface-variant)] mb-1">Annual Total</p>
                 <p className="text-lg font-medium text-[var(--on-surface)]">{formatCurrency(annualTotal, currency || 'USD')}</p>
              </div>
              <div>
                 <p className="text-xs text-[var(--on-surface-variant)] mb-1">Budget Impact</p>
                 <p className="text-lg font-medium text-[var(--tertiary)]">{budgetShare.toFixed(1)}%</p>
              </div>
              {domain && (
                <div>
                  <p className="text-xs text-[var(--on-surface-variant)] mb-1">Domain</p>
                  <p className="text-sm font-medium text-[var(--on-surface)]">{domain}</p>
                </div>
              )}
              {remind_days_before != null && (
                <div>
                  <p className="text-xs text-[var(--on-surface-variant)] mb-1">Reminder</p>
                  <p className="text-sm font-medium text-[var(--on-surface)]">{remind_days_before} days before</p>
                </div>
              )}
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
          </>
        )}
      </motion.div>
    </div>
  );
}
