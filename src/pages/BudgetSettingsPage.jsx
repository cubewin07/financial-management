import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Briefcase, Clock, Sliders, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/finance';
import { CustomNumberInput } from '../components/ui/forms';

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
        <h2 className="text-3xl font-extrabold text-slate-100">Budget & Income Settings</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure income sources and compute your dynamic monthly budget allocation in {defaultCurrency}.
        </p>
      </div>

      {/* Computed Summary Card */}
      <div className="p-6 sm:p-8 relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-xl shadow-2xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Monthly Budget</p>
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-4xl font-extrabold text-slate-100">{formatCurrency(computedTotalMonthlyBudget, defaultCurrency)}</h1>
          <span className="text-sm text-teal-400 font-semibold">/ month</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-white/10">
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block mb-1">Fixed Base</span>
            <span className="text-xl font-bold text-purple-300">{formatCurrency(Number(fixedBudget || 0), defaultCurrency)}</span>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block mb-1">Salary Allocation</span>
            <span className="text-xl font-bold text-amber-300">{formatCurrency(Number(salaryAllocation || 0), defaultCurrency)}</span>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-slate-400 block mb-1">Part-Time Wages</span>
            <span className="text-xl font-bold text-teal-300">{formatCurrency(calculatedPartTimeWages, defaultCurrency)}</span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-xl space-y-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-2 pb-4 border-b border-white/10">
          <Sliders className="text-purple-400 shrink-0" size={22} />
          <h3 className="text-xl font-bold text-slate-100">Income & Budget Breakdown</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Fixed Base Budget */}
          <CustomNumberInput
            label={`Fixed Base Budget (${defaultCurrency})`}
            value={fixedBudget}
            onChange={(e) => setFixedBudget(e.target.value)}
            placeholder="0.00"
          />

          {/* Full-Time Salary Allocation */}
          <CustomNumberInput
            label={`Full-Time Salary Allocation (${defaultCurrency})`}
            value={salaryAllocation}
            onChange={(e) => setSalaryAllocation(e.target.value)}
            placeholder="0.00"
          />

          {/* Part-Time Hours */}
          <CustomNumberInput
            label="Part-Time Hours / Month"
            prefix=""
            step={0.5}
            value={partTimeHours}
            onChange={(e) => setPartTimeHours(e.target.value)}
            placeholder="0"
          />

          {/* Part-Time Hourly Rate */}
          <CustomNumberInput
            label={`Part-Time Hourly Rate (${defaultCurrency}/hr)`}
            value={partTimeRate}
            onChange={(e) => setPartTimeRate(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Form Submission Feedback / Saved Success Banner */}
        <AnimatePresence>
          {savedSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm"
            >
              <CheckCircle2 size={20} className="shrink-0 text-teal-400" />
              <span className="text-sm font-semibold">Monthly budget configuration saved successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            type="submit"
            className="py-3 px-6 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all duration-300"
          >
            Save Budget Configuration
          </button>
        </div>
      </form>
    </motion.div>
  );
}
