import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, CheckCircle2, PieChart, Search, Plus, Trash2, X, Wallet, Save, AlertTriangle } from 'lucide-react';
import { formatCurrency, CATEGORIES, getCategoryColor } from '../utils/finance';
import { CustomNumberInput, CustomSelect } from '../components/ui/forms';
import { useConfirm } from '../context/ConfirmationContext';

const CURRENCY_OPTIONS = [
  { label: 'NZD ($)', value: 'NZD' },
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'CAD ($)', value: 'CAD' },
  { label: 'AUD ($)', value: 'AUD' },
  { label: 'VND (₫)', value: 'VND' },
];

const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100;

const parseNonNegativeNumber = (val) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
};

export default function BudgetSettingsPage({
  baseBudget = 0,
  userSettings = null,
  onSaveUserSettings,
  categoryLimits = {},
  onSaveCategoryLimits,
  defaultCurrency = 'NZD',
}) {
  const confirm = useConfirm();
  const [saveFailed, setSaveFailed] = useState(false);
  const [fixedBudget, setFixedBudget] = useState(userSettings?.fixed_budget ?? baseBudget ?? 0);
  const [salaryAllocation, setSalaryAllocation] = useState(userSettings?.salary_allocation ?? 0);
  const [partTimeHours, setPartTimeHours] = useState(userSettings?.part_time_hours ?? 0);
  const [partTimeRate, setPartTimeRate] = useState(userSettings?.part_time_rate ?? 0);
  const [currencySetting, setCurrencySetting] = useState(
    userSettings?.default_currency || defaultCurrency || 'NZD'
  );
  const [limitsState, setLimitsState] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const searchContainerRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Keyed on the values, not the object: a background refresh on app resume must not wipe unsaved edits.
  useEffect(() => {
    if (userSettings) {
      const hours = Number(userSettings.part_time_hours ?? 0);
      const rate = Number(userSettings.part_time_rate ?? 0);
      const salary = Number(userSettings.salary_allocation ?? 0);
      const fixed = Number(userSettings.fixed_budget ?? 0);
      const monthly = Number(userSettings.monthly_budget ?? 0);
      // A budget saved before income sources existed has no breakdown: keep it as the fixed base, or saving would zero it.
      setFixedBudget(fixed + salary + hours * rate === 0 && monthly > 0 ? monthly : fixed);
      setSalaryAllocation(salary);
      setPartTimeHours(hours);
      setPartTimeRate(rate);
      setCurrencySetting(userSettings.default_currency || defaultCurrency || 'NZD');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the values so a refresh does not wipe unsaved edits
  }, [
    userSettings?.fixed_budget,
    userSettings?.salary_allocation,
    userSettings?.part_time_hours,
    userSettings?.part_time_rate,
    userSettings?.monthly_budget,
    userSettings?.default_currency,
    defaultCurrency,
  ]);

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

  const categoryLimitsKey = JSON.stringify(categoryLimits);
  useEffect(() => {
    if (categoryLimits) {
      setLimitsState(categoryLimits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the values so a refresh does not wipe unsaved edits
  }, [categoryLimitsKey]);

  const activeCurrency = currencySetting || defaultCurrency || 'NZD';
  const safeFixed = Math.max(0, Number(fixedBudget) || 0);
  const safeSalary = Math.max(0, Number(salaryAllocation) || 0);
  const safeHours = Math.max(0, Number(partTimeHours) || 0);
  const safeRate = Math.max(0, Number(partTimeRate) || 0);
  const calculatedPartTimeWages = roundMoney(safeHours * safeRate);
  const computedTotalMonthlyBudget = roundMoney(safeFixed + safeSalary + calculatedPartTimeWages);

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
    if (val === '') {
      setLimitsState((prev) => ({ ...prev, [catName]: '' }));
      return;
    }
    const parsed = Number(val);
    if (Number.isNaN(parsed)) return;
    setLimitsState((prev) => ({
      ...prev,
      [catName]: parsed < 0 ? '0' : val,
    }));
  };

  const buildCleanedLimits = () => {
    const cleaned = {};
    Object.entries(limitsState).forEach(([cat, val]) => {
      const parsed = Number(val);
      if (val !== '' && Number.isFinite(parsed) && parsed > 0) {
        cleaned[cat] = roundMoney(parsed);
      }
    });
    return cleaned;
  };

  const getChangedUserSettings = () => {
    const changes = {};
    const origFixed = Number(userSettings?.fixed_budget ?? 0);
    const origSalary = Number(userSettings?.salary_allocation ?? 0);
    const origHours = Number(userSettings?.part_time_hours ?? 0);
    const origRate = Number(userSettings?.part_time_rate ?? 0);
    const origMonthly = Number(userSettings?.monthly_budget ?? 0);
    const origCurrency = userSettings?.default_currency || defaultCurrency || 'NZD';

    const curFixed = roundMoney(safeFixed);
    const curSalary = roundMoney(safeSalary);
    const curHours = Math.round(safeHours * 100) / 100;
    const curRate = roundMoney(safeRate);

    if (curFixed !== origFixed) changes.fixed_budget = curFixed;
    if (curSalary !== origSalary) changes.salary_allocation = curSalary;
    if (curHours !== origHours) changes.part_time_hours = curHours;
    if (curRate !== origRate) changes.part_time_rate = curRate;
    if (activeCurrency !== origCurrency) changes.default_currency = activeCurrency;

    if (Object.keys(changes).length > 0 || computedTotalMonthlyBudget !== roundMoney(origMonthly)) {
      changes.monthly_budget = computedTotalMonthlyBudget;
    }

    return changes;
  };

  const hasUnsavedChanges = useMemo(() => {
    if (Object.keys(getChangedUserSettings()).length > 0) return true;
    const cleaned = buildCleanedLimits();
    const origCleaned = {};
    Object.entries(categoryLimits || {}).forEach(([cat, val]) => {
      const parsed = Number(val);
      if (val !== '' && Number.isFinite(parsed) && parsed > 0) {
        origCleaned[cat] = roundMoney(parsed);
      }
    });
    const keysA = Object.keys(cleaned);
    const keysB = Object.keys(origCleaned);
    if (keysA.length !== keysB.length) return true;
    return keysA.some((k) => cleaned[k] !== origCleaned[k]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracks current form & category limits state
  }, [fixedBudget, salaryAllocation, partTimeHours, partTimeRate, currencySetting, limitsState, userSettings, categoryLimitsKey, defaultCurrency]);

  const showToast = (message, failed = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSaveFailed(failed);
    setSaveMessage(message);
    setSaveSuccess(true);
    if (!failed) {
      toastTimerRef.current = setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const validFixed = parseNonNegativeNumber(fixedBudget);
    const validSalary = parseNonNegativeNumber(salaryAllocation);
    const validHours = parseNonNegativeNumber(partTimeHours);
    const validRate = parseNonNegativeNumber(partTimeRate);
    if (validFixed === null || validSalary === null || validHours === null || validRate === null) {
      showToast('Income amounts and part-time hours must be 0 or greater.', true);
      return;
    }

    const invalidLimitEntry = Object.entries(limitsState).find(([, val]) => {
      if (val === '' || val === null || val === undefined) return false;
      return parseNonNegativeNumber(val) === null;
    });
    if (invalidLimitEntry) {
      showToast(`Category limit for "${invalidLimitEntry[0]}" must be 0 or greater.`, true);
      return;
    }

    setIsSaving(true);
    try {
      const changedFields = getChangedUserSettings();
      const hasIncomeChanges = Object.keys(changedFields).length > 0;
      const cleanedLimits = buildCleanedLimits();

      if (onSaveCategoryLimits && (await onSaveCategoryLimits(cleanedLimits)) === false) {
        throw new Error('Category limits could not be saved.');
      }

      if (hasIncomeChanges && onSaveUserSettings) {
        const result = await onSaveUserSettings({
          ...changedFields,
          category_limits: cleanedLimits,
        });
        if (result === false || result?.error) {
          throw result?.error || new Error('Budget settings could not be saved.');
        }
      }

      setLimitsState(cleanedLimits);
      showToast('All budget settings and category limits saved successfully!', false);
    } catch (err) {
      showToast('Error saving settings: ' + (err?.message || String(err)), true);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCategoryLimits = roundMoney(
    activeCategories.reduce((sum, cat) => {
      const val = Number(limitsState[cat]);
      return sum + (Number.isFinite(val) && val > 0 ? val : 0);
    }, 0)
  );
  const hasBudget = computedTotalMonthlyBudget > 0;
  const rawAllocationPercent = hasBudget
    ? (totalCategoryLimits / computedTotalMonthlyBudget) * 100
    : totalCategoryLimits > 0
      ? 101
      : 0;
  const allocationPercent = Math.round(rawAllocationPercent);
  const unallocatedAmount = roundMoney(computedTotalMonthlyBudget - totalCategoryLimits);
  const remainingPercent = hasBudget ? Math.max(0, 100 - allocationPercent) : 0;
  const allocationBarWidth = hasBudget
    ? Math.min(Math.max(rawAllocationPercent, 0), 100)
    : totalCategoryLimits > 0
      ? 100
      : 0;
  const isOverAllocated = unallocatedAmount < 0;

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500 pb-8 sm:pb-16">
      {/* Top Header Row with Title & Quick Save All Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">Budget Settings</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure recurring income streams, base currency, and category spending ceilings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto w-full sm:w-auto">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full shrink-0">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-initial min-h-[44px] py-2.5 px-4 sm:px-5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Save Notification Toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            role={saveFailed ? 'alert' : 'status'}
            className={`flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl ${saveFailed ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-teal-500/15 text-teal-300 border-teal-500/30'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {saveFailed ? (
                <AlertTriangle size={20} className="shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 size={20} className="shrink-0 text-teal-400" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{saveMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccess(false)}
              aria-label="Dismiss notification"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-white/10 shrink-0 cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Spending Power Calculator & Cockpit Card */}
      <div className="p-4 sm:p-7 relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 backdrop-blur-xl shadow-2xl transition-all">
        <div className="hidden sm:block absolute top-0 right-0 w-72 h-72 bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Monthly Spending Power
              </span>
              <div className="flex items-baseline flex-wrap gap-x-2">
                <h3 className="text-2xl sm:text-4xl font-black text-slate-100 tabular-nums">
                  {formatCurrency(computedTotalMonthlyBudget, activeCurrency)}
                </h3>
                <span className="text-xs sm:text-sm text-teal-400 font-semibold">/ month</span>
              </div>
            </div>
          </div>

          <span className="self-start sm:self-auto text-[11px] sm:text-xs text-purple-300 font-semibold bg-purple-500/15 border border-purple-500/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
            Calculated Live
          </span>
        </div>

        {/* Dynamic Formula Breakdown Pills — compact 2-up on mobile, 3 columns on >= sm */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
          {/* Source 1: Fixed Base */}
          <div className="bg-slate-900/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-purple-500/20 flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">1. Fixed Base</span>
            <span className="text-sm sm:text-lg font-black text-purple-300 tabular-nums mt-0.5 truncate">
              {formatCurrency(safeFixed, activeCurrency)}
            </span>
          </div>

          {/* Source 2: Salary Allocation */}
          <div className="bg-slate-900/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-500/20 flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">2. Salary</span>
            <span className="text-sm sm:text-lg font-black text-amber-300 tabular-nums mt-0.5 truncate">
              {formatCurrency(safeSalary, activeCurrency)}
            </span>
          </div>

          {/* Source 3: Part-Time Wages */}
          <div className="col-span-2 sm:col-span-1 bg-slate-900/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-teal-500/20 flex sm:flex-col items-center sm:items-stretch justify-between gap-2 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] text-slate-400 min-w-0">
              <span>3. Part-Time Wages</span>
              <span className="text-[10px] text-slate-400 truncate">{safeHours}h @ {formatCurrency(safeRate, activeCurrency)}</span>
            </div>
            <span className="text-sm sm:text-lg font-black text-teal-300 tabular-nums sm:mt-0.5 shrink-0">
              {formatCurrency(calculatedPartTimeWages, activeCurrency)}
            </span>
          </div>
        </div>
      </div>

      {/* Card 1: Income Stream & Currency Inputs Form */}
      <form onSubmit={handleSaveAll} noValidate className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl space-y-4 sm:space-y-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-purple-400 shrink-0" size={20} />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">Income Streams & Currency</h3>
              <p className="text-xs text-slate-400">Edit the recurring components that form your base monthly budget.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <CustomNumberInput
            currency={activeCurrency}
            label={`Fixed Base Budget (${activeCurrency})`}
            min={0}
            step="0.01"
            value={fixedBudget}
            onChange={(e) => setFixedBudget(e.target.value)}
            placeholder="0.00"
          />

          <CustomNumberInput
            currency={activeCurrency}
            label={`Full-Time Salary Allocation (${activeCurrency})`}
            min={0}
            step="0.01"
            value={salaryAllocation}
            onChange={(e) => setSalaryAllocation(e.target.value)}
            placeholder="0.00"
          />

          <CustomNumberInput
            label="Part-Time Hours / Month"
            prefix=""
            min={0}
            step={0.5}
            value={partTimeHours}
            onChange={(e) => setPartTimeHours(e.target.value)}
            placeholder="0"
          />

          <CustomNumberInput
            currency={activeCurrency}
            label={`Part-Time Hourly Rate (${activeCurrency}/hr)`}
            min={0}
            step="0.01"
            value={partTimeRate}
            onChange={(e) => setPartTimeRate(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="pt-1 sm:max-w-xs">
          <CustomSelect
            label="Base Display Currency"
            options={CURRENCY_OPTIONS}
            value={activeCurrency}
            onChange={setCurrencySetting}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Used across all dashboards; multi-currency subscriptions convert into this currency.
          </p>
        </div>
      </form>

      {/* Card 2: Category Budget Limits Planner */}
      <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl space-y-4 sm:space-y-5 shadow-xl">
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
              Category Limits: <strong className="text-white tabular-nums">{formatCurrency(totalCategoryLimits, activeCurrency)}</strong>
              <span className="text-slate-400 font-normal"> of {formatCurrency(computedTotalMonthlyBudget, activeCurrency)} budget</span>
            </span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${
              !hasBudget && totalCategoryLimits === 0
                ? 'bg-slate-800/80 text-slate-300 border-white/15'
                : !isOverAllocated
                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              {!hasBudget && totalCategoryLimits === 0
                ? 'Set monthly budget above'
                : !isOverAllocated
                  ? `${formatCurrency(unallocatedAmount, activeCurrency)} Unallocated (${remainingPercent}%)`
                  : `Over-allocated by ${formatCurrency(Math.abs(unallocatedAmount), activeCurrency)}!`}
            </span>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverAllocated
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-purple-400 to-teal-400'
              }`}
              style={{ width: `${allocationBarWidth}%` }}
            />
          </div>
        </div>

        {/* Search & Add Category Input */}
        <div className="relative" ref={searchContainerRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Search category to add limit"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsSearchOpen(false);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder="Search category to add limit (e.g. Groceries, Dining)..."
              className="w-full min-h-[44px] pl-9 pr-11 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:border-purple-400/50 transition-colors"
            />
            {(searchQuery || isSearchOpen) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                aria-label="Close category search"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close category search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dropdown Suggestions */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-xl shadow-2xl z-30 max-h-56 overflow-y-auto custom-scrollbar space-y-1 overscroll-contain">
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Matching Categories</span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-slate-300 hover:text-white text-[11px] normal-case underline py-1 px-2 cursor-pointer"
                >
                  Close
                </button>
              </div>
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((cat) => {
                  const catColor = getCategoryColor(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleAddCategory(cat)}
                      className="w-full min-h-[44px] flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/10 text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">{cat}</span>
                      </div>
                      <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                        <Plus size={13} /> Add Limit
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-2.5 py-3 text-xs text-slate-400 text-center">
                  {availableCategories.length === 0
                    ? 'All categories already have rows configured.'
                    : 'No matching categories found.'}
                </p>
              )}
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
                  className="min-h-[40px] sm:min-h-[32px] px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
              const rawLimit = Number(limitsState[cat]);
              const limitVal = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 0;
              const percentOfTotal = hasBudget ? Math.round((limitVal / computedTotalMonthlyBudget) * 100) : null;

              return (
                <div
                  key={cat}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2 hover:border-white/20 transition-all"
                >
                  {/* Category Header Row with Share badge & Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                      <span className="text-xs sm:text-sm font-bold text-white truncate">{cat}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                        {percentOfTotal !== null ? `${percentOfTotal}%` : '—'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="min-w-[44px] min-h-[44px] -mr-2 -my-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title={`Remove limit for ${cat}`}
                      aria-label={`Remove limit for ${cat}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Inline Limit Input */}
                  <div>
                    <CustomNumberInput
                      currency={activeCurrency}
                      label={`Monthly Limit (${activeCurrency})`}
                      min={0}
                      step="0.01"
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
                        width: `${percentOfTotal !== null ? Math.min(100, Math.max(0, percentOfTotal)) : 0}%`,
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
        <div className="flex items-center justify-between sm:justify-end pt-3 gap-3 flex-wrap">
          {hasUnsavedChanges && (
            <span className="text-xs font-semibold text-amber-300 sm:mr-auto">
              You have unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] py-2.5 px-6 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
