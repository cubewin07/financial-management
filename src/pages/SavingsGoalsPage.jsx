import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, CheckCircle2, PiggyBank, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/finance';
import { EmptyState } from '../components/common/States';
import { CustomInput, CustomNumberInput, CustomSelect, CustomDatePicker } from '../components/ui/forms';

const INITIAL_GOALS = [
  { id: '1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: '2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: '3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

export default function SavingsGoalsPage({
  goals: propGoals,
  onAddGoal,
  onDeleteGoal,
  onAddDeposit,
  onAllocateCarryOver,
  previousCarryOver = 0,
}) {
  const [localGoals, setLocalGoals] = useState(INITIAL_GOALS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  // Add Deposit custom modal state
  const [goalForDeposit, setGoalForDeposit] = useState(null);
  const [depositAmountInput, setDepositAmountInput] = useState('100');
  const [depositError, setDepositError] = useState('');
  
  // Carry-over custom allocation state
  const [usedCarryOver, setUsedCarryOver] = useState(0);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [targetGoalId, setTargetGoalId] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateError, setAllocateError] = useState('');

  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    priority: 'medium',
    deadline_date: '',
  });

  const goals = propGoals || localGoals;
  const remainingCarryOver = Math.max(0, previousCarryOver - usedCarryOver);

  const priorityOptions = [
    { label: 'Low Priority', value: 'low' },
    { label: 'Medium Priority', value: 'medium' },
    { label: 'High Priority', value: 'high' },
  ];

  const goalOptions = goals.map((g) => {
    const cur = Number(g.current_amount) || 0;
    const tgt = Number(g.target_amount) || 1;
    const percent = Math.min(100, Math.max(0, Math.round((cur / tgt) * 100)));
    return {
      label: `${g.name} (${percent}%)`,
      value: g.id,
    };
  });

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) return;

    const goalData = {
      name: newGoal.name,
      target_amount: Number(newGoal.target_amount),
      current_amount: Number(newGoal.current_amount || 0),
      priority: newGoal.priority,
      deadline_date: newGoal.deadline_date || null,
    };

    if (onAddGoal) {
      await onAddGoal(goalData);
    } else {
      setLocalGoals((prev) => [
        { id: String(Date.now()), ...goalData },
        ...prev,
      ]);
    }

    setNewGoal({ name: '', target_amount: '', current_amount: '', priority: 'medium', deadline_date: '' });
    setShowAddModal(false);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    if (onDeleteGoal) {
      await onDeleteGoal(goalToDelete.id);
    } else {
      setLocalGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
    }
    setGoalToDelete(null);
  };

  const handleOpenDepositModal = (goal) => {
    setGoalForDeposit(goal);
    setDepositAmountInput('100');
    setDepositError('');
  };

  const handleConfirmDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmountInput);

    if (isNaN(amount) || amount <= 0) {
      setDepositError('Please enter a valid deposit amount greater than 0.');
      return;
    }

    if (onAddDeposit) {
      await onAddDeposit(goalForDeposit.id, amount);
    } else {
      setLocalGoals((prev) =>
        prev.map((g) => (g.id === goalForDeposit.id ? { ...g, current_amount: g.current_amount + amount } : g)),
      );
    }

    setGoalForDeposit(null);
    setDepositAmountInput('');
    setDepositError('');
  };

  const handleOpenAllocateModal = () => {
    if (remainingCarryOver <= 0 || goals.length === 0) return;
    const initialGoalId = goals[0]?.id || '';
    setTargetGoalId(initialGoalId);

    const selected = goals.find((g) => g.id === initialGoalId);
    const needed = selected ? Math.max(0, Number(selected.target_amount) - Number(selected.current_amount)) : remainingCarryOver;
    const suggested = Math.min(remainingCarryOver, needed > 0 ? needed : remainingCarryOver);

    setAllocateAmount(String(suggested));
    setAllocateError('');
    setShowAllocateModal(true);
  };

  const handleConfirmAllocation = async (e) => {
    e.preventDefault();
    const amount = Number(allocateAmount);

    if (isNaN(amount) || amount <= 0) {
      setAllocateError('Please enter a valid allocation amount greater than 0.');
      return;
    }

    if (amount > remainingCarryOver) {
      setAllocateError(`Amount exceeds available carry-over balance of ${formatCurrency(remainingCarryOver)}.`);
      return;
    }

    if (!targetGoalId) {
      setAllocateError('Please select a target savings goal.');
      return;
    }

    if (onAllocateCarryOver) {
      await onAllocateCarryOver(targetGoalId, amount);
    } else {
      setLocalGoals((prev) =>
        prev.map((g) => (g.id === targetGoalId ? { ...g, current_amount: g.current_amount + amount } : g)),
      );
    }

    setUsedCarryOver((prev) => prev + amount);
    setShowAllocateModal(false);
    setAllocateAmount('');
    setAllocateError('');
  };

  const totalSavings = goals.reduce((acc, g) => acc + (Number(g.current_amount) || 0), 0);
  const totalTarget = goals.reduce((acc, g) => acc + (Number(g.target_amount) || 0), 0);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stat & Carry-Over Confirm Banner */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Total Goal Savings Card */}
        <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between h-full space-y-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/20 flex items-center justify-center shrink-0">
                <PiggyBank size={24} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Goal Savings</p>
                <h2 className="text-3xl font-black text-slate-100 tracking-tight">{formatCurrency(totalSavings)}</h2>
              </div>
            </div>
            {totalTarget > 0 && (
              <span className="text-[11px] font-extrabold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-full shrink-0">
                {Math.round((totalSavings / totalTarget) * 100)}% Funded
              </span>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">
                Target across all goals: <span className="text-slate-200 font-semibold">{formatCurrency(totalTarget)}</span>
              </span>
              <span className="text-slate-400 font-medium">
                {totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all duration-700"
                style={{ width: `${totalTarget > 0 ? Math.min(100, (totalSavings / totalTarget) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Carry-Over Allocation Card */}
        <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between h-full relative overflow-hidden space-y-5">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Carry-Over Allocation</h3>
                  <p className="text-xs text-slate-400">Unused monthly balance</p>
                </div>
              </div>
              {previousCarryOver > 0 && (
                <span className="text-[11px] font-extrabold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-3 py-1.5 rounded-full shrink-0">
                  {formatCurrency(remainingCarryOver)} Available
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              {previousCarryOver > 0
                ? usedCarryOver > 0 && remainingCarryOver > 0
                  ? `Remaining carry-over: ${formatCurrency(remainingCarryOver)} of ${formatCurrency(previousCarryOver)} total.`
                  : remainingCarryOver > 0
                  ? `You have ${formatCurrency(previousCarryOver)} in unused carry-over balance from last month.`
                  : `All ${formatCurrency(previousCarryOver)} carry-over balance has been allocated!`
                : 'No positive carry-over available from last month.'}
            </p>
          </div>

          <div className="pt-2 border-t border-white/5">
            {remainingCarryOver > 0 && goals.length > 0 ? (
              <button
                onClick={handleOpenAllocateModal}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_20px_rgba(45,212,191,0.35)] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Target size={15} />
                <span>Allocate Carry-Over Funds</span>
              </button>
            ) : previousCarryOver > 0 && remainingCarryOver <= 0 ? (
              <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold py-1">
                <CheckCircle2 size={16} />
                <span>Carry-over fully allocated across goals!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">No carry-over balance to allocate.</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-100">Active Savings Goals</h3>
          <p className="text-sm text-slate-400">Track priorities & milestone progress</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm cursor-pointer"
        >
          <Plus size={18} />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {goals.map((goal) => {
            const current = Number(goal.current_amount) || 0;
            const target = Number(goal.target_amount) || 1;
            const percent = Math.min(100, Math.max(0, (current / target) * 100));
            return (
              <motion.div
                key={goal.id}
                variants={itemVariants}
                whileHover={{ y: -3 }}
                className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between relative group hover:border-purple-400/40 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-bold text-slate-100">{goal.name}</h4>
                      {goal.deadline_date && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Target: {new Date(goal.deadline_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${getPriorityBadge(goal.priority)}`}>
                        {goal.priority}
                      </span>
                      <button
                        onClick={() => setGoalToDelete(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer md:hidden"
                        title="Delete savings goal"
                        aria-label={`Delete ${goal.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-extrabold text-slate-100">{formatCurrency(current)}</span>
                      <span className="text-sm font-medium text-slate-400">/ {formatCurrency(target)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 text-right">{percent.toFixed(0)}% funded</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenDepositModal(goal)}
                    className="py-2 px-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Deposit
                  </button>

                  <button
                    onClick={() => setGoalToDelete(goal)}
                    className="hidden md:flex py-2 px-3 rounded-xl font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors text-xs items-center gap-1.5 cursor-pointer"
                    title="Delete Goal"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          title="No savings goals created"
          description="Create your first savings goal to track milestones and allocate carry-over funds."
          action={
            <button onClick={() => setShowAddModal(true)} className="py-2 px-4 rounded-xl font-semibold bg-purple-600 text-white text-sm cursor-pointer">
              Create First Goal
            </button>
          }
        />
      )}

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-5"
            >
              <h3 className="text-2xl font-bold text-slate-100">Add New Savings Goal</h3>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <CustomInput
                  label="Goal Name"
                  placeholder="e.g. Emergency Reserve, New Car"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <CustomNumberInput
                    label="Target Amount"
                    placeholder="1000"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                    required
                  />
                  <CustomNumberInput
                    label="Initial Savings"
                    placeholder="0"
                    value={newGoal.current_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, current_amount: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm cursor-pointer"
                  >
                    Create Goal
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-5"
            >
              <div className="flex items-center gap-3 text-purple-400">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <PiggyBank size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Add Deposit</h3>
                  <p className="text-xs text-slate-400">
                    Target goal: <span className="font-semibold text-slate-200">{goalForDeposit.name}</span>
                  </p>
                </div>
              </div>

              {/* Progress Summary Card inside modal */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400 font-medium">Current Funding</span>
                  <span className="text-slate-200 font-bold">
                    {formatCurrency(goalForDeposit.current_amount)} / {formatCurrency(goalForDeposit.target_amount)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-teal-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                    style={{
                      width: `${Math.min(100, Math.max(0, (goalForDeposit.current_amount / goalForDeposit.target_amount) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {depositError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {depositError}
                </div>
              )}

              <form onSubmit={handleConfirmDeposit} className="space-y-4">
                <CustomNumberInput
                  label="Deposit Amount (NZD)"
                  placeholder="100"
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  required
                />

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDepositAmountInput(String(preset))}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    >
                      +${preset}
                    </button>
                  ))}
                  {goalForDeposit.target_amount > goalForDeposit.current_amount && (
                    <button
                      type="button"
                      onClick={() =>
                        setDepositAmountInput(
                          String(Math.max(0, goalForDeposit.target_amount - goalForDeposit.current_amount))
                        )
                      }
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                    >
                      Fill Goal ({formatCurrency(Math.max(0, goalForDeposit.target_amount - goalForDeposit.current_amount))})
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setGoalForDeposit(null)}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm cursor-pointer"
                  >
                    Confirm Deposit
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="p-7 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-5"
            >
              <div className="flex items-center gap-3 text-teal-400">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <Target size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Allocate Carry-Over</h3>
                  <p className="text-xs text-slate-400">Distribute unused monthly balance</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Available Balance:</span>
                <span className="text-teal-300 font-extrabold text-base">{formatCurrency(remainingCarryOver)}</span>
              </div>

              {allocateError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {allocateError}
                </div>
              )}

              <form onSubmit={handleConfirmAllocation} className="space-y-4">
                <CustomSelect
                  label="Select Goal"
                  options={goalOptions}
                  value={targetGoalId}
                  onChange={(val) => {
                    setTargetGoalId(val);
                    const selected = goals.find((g) => g.id === val);
                    const needed = selected ? Math.max(0, Number(selected.target_amount) - Number(selected.current_amount)) : remainingCarryOver;
                    setAllocateAmount(String(Math.min(remainingCarryOver, needed > 0 ? needed : remainingCarryOver)));
                  }}
                />

                <CustomNumberInput
                  label="Allocation Amount (NZD)"
                  placeholder="Enter amount"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  required
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  {[50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={remainingCarryOver < preset}
                      onClick={() => setAllocateAmount(String(Math.min(remainingCarryOver, preset)))}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    >
                      +${preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAllocateAmount(String(remainingCarryOver))}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors cursor-pointer"
                  >
                    Max ({formatCurrency(remainingCarryOver)})
                  </button>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAllocateModal(false)}
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_20px_rgba(45,212,191,0.35)] transition-all text-sm cursor-pointer"
                  >
                    Allocate Amount
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {goalToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="p-6 rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl w-full max-w-md space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Delete Savings Goal</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-white">"{goalToDelete.name}"</span> with target amount of <span className="font-semibold text-white">{formatCurrency(goalToDelete.target_amount)}</span>?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGoalToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteGoal}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all text-sm cursor-pointer"
                >
                  Delete Goal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
