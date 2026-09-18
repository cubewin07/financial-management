import { useState } from 'react';
import { motion } from 'framer-motion';
import { CustomInput, CustomNumberInput, CustomSelect, CustomDatePicker, CustomCheckbox } from '../ui/forms';

export default function AddSubscriptionModal({ onClose, onAdd }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [domain, setDomain] = useState('');
  const [currency, setCurrency] = useState('NZD');
  const [planTier, setPlanTier] = useState('');
  const [remindEnabled, setRemindEnabled] = useState(true);
  const [remindDays, setRemindDays] = useState(3);

  const currencyOptions = [
    { label: 'NZD ($)', value: 'NZD' },
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'GBP (£)', value: 'GBP' },
    { label: 'CAD ($)', value: 'CAD' },
    { label: 'AUD ($)', value: 'AUD' },
    { label: 'VND (₫)', value: 'VND' },
  ];

  const frequencyOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label || !amount || !startDate) return;

    onAdd({
      label,
      amount: parseFloat(amount),
      frequency,
      start_date: startDate,
      domain: domain.trim() || null,
      currency: currency.trim() || 'NZD',
      plan_tier: planTier.trim() || null,
      remind_days_before: remindEnabled ? Number(remindDays) || 3 : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
      >
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Add Subscription</h2>
          <p className="text-sm text-slate-400 mt-1">Track a new recurring expenditure.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CustomInput
            label="Service Name"
            placeholder="e.g. Netflix, Gym, Spotify"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <CustomNumberInput
                label="Amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <CustomSelect
              label="Currency"
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomInput
              label="Brand Domain"
              placeholder="e.g. netflix.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <CustomInput
              label="Plan Tier"
              placeholder="e.g. Premium"
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              label="Frequency"
              options={frequencyOptions}
              value={frequency}
              onChange={setFrequency}
            />
            <CustomDatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
            />
          </div>

          <div className="flex flex-col gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/10 mt-1">
            <CustomCheckbox
              label="Remind me before billing"
              checked={remindEnabled}
              onChange={setRemindEnabled}
            />

            {remindEnabled && (
              <div className="flex items-center gap-2 pl-7 text-xs text-slate-300">
                <span>Remind</span>
                <div className="w-20">
                  <CustomNumberInput
                    prefix=""
                    value={remindDays}
                    onChange={(e) => setRemindDays(e.target.value)}
                    min={1}
                    max={30}
                  />
                </div>
                <span>days prior</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
            >
              Add Subscription
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
