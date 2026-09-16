import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/finance';
import {
  getNextBillingDate,
  formatNextBilling,
  getSubscriptionBudgetShare,
  skipNextBillingCycle,
  computeSkipPayload,
} from '../../utils/subscriptions';
import { CustomInput, CustomNumberInput, CustomSelect, CustomCheckbox, CustomDatePicker } from '../ui/forms';
import { FastForward } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmationContext';

export default function SubscriptionDetailModal({
  subscription,
  budget,
  onClose,
  onToggle,
  onRemove,
  onUpdate,
  canManage
}) {
  const confirm = useConfirm();
  const { id, label, amount, frequency, start_date, active, domain, currency, plan_tier, remind_days_before } = subscription;

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label || '');
  const [editAmount, setEditAmount] = useState(amount ?? '');
  const [editFrequency, setEditFrequency] = useState(frequency || 'monthly');
  const [editStartDate, setEditStartDate] = useState(start_date || new Date().toISOString().slice(0, 10));
  const [editDomain, setEditDomain] = useState(domain || '');
  const [editCurrency, setEditCurrency] = useState(currency || 'NZD');
  const [editPlanTier, setEditPlanTier] = useState(plan_tier || '');
  const [editRemindEnabled, setEditRemindEnabled] = useState(remind_days_before != null);
  const [editRemindDays, setEditRemindDays] = useState(remind_days_before ?? 3);

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

  const annualTotal = frequency === 'monthly' ? amount * 12 : frequency === 'weekly' ? amount * 52 : amount;
  const nextBillingDate = getNextBillingDate(start_date, frequency);
  const budgetShare = getSubscriptionBudgetShare([{...subscription, active: true}], budget);

  const handleCancel = () => {
    if (active && onToggle) {
      onToggle(id);
    }
    onClose();
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    const isConfirmed = await confirm({
      title: 'Remove Subscription',
      message: `Are you sure you want to remove "${label}" (${formatCurrency(amount, currency || 'NZD')} / ${frequency})?`,
      description: 'This subscription will be removed from your active tracking.',
      confirmText: 'Remove Subscription',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (isConfirmed) {
      onRemove(id);
      onClose();
    }
  };

  const handleSkipCycle = () => {
    if (!onUpdate) return;
    const skipPayload = computeSkipPayload(subscription);
    if (skipPayload) {
      onUpdate(id, {
        start_date: skipPayload.start_date,
        initial_start_date: skipPayload.initial_start_date,
        skipped_dates: skipPayload.skipped_dates,
      });
    }
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (!editLabel || !editAmount || !editStartDate) return;

    const updates = {
      label: editLabel.trim(),
      amount: Number(editAmount) || 0,
      currency: editCurrency,
      domain: editDomain.trim() || null,
      plan_tier: editPlanTier.trim() || null,
      frequency: editFrequency,
      start_date: editStartDate,
    };

    if (onUpdate) {
      onUpdate(id, updates);
    }
    setIsEditing(false);
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
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              {label ? label.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{label}</h2>
              <p className="text-xs text-slate-400 capitalize mt-0.5">
                {plan_tier ? `${plan_tier} (${frequency})` : `${frequency} Plan`}
              </p>
            </div>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-purple-300 font-semibold transition-colors border border-purple-400/20"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Plan'}
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveUpdate} className="flex flex-col gap-4">
            <CustomInput
              label="Service Name"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              required
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <CustomNumberInput
                  label="Amount"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Frequency"
                options={frequencyOptions}
                value={editFrequency}
                onChange={setEditFrequency}
              />
              <CustomDatePicker
                label="Start / Billing Anchor"
                value={editStartDate}
                onChange={setEditStartDate}
                required
              />
            </div>

            <div className="flex flex-col gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/10">
              <CustomCheckbox
                label="Remind me before billing"
                checked={editRemindEnabled}
                onChange={setEditRemindEnabled}
              />

              {editRemindEnabled && (
                <div className="flex items-center gap-2 pl-7 text-xs text-slate-300">
                  <span>Remind</span>
                  <div className="w-20">
                    <CustomNumberInput
                      prefix=""
                      value={editRemindDays}
                      onChange={(e) => setEditRemindDays(e.target.value)}
                      min={1}
                      max={30}
                    />
                  </div>
                  <span>days prior</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 bg-slate-800/40 rounded-2xl p-4 border border-white/10">
              <div>
                <p className="text-xs text-slate-400 mb-1">Billing Amount</p>
                <p className="text-xl font-semibold text-slate-100">{formatCurrency(amount, currency || 'NZD')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Next Billing</p>
                <p className="text-xl font-semibold text-purple-300">{active ? formatNextBilling(nextBillingDate) : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Annual Total</p>
                <p className="text-lg font-medium text-slate-200">{formatCurrency(annualTotal, currency || 'NZD')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Budget Impact</p>
                <p className="text-lg font-medium text-amber-300">{budgetShare.toFixed(1)}%</p>
              </div>
              {domain && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Domain</p>
                  <p className="text-sm font-medium text-slate-200">{domain}</p>
                </div>
              )}
              {remind_days_before != null && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Reminder</p>
                  <p className="text-sm font-medium text-slate-200">{remind_days_before} days before</p>
                </div>
              )}
            </div>

            {canManage ? (
              <div className="flex flex-col gap-3 mt-2">
                {active && (
                  <button
                    type="button"
                    onClick={handleSkipCycle}
                    className="w-full py-2.5 rounded-xl font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-400/25 transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    Skip {frequency === 'weekly' ? 'Next Week (Uni Break)' : 'Next Billing Period'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
                >
                  Close
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm"
                  >
                    {active ? 'Disable Subscription' : 'Enable Subscription'}
                  </button>
                  <button
                    onClick={handleRemove}
                    className="flex-1 py-3 rounded-xl font-semibold bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
                >
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
