import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import useModalDialog from '../../hooks/useModalDialog';
import { CustomInput, CustomNumberInput, CustomSelect, CustomDatePicker, CustomCheckbox } from '../ui/forms';
import { getLocalDateString } from '../../utils/finance';

export default function AddSubscriptionModal({ onClose, onAdd, defaultCurrency = 'NZD' }) {
  const dialogRef = useModalDialog(true, onClose);
  const [label, setLabel] = useState('');

  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [domain, setDomain] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency || 'NZD');
  const [planTier, setPlanTier] = useState('');
  const [remindEnabled, setRemindEnabled] = useState(true);
  const [remindDays, setRemindDays] = useState('3');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Please enter a service name.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }

    if (!startDate) {
      setError('Please select a billing start date.');
      return;
    }

    let normalizedRemindDays = null;
    if (remindEnabled) {
      const parsedRemind = Number(remindDays);
      if (
        remindDays === '' ||
        !Number.isFinite(parsedRemind) ||
        !Number.isInteger(parsedRemind) ||
        parsedRemind < 0 ||
        parsedRemind > 30
      ) {
        setError('Reminder lead time must be a whole number between 0 and 30 days.');
        return;
      }
      normalizedRemindDays = parsedRemind;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const result = await onAdd?.({
        label: trimmedLabel,
        amount: Math.round(parsedAmount * 100) / 100,
        frequency,
        start_date: startDate,
        domain: domain.trim() || null,
        currency: (currency || 'NZD').trim() || 'NZD',
        plan_tier: planTier.trim() || null,
        remind_days_before: normalizedRemindDays,
      });

      if (result === false || result?.error) {
        setError(result?.error?.message || 'Unable to add subscription. Please try again.');
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to add subscription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-subscription-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="outline-none relative z-10 w-full max-w-md p-5 sm:p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto overscroll-contain"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="add-subscription-title" className="text-xl sm:text-2xl font-bold text-slate-100">Add Subscription</h2>
            <p className="text-sm text-slate-400 mt-1">Track a new recurring expenditure.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5"
            >
              {error}
            </p>
          )}

          <CustomInput
            label="Service Name"
            placeholder="e.g. Netflix, Gym, Spotify"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (error) setError('');
            }}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <CustomNumberInput
                currency={currency}
                label="Amount"
                placeholder="0.00"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError('');
                }}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect
              label="Frequency"
              options={frequencyOptions}
              value={frequency}
              onChange={setFrequency}
            />
            <CustomDatePicker
              label="Start Date"
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                if (error) setError('');
              }}
              required
            />
          </div>

          <div className="flex flex-col gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/10 mt-1">
            <CustomCheckbox
              label="Remind me before billing"
              checked={remindEnabled}
              onChange={(checked) => {
                setRemindEnabled(checked);
                if (error) setError('');
              }}
            />

            {remindEnabled && (
              <div className="flex items-center flex-wrap gap-2 pl-1 sm:pl-7 text-xs text-slate-300">
                <span>Remind</span>
                <div className="w-28">
                  <CustomNumberInput
                    prefix=""
                    aria-label="Reminder days prior"
                    value={remindDays}
                    onChange={(e) => {
                      setRemindDays(e.target.value);
                      if (error) setError('');
                    }}
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>
                <span>days prior (0 = same day)</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
