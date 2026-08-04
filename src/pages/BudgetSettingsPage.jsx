import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, CheckCircle2, PieChart, Search, Plus, Trash2, X } from 'lucide-react';
import { formatCurrency, CATEGORIES, getCategoryColor } from '../utils/finance';
import { CustomNumberInput } from '../components/ui/forms';

export default function BudgetSettingsPage({
  baseBudget = 0,
  userSettings = null,
  onSaveUserSettings,
  categoryLimits = {},
  onSaveBudget,
  onSaveCategoryLimits,
  defaultCurrency = 'NZD',
}) {
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

  const handleRemoveCategory = (catName) => {
    setLimitsState((prev) => {
      const next = { ...prev };
      delete next[catName];
      return next;
    });
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
          Configure income sources, monthly budget, and per-category spending limits in {defaultCurrency}.
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

      {/* Card 1: Income & Budget Breakdown Form */}
      <form onSubmit={handleSaveIncomeAndBudget} className="p-6 sm:p-8 rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-xl space-y-6 shadow-2xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
          <Sliders className="text-purple-400 shrink-0" size={22} />
          <h3 className="text-xl font-bold text-slate-100">Income & Overall Budget</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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

        <AnimatePresence>
          {incomeSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm"
            >
              <CheckCircle2 size={20} className="shrink-0 text-teal-400" />
              <span className="text-sm font-semibold">{incomeSaveMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            type="submit"
            className="py-3 px-6 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all duration-300"
          >
            Update Income & Budget
          </button>
        </div>
      </form>

      {/* Card 2: Searchable Category Budget Limits Form */}
      <form onSubmit={handleSaveCategoryLimits} className="p-6 sm:p-8 rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-xl space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <PieChart className="text-teal-400 shrink-0" size={22} />
            <div>
              <h3 className="text-xl font-bold text-slate-100">Monthly Category Budget Limits</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Search and add categories to set monthly spending limits.
              </p>
            </div>
          </div>

          <span className="text-xs text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
            {activeCategories.length} Configured
          </span>
        </div>

        {/* Search & Add Category Input */}
        <div className="relative" ref={searchContainerRef}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Type to search category (e.g. Groceries, Food, Transport...)"
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-400/50 transition-colors"
              />
              {(searchQuery || isSearchOpen) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                  title="Close category search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown Suggestions */}
          {isSearchOpen && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-xl shadow-2xl z-30 max-h-56 overflow-y-auto custom-scrollbar space-y-1">
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                      <span className="text-sm font-semibold text-white">{cat}</span>
                    </div>
                    <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Plus size={14} /> Add Limit
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick-Add Chips for Unconfigured Categories */}
        {availableCategories.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Add Category:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleAddCategory(cat)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus size={12} className="text-purple-400" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Configured Category Limits List */}
        {activeCategories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeCategories.map((cat) => {
              const catColor = getCategoryColor(cat);
              return (
                <div
                  key={cat}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                      <span className="text-sm font-extrabold text-white">{cat}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                      title={`Remove limit for ${cat}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <CustomNumberInput
                    label={`Monthly Limit (${defaultCurrency})`}
                    value={limitsState[cat] ?? ''}
                    onChange={(e) => handleCategoryLimitChange(cat, e.target.value)}
                    placeholder="Enter limit amount"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
            <PieChart size={28} className="mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-slate-300">No category limits set yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Search above or click any category chip to configure target spending limits.
            </p>
          </div>
        )}

        <AnimatePresence>
          {limitsSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm"
            >
              <CheckCircle2 size={20} className="shrink-0 text-teal-400" />
              <span className="text-sm font-semibold">{limitsSaveMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            type="submit"
            className="py-3 px-6 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.35)] transition-all duration-300"
          >
            Save Category Limits
          </button>
        </div>
      </form>
    </motion.div>
  );
}
