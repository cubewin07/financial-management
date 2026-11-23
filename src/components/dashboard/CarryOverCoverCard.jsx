import { useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { CustomNumberInput } from '../ui/forms';
import { formatCurrency, roundCurrency } from '../../utils/finance';

// Carry-over never tops up the budget by itself: this appears once the budget has run out.
export default function CarryOverCoverCard({ remaining = 0, budget = 0, reserve = 0, onAllocate, defaultCurrency = 'NZD' }) {
  const safeReserve = roundCurrency(reserve);
  const overBy = Math.max(0, -remaining);
  const rawSuggested = overBy > 0 ? Math.min(overBy, safeReserve) : safeReserve;
  const suggested = roundCurrency(rawSuggested);
  const [amount, setAmount] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // No budget set and nothing spent is not the same as running out.
  const isOutOfBudget = remaining < 0 || (remaining === 0 && budget > 0);
  const isVisible = isOutOfBudget && safeReserve > 0 && Boolean(onAllocate);

  useEffect(() => {
    if (!isVisible) {
      setAmount(null);
      setError('');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const value = amount ?? String(suggested);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    const rawMoved = Number(value);
    const moved = Number.isFinite(rawMoved) ? roundCurrency(rawMoved) : 0;
    if (!Number.isFinite(rawMoved) || moved <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (moved > safeReserve) {
      setError(`You only have ${formatCurrency(safeReserve, defaultCurrency)} in carry-over.`);
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      const saved = await onAllocate(moved);
      if (saved === false) {
        setError('Could not move your carry-over. Please try again.');
        return;
      }
      setAmount(null);
    } catch {
      setError('Could not move your carry-over. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 shrink-0">
          <ArrowRightLeft size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-100">
            {overBy > 0 ? `You're ${formatCurrency(overBy, defaultCurrency)} over budget` : 'Your budget is used up'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            You have {formatCurrency(safeReserve, defaultCurrency)} in carry-over. Move some into this month if you need it.
          </p>
          {error && (
            <p id="carry-over-cover-error" role="alert" className="text-xs text-rose-300 mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-end gap-2 shrink-0">
        <div className="flex-1 sm:w-32">
          <CustomNumberInput
            label="Amount to move"
            currency={defaultCurrency}
            value={value}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError('');
            }}
            showStepper={false}
            hasError={Boolean(error)}
            aria-describedby={error ? 'carry-over-cover-error' : undefined}
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="h-11 min-h-[44px] px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isSaving ? 'Moving...' : 'Move to budget'}
        </button>
      </div>
    </form>
  );
}
