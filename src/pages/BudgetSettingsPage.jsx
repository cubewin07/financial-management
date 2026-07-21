import { useState } from 'react';
import { DollarSign, Briefcase, Clock, Sliders, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/finance';

export default function BudgetSettingsPage({ baseBudget = 150, onSaveBudget }) {
  const [fixedBudget, setFixedBudget] = useState(baseBudget);
  const [salaryAllocation, setSalaryAllocation] = useState(2500);
  const [partTimeHours, setPartTimeHours] = useState(20);
  const [partTimeRate, setPartTimeRate] = useState(25);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const calculatedPartTimeWages = Number(partTimeHours) * Number(partTimeRate);
  const computedTotalMonthlyBudget = Number(fixedBudget) + Number(salaryAllocation) + calculatedPartTimeWages;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSaveBudget) {
      onSaveBudget(computedTotalMonthlyBudget);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-headline-lg text-[var(--on-surface)]">Budget & Income Settings</h2>
        <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
          Configure income sources and compute your dynamic monthly budget allocation.
        </p>
      </div>

      {/* Computed Summary Card */}
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden shadow-[0_0_30px_rgba(208,188,255,0.15)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
        <p className="text-label-md text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Total Monthly Budget</p>
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-display text-[var(--on-surface)]">{formatCurrency(computedTotalMonthlyBudget)}</h1>
          <span className="text-body-md text-[var(--secondary)] font-semibold">/ month</span>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--outline-variant)]">
          <div>
            <span className="text-label-sm text-[var(--on-surface-variant)] block mb-0.5">Fixed Base</span>
            <span className="text-headline-md text-[var(--primary)]">{formatCurrency(fixedBudget)}</span>
          </div>
          <div>
            <span className="text-label-sm text-[var(--on-surface-variant)] block mb-0.5">Salary Allocation</span>
            <span className="text-headline-md text-[var(--tertiary)]">{formatCurrency(salaryAllocation)}</span>
          </div>
          <div>
            <span className="text-label-sm text-[var(--on-surface-variant)] block mb-0.5">Part-Time Wages</span>
            <span className="text-headline-md text-[var(--secondary)]">{formatCurrency(calculatedPartTimeWages)}</span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-[var(--outline-variant)]">
          <Sliders className="text-[var(--primary)]" size={20} />
          <h3 className="text-headline-md text-[var(--on-surface)]">Income & Budget Breakdown</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Fixed Base Budget */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md text-[var(--on-surface)]">
              <DollarSign size={18} className="text-[var(--primary)]" />
              <span>Fixed Base Budget ($)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fixedBudget}
              onChange={e => setFixedBudget(Number(e.target.value))}
              className="input-shell w-full"
            />
            <p className="text-label-sm text-[var(--on-surface-variant)]">Base allowance baseline for monthly expenses.</p>
          </div>

          {/* Full-Time Salary Allocation */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md text-[var(--on-surface)]">
              <Briefcase size={18} className="text-[var(--tertiary)]" />
              <span>Full-Time Salary Allocation ($)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salaryAllocation}
              onChange={e => setSalaryAllocation(Number(e.target.value))}
              className="input-shell w-full"
            />
            <p className="text-label-sm text-[var(--on-surface-variant)]">Monthly salary contribution allocated to spending.</p>
          </div>

          {/* Part-Time Hours */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md text-[var(--on-surface)]">
              <Clock size={18} className="text-[var(--secondary)]" />
              <span>Part-Time Hours / Month</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={partTimeHours}
              onChange={e => setPartTimeHours(Number(e.target.value))}
              className="input-shell w-full"
            />
          </div>

          {/* Part-Time Hourly Rate */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md text-[var(--on-surface)]">
              <DollarSign size={18} className="text-[var(--secondary)]" />
              <span>Part-Time Hourly Rate ($/hr)</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={partTimeRate}
              onChange={e => setPartTimeRate(Number(e.target.value))}
              className="input-shell w-full"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] border border-[rgba(211,251,255,0.2)]">
            <CheckCircle2 size={18} />
            <span className="text-label-md">Monthly budget configuration saved successfully!</span>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-[var(--outline-variant)]">
          <button type="submit" className="btn-primary py-2.5 px-6">
            Save Budget Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
