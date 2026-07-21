import { useState } from 'react';
import { motion } from 'framer-motion';

export default function AddSubscriptionModal({ onClose, onAdd }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [domain, setDomain] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [planTier, setPlanTier] = useState('');
  const [remindEnabled, setRemindEnabled] = useState(true);
  const [remindDays, setRemindDays] = useState(3);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label || !amount || !startDate) return;

    onAdd({
      label,
      amount: parseFloat(amount),
      frequency,
      start_date: startDate,
      domain: domain.trim() || null,
      currency: currency.trim() || 'USD',
      plan_tier: planTier.trim() || null,
      remind_days_before: remindEnabled ? Number(remindDays) || 3 : null,
    });
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
        <div>
          <h2 className="text-2xl font-bold text-[var(--on-surface)] m-0">Add Subscription</h2>
          <p className="text-sm text-[var(--on-surface-variant)] mt-1">Track a new fixed cost.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--on-surface)]">Service Name</label>
            <input
              type="text"
              required
              className="input-shell"
              placeholder="e.g. Netflix, Gym, Utilities"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]">$</span>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="input-shell w-full pl-7"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Currency</label>
              <select
                className="input-shell appearance-none bg-[var(--surface-container)]"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="VND">VND (₫)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Brand Domain</label>
              <input
                type="text"
                className="input-shell"
                placeholder="e.g. netflix.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Plan Tier</label>
              <input
                type="text"
                className="input-shell"
                placeholder="e.g. Premium, Family"
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Frequency</label>
              <select
                className="input-shell appearance-none bg-[var(--surface-container)]"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Start Date</label>
              <input
                type="date"
                required
                className="input-shell w-full bg-[var(--surface-container)] text-[var(--on-surface)] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-[var(--surface-container)]/50 rounded-xl border border-white/5 mt-1">
            <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--on-surface)] cursor-pointer">
              <input
                type="checkbox"
                checked={remindEnabled}
                onChange={(e) => setRemindEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <span>Remind me before billing</span>
            </label>

            {remindEnabled && (
              <div className="flex items-center gap-2 pl-6 mt-1 text-xs text-[var(--on-surface-variant)]">
                <span>Remind</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={remindDays}
                  onChange={(e) => setRemindDays(e.target.value)}
                  className="input-shell py-1 px-2 w-16 text-center text-xs"
                />
                <span>days prior</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
             <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 rounded-lg">
               Cancel
             </button>
             <button type="submit" className="btn-primary flex-1 py-3 rounded-lg font-semibold">
               Add Subscription
             </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
