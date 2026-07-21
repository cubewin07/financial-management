import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Briefcase, Clock, Sliders, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/finance';

export default function BudgetSettingsPage({ baseBudget = 150, onSaveBudget, defaultCurrency = 'NZD' }) {
  const [fixedBudget, setFixedBudget] = useState(baseBudget);
  const [salaryAllocation, setSalaryAllocation] = useState(2500);
  const [partTimeHours, setPartTimeHours] = useState(20);
  const [partTimeRate, setPartTimeRate] = useState(25);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const calculatedPartTimeWages = Number(partTimeHours || 0) * Number(partTimeRate || 0);
  const computedTotalMonthlyBudget = Number(fixedBudget || 0) + Number(salaryAllocation || 0) + calculatedPartTimeWages;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSaveBudget) {
      onSaveBudget(computedTotalMonthlyBudget);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 sm:space-y-8 max-w-4xl"
    >
      <div>
        <h2 className="text-headline-lg font-semibold text-[var(--on-surface)]">Budget & Income Settings</h2>
        <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
          Configure income sources and compute your dynamic monthly budget allocation in NZD.
        </p>
      </div>

      {/* Computed Summary Card */}
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden rounded-2xl border border-[var(--outline-variant)]/40 shadow-[0_0_30px_rgba(208,188,255,0.15)] transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
        <p className="text-label-md font-medium text-[var(--on-surface-variant)] uppercase tracking-wider mb-2">Total Monthly Budget</p>
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-display font-bold text-[var(--on-surface)]">{formatCurrency(computedTotalMonthlyBudget, defaultCurrency)}</h1>
          <span className="text-body-md text-[var(--secondary)] font-semibold">/ month</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-[var(--outline-variant)]/40">
          <div className="bg-[var(--surface-container-lowest)]/40 p-3.5 rounded-xl border border-[var(--outline-variant)]/20 transition-all duration-300">
            <span className="text-label-sm text-[var(--on-surface-variant)] block mb-1">Fixed Base</span>
            <span className="text-headline-md font-semibold text-[var(--primary)]">{formatCurrency(Number(fixedBudget || 0), defaultCurrency)}</span>
          </div>
          <div className="bg-[var(--surface-container-lowest)]/40 p-3.5 rounded-xl border border-[var(--outline-variant)]/20 transition-all duration-300">
            <span className="text-label-sm text-[var(--on-surface-variant)] block mb-1">Salary Allocation</span>
            <span className="text-headline-md font-semibold text-[var(--tertiary)]">{formatCurrency(Number(salaryAllocation || 0), defaultCurrency)}</span>
          </div>
          <div className="bg-[var(--surface-container-lowest)]/40 p-3.5 rounded-xl border border-[var(--outline-variant)]/20 transition-all duration-300">
            <span className="text-label-sm text-[var(--on-surface-variant)] block mb-1">Part-Time Wages</span>
            <span className="text-headline-md font-semibold text-[var(--secondary)]">{formatCurrency(calculatedPartTimeWages, defaultCurrency)}</span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-[var(--outline-variant)]/40 transition-all duration-300">
        <div className="flex items-center gap-2 mb-2 pb-4 border-b border-[var(--outline-variant)]/40">
          <Sliders className="text-[var(--primary)] shrink-0" size={22} />
          <h3 className="text-headline-md font-semibold text-[var(--on-surface)]">Income & Budget Breakdown</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Fixed Base Budget */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md font-medium text-[var(--on-surface)]">
              <DollarSign size={18} className="text-[var(--primary)] shrink-0" />
              <span>Fixed Base Budget ({defaultCurrency})</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fixedBudget}
              onChange={e => setFixedBudget(e.target.value)}
              className="input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder="0.00"
            />
            <p className="text-label-sm text-[var(--on-surface-variant)]">Base allowance baseline for monthly expenses.</p>
          </div>

          {/* Full-Time Salary Allocation */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md font-medium text-[var(--on-surface)]">
              <Briefcase size={18} className="text-[var(--tertiary)] shrink-0" />
              <span>Full-Time Salary Allocation ({defaultCurrency})</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salaryAllocation}
              onChange={e => setSalaryAllocation(e.target.value)}
              className="input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--tertiary)] focus:ring-2 focus:ring-[var(--tertiary)]/30"
              placeholder="0.00"
            />
            <p className="text-label-sm text-[var(--on-surface-variant)]">Monthly salary contribution allocated to spending.</p>
          </div>

          {/* Part-Time Hours */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md font-medium text-[var(--on-surface)]">
              <Clock size={18} className="text-[var(--secondary)] shrink-0" />
              <span>Part-Time Hours / Month</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={partTimeHours}
              onChange={e => setPartTimeHours(e.target.value)}
              className="input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/30"
              placeholder="0"
            />
          </div>

          {/* Part-Time Hourly Rate */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-label-md font-medium text-[var(--on-surface)]">
              <DollarSign size={18} className="text-[var(--secondary)] shrink-0" />
              <span>Part-Time Hourly Rate ({defaultCurrency}/hr)</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={partTimeRate}
              onChange={e => setPartTimeRate(e.target.value)}
              className="input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/30"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Form Submission Feedback / Saved Success Banner */}
        <AnimatePresence>
          {savedSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] border border-[rgba(211,251,255,0.25)] shadow-sm"
            >
              <CheckCircle2 size={20} className="shrink-0 text-[var(--secondary)]" />
              <span className="text-label-md font-medium">Monthly budget configuration saved successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end pt-4 border-t border-[var(--outline-variant)]/40">
          <button
            type="submit"
            className="btn-primary py-2.5 px-6 rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
          >
            Save Budget Configuration
          </button>
        </div>
      </form>
    </motion.div>
  );
}
