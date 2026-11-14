import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useModalDialog from '../../hooks/useModalDialog';
import { formatCurrency, getLocalDateString } from '../../utils/finance';
import {
  getNextBillingDate,
  formatNextBilling,
  getSubscriptionBudgetShare,
  computeSkipPayload,
  getBillingAmount,
} from '../../utils/subscriptions';
import { CustomInput, CustomNumberInput, CustomSelect, CustomCheckbox, CustomDatePicker } from '../ui/forms';
import { FastForward, X } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmationContext';

export default function SubscriptionDetailModal({
  subscription,
  budget,
  onClose,
  onToggle,
  onRemove,
  onUpdate,
  defaultCurrency = 'NZD',
}) {
  const dialogRef = useModalDialog(true, onClose);
  const confirm = useConfirm();
  const { id, label, amount, frequency, start_date, active, domain, currency, plan_tier, remind_days_before } = subscription;

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label || '');
  const [editAmount, setEditAmount] = useState(amount ?? '');
  const [editFrequency, setEditFrequency] = useState(frequency || 'monthly');
  const [editStartDate, setEditStartDate] = useState(start_date || getLocalDateString());
  const [editDomain, setEditDomain] = useState(domain || '');
  const [editCurrency, setEditCurrency] = useState(currency || defaultCurrency || 'NZD');
  const [editPlanTier, setEditPlanTier] = useState(plan_tier || '');
  const [editRemindEnabled, setEditRemindEnabled] = useState(remind_days_before != null);
  const [editRemindDays, setEditRemindDays] = useState(remind_days_before != null ? String(remind_days_before) : '3');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetEditFields = useCallback(() => {
    setEditLabel(label || '');
    setEditAmount(amount ?? '');
    setEditFrequency(frequency || 'monthly');
    setEditStartDate(start_date || getLocalDateString());
    setEditDomain(domain || '');
    setEditCurrency(currency || defaultCurrency || 'NZD');
    setEditPlanTier(plan_tier || '');
    setEditRemindEnabled(remind_days_before != null);
    setEditRemindDays(remind_days_before != null ? String(remind_days_before) : '3');
    setError('');
  }, [label, amount, frequency, start_date, domain, currency, defaultCurrency, plan_tier, remind_days_before]);

  useEffect(() => {
    if (!isEditing) {
      resetEditFields();
    }
  }, [isEditing, resetEditFields]);

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

  const hasBudget = Number.isFinite(Number(budget)) && Number(budget) > 0;
  const billingAmount = getBillingAmount(subscription);
  const annualBaseAmount = subscription.conversion_missing ? Number(amount || 0) : billingAmount;
  const annualTotal =
    frequency === 'monthly'
      ? annualBaseAmount * 12
      : frequency === 'weekly'
        ? annualBaseAmount * 52
        : annualBaseAmount;
  const billedInOtherCurrency = Boolean(currency) && currency !== defaultCurrency && !subscription.conversion_missing;
  const nextBillingDate = getNextBillingDate(start_date, frequency);
  const budgetShare = hasBudget && !subscription.conversion_missing
    ? getSubscriptionBudgetShare([{ ...subscription, active: true }], budget)
    : null;

  const handleToggleEdit = () => {
    if (isEditing) {
      resetEditFields();
      setIsEditing(false);
    } else {
      resetEditFields();
      setIsEditing(true);
    }
  };

  const handleToggleActive = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const result = await onToggle?.(id);
      if (result === false || result?.error) {
        setError(result?.error?.message || 'Unable to update subscription status.');
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to update subscription status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove || isSubmitting) return;
    const isConfirmed = await confirm({
      title: 'Remove Subscription',
      message: `Are you sure you want to remove "${label}" (${formatCurrency(amount, currency || defaultCurrency || 'NZD')} / ${frequency})?`,
      description: 'It will stop being tracked. Charges from the last 90 days stay in your spending history.',
      confirmText: 'Remove Subscription',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    setError('');
    setIsSubmitting(true);
    try {
      const result = await onRemove(id);
      if (result === false || result?.error) {
        setError(result?.error?.message || 'Unable to remove subscription.');
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to remove subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipCycle = async () => {
    if (!onUpdate || isSubmitting) return;
    const skipPayload = computeSkipPayload(subscription);
    if (!skipPayload) return;

    setError('');
    setIsSubmitting(true);
    try {
      const result = await onUpdate(id, {
        start_date: skipPayload.start_date,
        initial_start_date: skipPayload.initial_start_date,
        skipped_dates: skipPayload.skipped_dates,
      });
      if (result === false || result?.error) {
        setError(result?.error?.message || 'Unable to skip the next billing cycle.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to skip the next billing cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedLabel = editLabel.trim();
    if (!trimmedLabel) {
      setError('Please enter a service name.');
      return;
    }

    const parsedAmount = Number(editAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }

    if (!editStartDate) {
      setError('Please select a billing start date.');
      return;
    }

    let normalizedRemindDays = null;
    if (editRemindEnabled) {
      const parsedRemind = Number(editRemindDays);
      if (
        editRemindDays === '' ||
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

    const updates = {
      label: trimmedLabel,
      amount: Math.round(parsedAmount * 100) / 100,
      currency: editCurrency || defaultCurrency || 'NZD',
      domain: editDomain.trim() || null,
      plan_tier: editPlanTier.trim() || null,
      frequency: editFrequency,
      start_date: editStartDate,
      initial_start_date: editStartDate !== start_date ? editStartDate : (subscription.initial_start_date || editStartDate),
      skipped_dates: editStartDate !== start_date ? [] : (subscription.skipped_dates || []),
      remind_days_before: normalizedRemindDays,
    };

    setError('');
    setIsSubmitting(true);
    try {
      const result = await onUpdate?.(id, updates);
      if (result === false || result?.error) {
        setError(result?.error?.message || 'Unable to save subscription changes.');
        return;
      }
      setIsEditing(false);
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to save subscription changes.');
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
        aria-labelledby="subscription-detail-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="outline-none relative z-10 w-full max-w-md p-5 sm:p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto overscroll-contain"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-[52px] sm:h-[52px] shrink-0 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              {label ? label.trim().charAt(0).toUpperCase() || '?' : '?'}
            </div>
            <div className="min-w-0">
              <h2 id="subscription-detail-title" className="text-lg sm:text-xl font-bold text-slate-100 truncate">{label}</h2>
              <p className="text-xs text-slate-400 capitalize mt-0.5 truncate">
                {plan_tier ? `${plan_tier} (${frequency})` : `${frequency} Plan`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 -mr-1.5 -mt-1">
            <button
              type="button"
              onClick={handleToggleEdit}
              disabled={isSubmitting}
              className="min-h-[44px] text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-300 font-semibold transition-colors border border-purple-400/20 cursor-pointer disabled:opacity-50"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Plan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5"
          >
            {error}
          </p>
        )}

        {isEditing ? (
          <form onSubmit={handleSaveUpdate} noValidate className="flex flex-col gap-4">
            <CustomInput
              label="Service Name"
              value={editLabel}
              onChange={(e) => {
                setEditLabel(e.target.value);
                if (error) setError('');
              }}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <CustomNumberInput
                  currency={editCurrency}
                  label="Amount"
                  min={0.01}
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => {
                    setEditAmount(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
              </div>
              <CustomSelect
                label="Currency"
                options={currencyOptions}
                value={editCurrency}
                onChange={setEditCurrency}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomInput
                label="Domain"
                placeholder="domain.com"
                value={editDomain}
                onChange={(e) => setEditDomain(e.target.value)}
              />
              <CustomInput
                label="Plan Tier"
                placeholder="Tier"
                value={editPlanTier}
                onChange={(e) => setEditPlanTier(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomSelect
                label="Frequency"
                options={frequencyOptions}
                value={editFrequency}
                onChange={setEditFrequency}
              />
              <CustomDatePicker
                label="Start / Billing Anchor"
                value={editStartDate}
                onChange={(val) => {
                  setEditStartDate(val);
                  if (error) setError('');
                }}
                required
              />
            </div>

            <div className="flex flex-col gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/10">
              <CustomCheckbox
                label="Remind me before billing"
                checked={editRemindEnabled}
                onChange={(checked) => {
                  setEditRemindEnabled(checked);
                  if (error) setError('');
                }}
              />

              {editRemindEnabled && (
                <div className="flex items-center flex-wrap gap-2 pl-1 sm:pl-7 text-xs text-slate-300">
                  <span>Remind</span>
                  <div className="w-28">
                    <CustomNumberInput
                      prefix=""
                      aria-label="Reminder days prior"
                      value={editRemindDays}
                      onChange={(e) => {
                        setEditRemindDays(e.target.value);
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
                onClick={handleToggleEdit}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 bg-slate-800/40 rounded-2xl p-4 border border-white/10">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-1">Billing Amount</p>
                <p className="text-lg sm:text-xl font-semibold text-slate-100 tabular-nums">{formatCurrency(amount, currency || defaultCurrency)}</p>
                {billedInOtherCurrency && (
                  <p className="text-xs text-slate-400 mt-0.5">≈ {formatCurrency(billingAmount, defaultCurrency)}</p>
                )}
                {subscription.conversion_missing && (
                  <p className="text-[11px] text-amber-300 mt-0.5">FX rate unavailable</p>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-1">Next Billing</p>
                <p className="text-lg sm:text-xl font-semibold text-purple-300">{active ? formatNextBilling(nextBillingDate) : 'Inactive'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-1">Annual Total</p>
                <p className="text-base sm:text-lg font-medium text-slate-200 tabular-nums">
                  {formatCurrency(annualTotal, subscription.conversion_missing ? (currency || defaultCurrency) : defaultCurrency)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-1">Budget Impact</p>
                <p className="text-base sm:text-lg font-medium text-amber-300 tabular-nums">
                  {budgetShare !== null ? `${budgetShare.toFixed(1)}%` : '—'}
                </p>
                {subscription.conversion_missing ? (
                  <p className="text-[11px] text-slate-400 mt-0.5">Needs FX rate</p>
                ) : !hasBudget && (
                  <p className="text-[11px] text-slate-400 mt-0.5">No budget set</p>
                )}
              </div>
              {domain && (
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Domain</p>
                  <p className="text-sm font-medium text-slate-200 truncate">{domain}</p>
                </div>
              )}
              {remind_days_before != null && (
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 mb-1">Reminder</p>
                  <p className="text-sm font-medium text-slate-200">
                    {remind_days_before === 0
                      ? 'Same day'
                      : `${remind_days_before} day${remind_days_before === 1 ? '' : 's'} before`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {active && (
                <button
                  type="button"
                  onClick={handleSkipCycle}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-400/25 transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Skip {frequency === 'weekly' ? 'Next Week (Uni Break)' : 'Next Billing Period'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer"
              >
                Close
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] py-3 px-2 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer disabled:opacity-50"
                >
                  {active ? 'Disable Subscription' : 'Enable Subscription'}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isSubmitting}
                  className="flex-1 min-h-[44px] py-3 px-2 rounded-xl font-semibold bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all text-sm cursor-pointer disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
