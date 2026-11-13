import { useState } from 'react';
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import useModalDialog from '../hooks/useModalDialog';
import { Target, Plus, CheckCircle2, PiggyBank, Trash2, X } from 'lucide-react';
import {
  formatCurrency as baseFormatCurrency,
  getCurrencySymbol,
  getGoalProgress,
  getGoalsTotals,
} from '../utils/finance';
import EmptyState from '../components/shell/EmptyState';
import { CustomInput, CustomNumberInput, CustomSelect, CustomDatePicker } from '../components/ui/forms';
import { useConfirm } from '../context/ConfirmationContext';

const INITIAL_GOALS = [
  { id: 'starter-1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: 'starter-2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: 'starter-3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export default function SavingsGoalsPage({
  goals: propGoals,
  onAddGoal,
  onDeleteGoal,
  onAddDeposit,
  onAllocateCarryOver,
  previousCarryOver = 0,
  defaultCurrency = 'NZD',
}) {
  const confirm = useConfirm();
  const resolvedCurrency = defaultCurrency || 'NZD';
  const formatCurrency = (amount, cur = resolvedCurrency) => baseFormatCurrency(amount, cur);
  const currencySymbol = getCurrencySymbol(resolvedCurrency);
  const [localGoals, setLocalGoals] = useState(INITIAL_GOALS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quickDepositError, setQuickDepositError] = useState('');
  const [addGoalError, setAddGoalError] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Add Deposit custom modal state (track ID so modal reads live goal updates)
  const [depositGoalId, setDepositGoalId] = useState(null);
  const [depositAmountInput, setDepositAmountInput] = useState('100');
  const [depositError, setDepositError] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [quickDepositingId, setQuickDepositingId] = useState(null);

  // Carry-over custom allocation state
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [targetGoalId, setTargetGoalId] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateError, setAllocateError] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    priority: 'medium',
    deadline_date: '',
  });

  const goals = propGoals || localGoals;
  const goalForDeposit =
    depositGoalId !== null && depositGoalId !== undefined
      ? goals.find((g) => String(g.id) === String(depositGoalId)) || null
      : null;

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddGoalError('');
  };
  const closeDepositModal = () => {
    setDepositGoalId(null);
    setDepositAmountInput('');
    setDepositError('');
  };
  const closeAllocateModal = () => {
    setShowAllocateModal(false);
    setAllocateAmount('');
    setAllocateError('');
  };
  const addGoalDialogRef = useModalDialog(showAddModal, closeAddModal);
  const depositDialogRef = useModalDialog(Boolean(goalForDeposit), closeDepositModal);
  const allocateDialogRef = useModalDialog(showAllocateModal, closeAllocateModal);

  const normalizedPreviousCarryOver = roundMoney(Math.max(0, Number(previousCarryOver) || 0));
  const remainingCarryOver = normalizedPreviousCarryOver;

  const priorityOptions = [
    { label: 'Low Priority', value: 'low' },
    { label: 'Medium Priority', value: 'medium' },
    { label: 'High Priority', value: 'high' },
  ];

  const goalOptions = goals.map((g) => {
    const { rawValue } = getGoalProgress(g);
    const percent = Math.max(0, Math.round(rawValue));
    return {
      label: `${g.name} (${percent}%)`,
      value: g.id,
    };
  });

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (isAddingGoal) return;

    const trimmedName = newGoal.name.trim();
    if (!trimmedName) {
      setAddGoalError('Please enter a goal name.');
      return;
    }

    const parsedTarget = Number(newGoal.target_amount);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setAddGoalError('Please enter a target amount greater than 0.');
      return;
    }

    const parsedCurrent = newGoal.current_amount === '' ? 0 : Number(newGoal.current_amount);
    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      setAddGoalError('Initial savings must be 0 or greater.');
      return;
    }

    const goalData = {
      name: trimmedName,
      target_amount: roundMoney(parsedTarget),
      current_amount: roundMoney(parsedCurrent),
      priority: newGoal.priority,
      deadline_date: newGoal.deadline_date || null,
    };

    if (onAddGoal) {
      setAddGoalError('');
      setIsAddingGoal(true);
      try {
        const created = await onAddGoal(goalData);
        if (!created || created?.error) {
          setAddGoalError(created?.error?.message || 'Could not save this goal. Please try again.');
          return;
        }
      } catch (err) {
        setAddGoalError(err?.message || 'Could not save this goal. Please try again.');
        return;
      } finally {
        setIsAddingGoal(false);
      }
    } else {
      setLocalGoals((prev) => [
        { id: String(Date.now()), ...goalData },
        ...prev,
      ]);
    }

    setNewGoal({ name: '', target_amount: '', current_amount: '', priority: 'medium', deadline_date: '' });
    setAddGoalError('');
    setShowAddModal(false);
  };

  const handleDeleteGoal = async (goal) => {
    if (!goal) return;
    const isConfirmed = await confirm({
      title: 'Delete Savings Goal',
      message: `Are you sure you want to delete "${goal.name}" with target amount of ${formatCurrency(goal.target_amount)}?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete Goal',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (isConfirmed) {
      if (onDeleteGoal) {
        try {
          setQuickDepositError('');
          const result = await onDeleteGoal(goal.id);
          if (result === false || result?.error) {
            setQuickDepositError(result?.error?.message || 'Could not delete this goal. Please try again.');
          }
        } catch (err) {
          setQuickDepositError(err?.message || 'Could not delete this goal. Please try again.');
        }
      } else {
        setLocalGoals((prev) => prev.filter((g) => String(g.id) !== String(goal.id)));
      }
    }
  };

  const handleOpenDepositModal = (goal) => {
    setDepositGoalId(goal.id);
    setDepositAmountInput('100');
    setDepositError('');
  };

  const handleConfirmDeposit = async (e) => {
    e.preventDefault();
    if (isDepositing || !goalForDeposit) return;

    const cleanAmount = roundMoney(Number(depositAmountInput));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setDepositError('Please enter a valid deposit amount greater than 0.');
      return;
    }

    if (onAddDeposit) {
      setDepositError('');
      setIsDepositing(true);
      try {
        const result = await onAddDeposit(goalForDeposit.id, cleanAmount);
        if (result === false || result?.error) {
          setDepositError(result?.error?.message || 'Could not save this deposit. Please try again.');
          return;
        }
      } catch (err) {
        setDepositError(err?.message || 'Could not save this deposit. Please try again.');
        return;
      } finally {
        setIsDepositing(false);
      }
    } else {
      setLocalGoals((prev) =>
        prev.map((g) =>
          String(g.id) === String(goalForDeposit.id)
            ? { ...g, current_amount: roundMoney(Number(g.current_amount || 0) + cleanAmount) }
            : g
        )
      );
    }

    closeDepositModal();
  };

  const handleOpenAllocateModal = () => {
    if (remainingCarryOver <= 0 || goals.length === 0) return;
    const initialGoalId = goals[0]?.id ?? '';
    setTargetGoalId(initialGoalId);

    const selected = goals.find((g) => String(g.id) === String(initialGoalId));
    const needed = selected
      ? Math.max(0, roundMoney(Number(selected.target_amount || 0) - Number(selected.current_amount || 0)))
      : remainingCarryOver;
    const suggested = roundMoney(Math.min(remainingCarryOver, needed > 0 ? needed : remainingCarryOver));

    setAllocateAmount(String(suggested));
    setAllocateError('');
    setShowAllocateModal(true);
  };

  const handleConfirmAllocation = async (e) => {
    e.preventDefault();
    if (isAllocating) return;

    const cleanAmount = roundMoney(Number(allocateAmount));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      setAllocateError('Please enter a valid allocation amount greater than 0.');
      return;
    }

    if (cleanAmount > remainingCarryOver) {
      setAllocateError(`Amount exceeds available carry-over balance of ${formatCurrency(remainingCarryOver)}.`);
      return;
    }

    if (targetGoalId === '' || targetGoalId === null || targetGoalId === undefined) {
      setAllocateError('Please select a target savings goal.');
      return;
    }

    if (onAllocateCarryOver) {
      setAllocateError('');
      setIsAllocating(true);
      try {
        const result = await onAllocateCarryOver(targetGoalId, cleanAmount);
        if (result === false || result?.error) {
          setAllocateError(result?.error?.message || 'Could not allocate this amount. Please try again.');
          return;
        }
      } catch (err) {
        setAllocateError(err?.message || 'Could not allocate this amount. Please try again.');
        return;
      } finally {
        setIsAllocating(false);
      }
    } else {
      setLocalGoals((prev) =>
        prev.map((g) =>
          String(g.id) === String(targetGoalId)
            ? { ...g, current_amount: roundMoney(Number(g.current_amount || 0) + cleanAmount) }
            : g
        )
      );
    }

    closeAllocateModal();
  };

  const { saved: totalSavings, target: totalTarget, remaining: totalRemaining, percent: fundedPercent } = getGoalsTotals(goals);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
      case 'low':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      default:
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 220 } },
  };

  const handleDirectDeposit = async (goalId, amount) => {
    if (quickDepositingId !== null) return;
    const cleanAmount = roundMoney(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) return;

    if (onAddDeposit) {
      setQuickDepositingId(goalId);
      try {
        setQuickDepositError('');
        const result = await onAddDeposit(goalId, cleanAmount);
        if (result === false || result?.error) {
          setQuickDepositError(result?.error?.message || 'Could not save this deposit. Please try again.');
        }
      } catch (err) {
        setQuickDepositError(err?.message || 'Could not save this deposit. Please try again.');
      } finally {
        setQuickDepositingId(null);
      }
    } else {
      setLocalGoals((prev) =>
        prev.map((g) =>
          String(g.id) === String(goalId)
            ? { ...g, current_amount: roundMoney(Number(g.current_amount || 0) + cleanAmount) }
            : g
        )
      );
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
      {/* Header Savings Cockpit: Total Savings + Carry-Over Banner */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-12 items-stretch">
        {/* Total Goal Savings Card (Span 7 on desktop) */}
        <div className="md:col-span-7 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-900/90 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between shadow-xl space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
                <PiggyBank size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Goal Savings</p>
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                  <h2 className="text-xl sm:text-3xl font-black text-slate-100 tracking-tight tabular-nums">{formatCurrency(totalSavings)}</h2>
                  {totalTarget > 0 && (
                    <span className="text-xs text-slate-400 font-medium">of {formatCurrency(totalTarget)} target</span>
                  )}
                </div>
              </div>
            </div>
            {totalTarget > 0 && (
              <span className="text-[11px] sm:text-xs font-extrabold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-full shrink-0">
                {fundedPercent}% Funded
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Remaining to save: <strong className="text-slate-200 font-bold">{formatCurrency(totalRemaining)}</strong>
              </span>
              <span className="text-slate-400 font-semibold">
                {fundedPercent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, fundedPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Carry-Over Allocation Action Card (Span 5 on desktop) */}
        <div className="md:col-span-5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-br from-teal-950/30 via-slate-900/80 to-slate-900/90 backdrop-blur-xl flex flex-col justify-between shadow-xl relative overflow-hidden space-y-3">
          <div className="absolute bottom-0 right-0 w-28 h-28 bg-teal-500/15 blur-3xl rounded-full pointer-events-none" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Target size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">Carry-Over Funds</h3>
                <p className="text-[11px] text-slate-400 truncate">Unused monthly budget</p>
              </div>
            </div>
            {normalizedPreviousCarryOver > 0 && (
              <span className="text-[11px] font-extrabold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 rounded-full shrink-0">
                {formatCurrency(remainingCarryOver)} Available
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {remainingCarryOver > 0
              ? `You have ${formatCurrency(remainingCarryOver)} of unused budget ready to boost your goals!`
              : normalizedPreviousCarryOver > 0
              ? `All ${formatCurrency(normalizedPreviousCarryOver)} carry-over funds successfully allocated.`
              : 'No positive carry-over balance available from the previous cycle.'}
          </p>

          <div>
            {remainingCarryOver > 0 && goals.length > 0 ? (
              <button
                type="button"
                onClick={handleOpenAllocateModal}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Target size={14} />
                <span>Allocate {formatCurrency(remainingCarryOver)} Funds</span>
              </button>
            ) : normalizedPreviousCarryOver > 0 && remainingCarryOver <= 0 ? (
              <div className="flex items-center gap-1.5 text-teal-400 text-xs font-semibold">
                <CheckCircle2 size={15} />
                <span>Carry-over fully allocated!</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">No carry-over to distribute.</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-100">Savings Goals</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            {goals.length} active goal{goals.length === 1 ? '' : 's'} • Track deadlines & milestone pace
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddGoalError('');
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 min-h-[44px] py-2.5 px-4 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)] transition-all text-xs sm:text-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </div>

      {quickDepositError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs sm:text-sm"
        >
          <span>{quickDepositError}</span>
          <button
            type="button"
            onClick={() => setQuickDepositError('')}
            aria-label="Dismiss error"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white/10 text-rose-200 shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Goals Display: Mobile Row View (< sm) vs Desktop Rich Cards (>= sm) */}
      {goals.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3 sm:space-y-0 sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {goals.map((goal) => {
            const current = Number(goal.current_amount) || 0;
            const target = Number(goal.target_amount) || 0;
            const { rawValue, clampedRenderPercent } = getGoalProgress(goal);
            const displayPercent = Math.max(0, Math.round(rawValue));
            const remaining = target > 0 ? Math.max(0, roundMoney(target - current)) : 0;
            const surplus = target > 0 && current > target ? roundMoney(current - target) : 0;
            const isCompleted = target > 0 && remaining === 0;

            // Calculate required monthly contribution pace & remaining time
            let paceText = null;
            let timeRemainingText = null;
            const parsedDeadline = goal.deadline_date ? parseISO(goal.deadline_date) : null;
            const hasValidDeadline = Boolean(parsedDeadline && isValid(parsedDeadline));
            if (hasValidDeadline) {
              const today = new Date();
              const isOverdue = differenceInCalendarDays(parsedDeadline, today) < 0;
              const calendarMonths =
                (parsedDeadline.getFullYear() - today.getFullYear()) * 12 + (parsedDeadline.getMonth() - today.getMonth());
              const diffMonths = Math.max(1, calendarMonths);
              const monthlyNeeded = remaining > 0 ? Math.max(0.01, Math.ceil((remaining / diffMonths) * 100) / 100) : 0;
              timeRemainingText = isOverdue
                ? 'Deadline passed'
                : calendarMonths < 1
                  ? 'Due this month'
                  : `${diffMonths} mo${diffMonths === 1 ? '' : 's'} left`;
              paceText = isCompleted
                ? surplus > 0
                  ? `Funded +${formatCurrency(surplus)} over target`
                  : 'Goal completed! 🎉'
                : isOverdue
                  ? `Deadline passed • ${formatCurrency(remaining)} short`
                  : target > 0
                    ? `Save ~${formatCurrency(monthlyNeeded)}/mo`
                    : null;
            }

            return (
              <motion.div
                key={goal.id}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl flex flex-col justify-between relative group hover:border-purple-400/40 transition-all shadow-md hover:shadow-xl"
              >
                {/* 1. Mobile-First Compact Row View (< sm) */}
                <div className="sm:hidden space-y-2.5">
                  {/* Title, Priority & Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(goal.priority)} shrink-0`}>
                        {goal.priority}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 truncate">{goal.name}</h4>
                    </div>
                    <div className="flex items-center shrink-0 -mr-2 -my-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete goal"
                        aria-label={`Delete ${goal.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Figures & Progress */}
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-base font-black text-slate-100 tabular-nums">{formatCurrency(current)}</span>
                      {target > 0 && (
                        <span className="text-slate-400 text-[11px] ml-1">/ {formatCurrency(target)}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold ${isCompleted ? 'text-teal-300' : 'text-purple-300'}`}>
                        {target <= 0
                          ? 'No target'
                          : surplus > 0
                            ? `+${formatCurrency(surplus)} extra`
                            : isCompleted
                              ? 'Complete!'
                              : `${formatCurrency(remaining)} left`}
                      </span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${clampedRenderPercent}%` }}
                    />
                  </div>

                  {/* Action & Pace Footer */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-400">
                    <span className="text-teal-300 font-medium truncate">
                      {paceText || (target > 0 ? `${displayPercent}% saved` : 'Open goal')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDepositModal(goal)}
                      className="min-h-[44px] px-3.5 py-2 -mr-1 rounded-xl font-semibold bg-white/10 hover:bg-white/15 text-slate-200 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus size={13} /> Deposit
                    </button>
                  </div>
                </div>

                {/* 2. Desktop Spacious Milestone Card (>= sm) */}
                <div className="hidden sm:flex flex-col justify-between h-full space-y-4">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-bold text-slate-100 truncate">{goal.name}</h4>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(goal.priority)}`}>
                            {goal.priority}
                          </span>
                        </div>
                        {hasValidDeadline && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Target: {parsedDeadline.toLocaleDateString()} {timeRemainingText ? `• ${timeRemainingText}` : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer opacity-70 group-hover:opacity-100 shrink-0"
                        title="Delete savings goal"
                        aria-label={`Delete ${goal.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Prominent Numbers & Remaining */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-baseline gap-2">
                        <div className="min-w-0">
                          <span className="text-2xl font-black text-slate-100 tabular-nums">{formatCurrency(current)}</span>
                          {target > 0 && (
                            <span className="text-xs font-semibold text-slate-400 ml-1">/ {formatCurrency(target)}</span>
                          )}
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${isCompleted ? 'text-teal-300' : 'text-purple-300'}`}>
                          {target <= 0
                            ? 'No target'
                            : surplus > 0
                              ? `+${formatCurrency(surplus)} over`
                              : isCompleted
                                ? '🎉 Complete'
                                : `${formatCurrency(remaining)} to go`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all duration-700"
                          style={{ width: `${clampedRenderPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                        <span className="text-[11px] text-teal-300 font-medium">{paceText || ''}</span>
                        <span className="font-bold text-slate-200">{target > 0 ? `${displayPercent}%` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Quick Deposit Action Bar */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={quickDepositingId !== null}
                        onClick={() => handleDirectDeposit(goal.id, 50)}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-purple-500/20 disabled:opacity-50 text-slate-300 hover:text-purple-200 border border-white/10 hover:border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                        title={`Add ${currencySymbol}50 deposit`}
                      >
                        +{currencySymbol}50
                      </button>
                      <button
                        type="button"
                        disabled={quickDepositingId !== null}
                        onClick={() => handleDirectDeposit(goal.id, 100)}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-purple-500/20 disabled:opacity-50 text-slate-300 hover:text-purple-200 border border-white/10 hover:border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                        title={`Add ${currencySymbol}100 deposit`}
                      >
                        +{currencySymbol}100
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDepositModal(goal)}
                      className="py-1.5 px-3 rounded-lg font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Custom Deposit
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="glass-card">
          <EmptyState
            title="No savings goals created"
            description="Create your first savings goal to track milestones and allocate carry-over funds."
            action={
              <button
                type="button"
                onClick={() => {
                  setAddGoalError('');
                  setShowAddModal(true);
                }}
                className="min-h-[44px] py-2.5 px-5 rounded-xl font-semibold bg-purple-600 text-white text-sm cursor-pointer"
              >
                Create First Goal
              </button>
            }
          />
        </div>
      )}

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={closeAddModal}
            />
            <motion.div
              ref={addGoalDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-goal-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="outline-none relative z-10 p-5 sm:p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 id="add-goal-modal-title" className="text-xl sm:text-2xl font-bold text-slate-100">Add New Savings Goal</h3>
                <button
                  type="button"
                  onClick={closeAddModal}
                  aria-label="Close modal"
                  className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddGoal} noValidate className="space-y-4">
                {addGoalError && (
                  <p role="alert" className="text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
                    {addGoalError}
                  </p>
                )}
                <CustomInput
                  label="Goal Name"
                  placeholder="e.g. Emergency Reserve, New Car"
                  value={newGoal.name}
                  onChange={(e) => {
                    setNewGoal({ ...newGoal, name: e.target.value });
                    if (addGoalError) setAddGoalError('');
                  }}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomNumberInput
                    currency={resolvedCurrency}
                    label="Target Amount"
                    placeholder="1000"
                    min={0.01}
                    step="0.01"
                    value={newGoal.target_amount}
                    onChange={(e) => {
                      setNewGoal({ ...newGoal, target_amount: e.target.value });
                      if (addGoalError) setAddGoalError('');
                    }}
                    required
                  />
                  <CustomNumberInput
                    currency={resolvedCurrency}
                    label="Initial Savings"
                    placeholder="0"
                    min={0}
                    step="0.01"
                    value={newGoal.current_amount}
                    onChange={(e) => {
                      setNewGoal({ ...newGoal, current_amount: e.target.value });
                      if (addGoalError) setAddGoalError('');
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    label="Priority"
                    options={priorityOptions}
                    value={newGoal.priority}
                    onChange={(val) => setNewGoal({ ...newGoal, priority: val })}
                  />
                  <CustomDatePicker
                    label="Deadline"
                    value={newGoal.deadline_date}
                    onChange={(val) => setNewGoal({ ...newGoal, deadline_date: val })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddModal}
                    disabled={isAddingGoal}
                    className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingGoal}
                    className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm cursor-pointer disabled:opacity-50"
                  >
                    {isAddingGoal ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Deposit Modal */}
      <AnimatePresence>
        {goalForDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={closeDepositModal}
            />
            <motion.div
              ref={depositDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-deposit-modal-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="outline-none relative z-10 p-5 sm:p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 text-purple-400 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <PiggyBank size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 id="add-deposit-modal-title" className="text-xl font-bold text-slate-100">Add Deposit</h3>
                    <p className="text-xs text-slate-400 truncate">
                      Target goal: <span className="font-semibold text-slate-200">{goalForDeposit.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDepositModal}
                  aria-label="Close modal"
                  className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress Summary Card inside modal */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex justify-between items-baseline text-xs gap-2">
                  <span className="text-slate-400 font-medium">Current Funding</span>
                  <span className="text-slate-200 font-bold tabular-nums">
                    {formatCurrency(goalForDeposit.current_amount)} / {formatCurrency(goalForDeposit.target_amount)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                    style={{
                      width: `${getGoalProgress(goalForDeposit).clampedRenderPercent}%`,
                    }}
                  />
                </div>
              </div>

              {depositError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {depositError}
                </div>
              )}

              <form onSubmit={handleConfirmDeposit} noValidate className="space-y-4">
                <CustomNumberInput
                  currency={resolvedCurrency}
                  label={`Deposit Amount (${resolvedCurrency})`}
                  placeholder="100"
                  min={0.01}
                  step="0.01"
                  value={depositAmountInput}
                  onChange={(e) => {
                    setDepositAmountInput(e.target.value);
                    if (depositError) setDepositError('');
                  }}
                  required
                />

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDepositAmountInput(String(preset));
                        if (depositError) setDepositError('');
                      }}
                      className="min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    >
                      +{currencySymbol}{preset}
                    </button>
                  ))}
                  {Number(goalForDeposit.target_amount) > Number(goalForDeposit.current_amount) && (() => {
                    const fillNeeded = roundMoney(Math.max(0, Number(goalForDeposit.target_amount) - Number(goalForDeposit.current_amount)));
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setDepositAmountInput(String(fillNeeded));
                          if (depositError) setDepositError('');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                      >
                        Fill Goal ({formatCurrency(fillNeeded)})
                      </button>
                    );
                  })()}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDepositModal}
                    disabled={isDepositing}
                    className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDepositing}
                    className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm cursor-pointer disabled:opacity-50"
                  >
                    {isDepositing ? 'Saving...' : 'Confirm Deposit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Allocate Carry-Over Modal */}
      <AnimatePresence>
        {showAllocateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={closeAllocateModal}
            />
            <motion.div
              ref={allocateDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="allocate-carry-over-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="outline-none relative z-10 p-5 sm:p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 text-teal-400 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <Target size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 id="allocate-carry-over-title" className="text-xl font-bold text-slate-100">Allocate Carry-Over</h3>
                    <p className="text-xs text-slate-400 truncate">Distribute unused monthly balance</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAllocateModal}
                  aria-label="Close modal"
                  className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Available Balance:</span>
                <span className="text-teal-300 font-extrabold text-base tabular-nums">{formatCurrency(remainingCarryOver)}</span>
              </div>

              {allocateError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {allocateError}
                </div>
              )}

              <form onSubmit={handleConfirmAllocation} noValidate className="space-y-4">
                <CustomSelect
                  label="Select Goal"
                  options={goalOptions}
                  value={targetGoalId}
                  onChange={(val) => {
                    setTargetGoalId(val);
                    const selected = goals.find((g) => String(g.id) === String(val));
                    const needed = selected
                      ? Math.max(0, roundMoney(Number(selected.target_amount || 0) - Number(selected.current_amount || 0)))
                      : remainingCarryOver;
                    setAllocateAmount(String(roundMoney(Math.min(remainingCarryOver, needed > 0 ? needed : remainingCarryOver))));
                    if (allocateError) setAllocateError('');
                  }}
                />

                <CustomNumberInput
                  currency={resolvedCurrency}
                  label={`Allocation Amount (${resolvedCurrency})`}
                  placeholder="Enter amount"
                  min={0.01}
                  step="0.01"
                  value={allocateAmount}
                  onChange={(e) => {
                    setAllocateAmount(e.target.value);
                    if (allocateError) setAllocateError('');
                  }}
                  required
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {[50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={remainingCarryOver < preset}
                      onClick={() => {
                        setAllocateAmount(String(roundMoney(Math.min(remainingCarryOver, preset))));
                        if (allocateError) setAllocateError('');
                      }}
                      className="min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    >
                      +{currencySymbol}{preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAllocateAmount(String(remainingCarryOver));
                      if (allocateError) setAllocateError('');
                    }}
                    className="min-h-[44px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors cursor-pointer"
                  >
                    Max ({formatCurrency(remainingCarryOver)})
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAllocateModal}
                    disabled={isAllocating}
                    className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAllocating}
                    className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_20px_rgba(45,212,191,0.35)] transition-all text-sm cursor-pointer disabled:opacity-50"
                  >
                    {isAllocating ? 'Allocating...' : 'Allocate Amount'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
