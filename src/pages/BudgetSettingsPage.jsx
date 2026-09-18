import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, CheckCircle2, PieChart, Search, Plus, Trash2, X, Wallet, Save } from 'lucide-react';
import { formatCurrency, CATEGORIES, getCategoryColor } from '../utils/finance';
import { CustomNumberInput } from '../components/ui/forms';
import { useConfirm } from '../context/ConfirmationContext';

export default function BudgetSettingsPage({
  baseBudget = 0,
  userSettings = null,
  onSaveUserSettings,
  categoryLimits = {},
  onSaveBudget,
  onSaveCategoryLimits,
  defaultCurrency = 'NZD',
}) {
  const confirm = useConfirm();
  const [fixedBudget, setFixedBudget] = useState(userSettings?.fixed_budget ?? baseBudget ?? 0);
  const [salaryAllocation, setSalaryAllocation] = useState(userSettings?.salary_allocation ?? 0);
  const [partTimeHours, setPartTimeHours] = useState(userSettings?.part_time_hours ?? 0);
  const [partTimeRate, setPartTimeRate] = useState(userSettings?.part_time_rate ?? 0);
  const [limitsState, setLimitsState] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [incomeSaveSuccess, setIncomeSaveSuccess] = useState(false);
  const [incomeSaveMessage, setIncomeSaveMessage] = useState('');
  const [limitsSaveSuccess, setLimitsSaveSuccess] = useState(false);
  const [limitsSaveMessage, setLimitsSaveMessage] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (userSettings) {
      setFixedBudget(userSettings.fixed_budget ?? 0);
      setSalaryAllocation(userSettings.salary_allocation ?? 0);
      setPartTimeHours(userSettings.part_time_hours ?? 0);
      setPartTimeRate(userSettings.part_time_rate ?? 0);
    }
  }, [userSettings]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (categoryLimits) {
      setLimitsState(categoryLimits);
    }
  }, [categoryLimits]);

  const calculatedPartTimeWages = Number(partTimeHours || 0) * Number(partTimeRate || 0);
  const computedTotalMonthlyBudget = Number(fixedBudget || 0) + Number(salaryAllocation || 0) + calculatedPartTimeWages;

  // Categories currently active in limits state (with value !== '')
  const activeCategories = useMemo(() => {
    return Object.keys(limitsState).filter((cat) => limitsState[cat] !== undefined && limitsState[cat] !== null);
  }, [limitsState]);

  // Categories not yet added
  const availableCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => !activeCategories.includes(cat));
  }, [activeCategories]);

  // Filtered available categories matching search query
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return availableCategories;
    return availableCategories.filter((cat) =>
      cat.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [availableCategories, searchQuery]);

  const handleAddCategory = (catName) => {
    setLimitsState((prev) => ({
      ...prev,
      [catName]: prev[catName] ?? '',
    }));
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleRemoveCategory = async (catName) => {
    const isConfirmed = await confirm({
      title: 'Remove Category Limit',
      message: `Are you sure you want to remove the budget limit for ${catName}?`,
      description: 'You can re-add and configure this limit at any time.',
      confirmText: 'Remove Limit',
      cancelText: 'Cancel',
      variant: 'warning',
    });

    if (isConfirmed) {
      setLimitsState((prev) => {
        const next = { ...prev };
        delete next[catName];
        return next;
      });
    }
  };

  const handleCategoryLimitChange = (catName, val) => {
    const numericVal = val === '' ? '' : Math.max(0, Number(val));
    setLimitsState((prev) => ({
      ...prev,
      [catName]: numericVal,
    }));
  };

  const getChangedUserSettings = () => {
    const changes = {};
    const origFixed = Number(userSettings?.fixed_budget ?? 0);
    const origSalary = Number(userSettings?.salary_allocation ?? 0);
    const origHours = Number(userSettings?.part_time_hours ?? 0);
    const origRate = Number(userSettings?.part_time_rate ?? 0);
    const origMonthly = Number(userSettings?.monthly_budget ?? 0);

    const curFixed = Number(fixedBudget || 0);
    const curSalary = Number(salaryAllocation || 0);
    const curHours = Number(partTimeHours || 0);
    const curRate = Number(partTimeRate || 0);

    if (curFixed !== origFixed) changes.fixed_budget = curFixed;
    if (curSalary !== origSalary) changes.salary_allocation = curSalary;
    if (curHours !== origHours) changes.part_time_hours = curHours;
    if (curRate !== origRate) changes.part_time_rate = curRate;

    if (Object.keys(changes).length > 0 || computedTotalMonthlyBudget !== origMonthly) {
      changes.monthly_budget = computedTotalMonthlyBudget;
    }

    return changes;
  };

  const handleSaveIncomeAndBudget = async (e) => {
    e.preventDefault();
    const changedFields = getChangedUserSettings();
    const hasChanges = Object.keys(changedFields).length > 0;

    if (hasChanges && onSaveUserSettings) {
      await onSaveUserSettings(changedFields);
    }
    if (onSaveBudget) {
      onSaveBudget(computedTotalMonthlyBudget);
    }

    if (hasChanges) {
      const fieldNames = Object.keys(changedFields).filter((k) => k !== 'monthly_budget').join(', ');
      setIncomeSaveMessage(fieldNames ? `Updated changed fields (${fieldNames}) successfully!` : 'Income & budget saved successfully!');
    } else {
      setIncomeSaveMessage('No income/budget changes detected.');
    }

    setIncomeSaveSuccess(true);
    setTimeout(() => setIncomeSaveSuccess(false), 3000);
  };

  const handleSaveCategoryLimits = async (e) => {
    e.preventDefault();
    if (onSaveCategoryLimits) {
      const cleanedLimits = {};
      Object.entries(limitsState).forEach(([cat, val]) => {
        if (val !== '' && Number(val) > 0) {
          cleanedLimits[cat] = Number(val);
        }
      });
      await onSaveCategoryLimits(cleanedLimits);
    }
    setLimitsSaveMessage('Category limits saved successfully!');
    setLimitsSaveSuccess(true);
    setTimeout(() => setLimitsSaveSuccess(false), 3000);
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const changedFields = getChangedUserSettings();
      const hasIncomeChanges = Object.keys(changedFields).length > 0;

      const cleanedLimits = {};
      Object.entries(limitsState).forEach(([cat, val]) => {
        if (val !== '' && Number(val) > 0) {
          cleanedLimits[cat] = Number(val);
        }
      });

      if (onSaveCategoryLimits) {
        await onSaveCategoryLimits(cleanedLimits);
      }

      if (hasIncomeChanges && onSaveUserSettings) {
        await onSaveUserSettings({
          ...changedFields,
          category_limits: cleanedLimits,
        });
      }

      if (onSaveBudget) {
        onSaveBudget(computedTotalMonthlyBudget);
      }

      setSaveMessage('All budget settings and category limits saved successfully!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setSaveMessage('Error saving settings: ' + (err.message || String(err)));
      setSaveSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCategoryLimits = activeCategories.reduce(
    (sum, cat) => sum + Number(limitsState[cat] || 0),
    0
  );
  const allocationPercent =
    computedTotalMonthlyBudget > 0
      ? Math.round((totalCategoryLimits / computedTotalMonthlyBudget) * 100)
      : 0;
  const unallocatedAmount = computedTotalMonthlyBudget - totalCategoryLimits;

  return (
    <main className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Top Header Row with Title & Quick Save All Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">Budget Settings</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure recurring income streams, calculate total monthly spending power, and balance category limits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="self-start sm:self-auto py-2.5 px-4 sm:px-5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Save size={16} />
          <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* Global Floating Save Notification Toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xl"
          >
            <CheckCircle2 size={20} className="shrink-0 text-teal-400" />
            <span className="text-sm font-semibold">{saveMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Spending Power Calculator & Cockpit Card */}
      <div className="p-5 sm:p-7 relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 backdrop-blur-xl shadow-2xl transition-all">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Monthly Spending Power
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tabular-nums">
                  {formatCurrency(computedTotalMonthlyBudget, defaultCurrency)}
                </h2>
                <span className="text-xs sm:text-sm text-teal-400 font-semibold">/ month</span>
              </div>
            </div>
          </div>

          <span className="self-start sm:self-auto text-xs text-purple-300 font-semibold bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-full">
            Calculated Live
          </span>
        </div>

        {/* Dynamic Formula Breakdown Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-4 border-t border-white/10">
          {/* Source 1: Fixed Base */}
          <div className="bg-slate-900/60 p-3 sm:p-3.5 rounded-2xl border border-purple-500/20 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-medium block">1. Fixed Base</span>
            <span className="text-base sm:text-lg font-black text-purple-300 tabular-nums mt-0.5">
              {formatCurrency(Number(fixedBudget || 0), defaultCurrency)}
            </span>
          </div>

          {/* Source 2: Salary Allocation */}
          <div className="bg-slate-900/60 p-3 sm:p-3.5 rounded-2xl border border-amber-500/20 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-medium block">2. Salary Allocation</span>
            <span className="text-base sm:text-lg font-black text-amber-300 tabular-nums mt-0.5">
              {formatCurrency(Number(salaryAllocation || 0), defaultCurrency)}
            </span>
          </div>

          {/* Source 3: Part-Time Wages */}
          <div className="bg-slate-900/60 p-3 sm:p-3.5 rounded-2xl border border-teal-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>3. Part-Time Wages</span>
              <span className="text-[10px] text-slate-400">{partTimeHours}h @ {formatCurrency(partTimeRate, defaultCurrency)}</span>
            </div>
            <span className="text-base sm:text-lg font-black text-teal-300 tabular-nums mt-0.5">
              {formatCurrency(calculatedPartTimeWages, defaultCurrency)}
            </span>
          </div>
        </div>
      </div>

      {/* Card 1: Income Stream Inputs Form */}
      <form onSubmit={handleSaveAll} className="p-5 sm:p-7 rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl space-y-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-purple-400 shrink-0" size={20} />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">Income Streams</h3>
              <p className="text-xs text-slate-400">Edit the recurring components that form your base budget.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <CustomNumberInput
            label={`Fixed Base Budget (${defaultCurrency})`}
            value={fixedBudget}
            onChange={(e) => setFixedBudget(e.target.value)}
            placeholder="0.00"
          />

          <CustomNumberInput
            label={`Full-Time Salary Allocation (${defaultCurrency})`}
            value={salaryAllocation}
            onChange={(e) => setSalaryAllocation(e.target.value)}
            placeholder="0.00"
          />

          <CustomNumberInput
            label="Part-Time Hours / Month"
            prefix=""
            step={0.5}
            value={partTimeHours}
            onChange={(e) => setPartTimeHours(e.target.value)}
            placeholder="0"
          />

          <CustomNumberInput
            label={`Part-Time Hourly Rate (${defaultCurrency}/hr)`}
            value={partTimeRate}
            onChange={(e) => setPartTimeRate(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </form>

      {/* Card 2: Category Budget Limits Planner */}
      <div className="p-5 sm:p-7 rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl space-y-5 shadow-xl">
        {/* Header with Pie icon and active count badge */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <PieChart className="text-teal-400 shrink-0" size={20} />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">Monthly Category Budget Ceilings</h3>
              <p className="text-xs text-slate-400">Set spending ceilings to balance out your monthly budget.</p>
            </div>
          </div>

          <span className="text-xs text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
            {activeCategories.length} Configured
          </span>
        </div>

        {/* Visual Allocation Balance Gauge */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-1.5">
            <span className="text-slate-300 font-semibold">
              Category Limits: <strong className="text-white tabular-nums">{formatCurrency(totalCategoryLimits, defaultCurrency)}</strong>
              <span className="text-slate-400 font-normal"> of {formatCurrency(computedTotalMonthlyBudget, defaultCurrency)} budget</span>
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-full border text-[11px] ${
              unallocatedAmount >= 0
                ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              {unallocatedAmount >= 0
                ? `${formatCurrency(unallocatedAmount, defaultCurrency)} Unallocated (${100 - allocationPercent}%)`
                : `Over-allocated by ${formatCurrency(Math.abs(unallocatedAmount), defaultCurrency)}!`}
            </span>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allocationPercent > 100
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-purple-400 to-teal-400'
              }`}
              style={{ width: `${Math.min(allocationPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Search & Add Category Input */}
        <div className="relative" ref={searchContainerRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsSearchOpen(false);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Search category to add limit (e.g. Groceries, Dining, Transport)..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-400/50 transition-colors"
            />
            {(searchQuery || isSearchOpen) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Close category search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Dropdown Suggestions */}
          {isSearchOpen && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-xl shadow-2xl z-30 max-h-52 overflow-y-auto custom-scrollbar space-y-1">
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Matching Categories</span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-slate-400 hover:text-white text-[11px] normal-case underline"
                >
                  Close
                </button>
              </div>
              {filteredSuggestions.map((cat) => {
                const catColor = getCategoryColor(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleAddCategory(cat)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                      <span className="text-xs sm:text-sm font-semibold text-white">{cat}</span>
                    </div>
                    <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Plus size={13} /> Add Limit
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick-Add Chips for Unconfigured Categories */}
        {availableCategories.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Add Category:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableCategories.slice(0, 10).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleAddCategory(cat)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={11} className="text-purple-400" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* High-Density Category Limit Rows */}
        {activeCategories.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {activeCategories.map((cat) => {
              const catColor = getCategoryColor(cat);
              const limitVal = Number(limitsState[cat] || 0);
              const percentOfTotal = computedTotalMonthlyBudget > 0 ? Math.round((limitVal / computedTotalMonthlyBudget) * 100) : 0;

              return (
                <div
                  key={cat}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2 hover:border-white/20 transition-all"
                >
                  {/* Category Header Row with Share badge & Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                      <span className="text-xs sm:text-sm font-bold text-white truncate">{cat}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-1.5 py-0.2 rounded shrink-0">
                        {percentOfTotal}%
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title={`Remove limit for ${cat}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Inline Limit Input */}
                  <div>
                    <CustomNumberInput
                      label={`Monthly Limit (${defaultCurrency})`}
                      value={limitsState[cat] ?? ''}
                      onChange={(e) => handleCategoryLimitChange(cat, e.target.value)}
                      placeholder="Enter limit"
                    />
                  </div>

                  {/* Mini Share Bar */}
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: catColor,
                        width: `${Math.min(100, percentOfTotal)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
            <PieChart size={24} className="mx-auto text-slate-500" />
            <p className="text-xs sm:text-sm font-semibold text-slate-300">No category limits set yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Search above or tap any quick-add chip to configure target spending ceilings.
            </p>
          </div>
        )}

        {/* Bottom Unified Save Bar */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10 gap-3">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
