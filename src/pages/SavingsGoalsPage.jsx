import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, CheckCircle2, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils/finance';
import { EmptyState } from '../components/common/States';
import { CustomInput, CustomNumberInput, CustomSelect, CustomDatePicker } from '../components/ui/forms';

const INITIAL_GOALS = [
  { id: '1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: '2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: '3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

export default function SavingsGoalsPage({ previousCarryOver = 0 }) {
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allocatedCarryOver, setAllocatedCarryOver] = useState(false);

  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    priority: 'medium',
    deadline_date: '',
  });

  const priorityOptions = [
    { label: 'Low Priority', value: 'low' },
    { label: 'Medium Priority', value: 'medium' },
    { label: 'High Priority', value: 'high' },
  ];

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) return;

    setGoals((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: newGoal.name,
        target_amount: Number(newGoal.target_amount),
        current_amount: Number(newGoal.current_amount || 0),
        priority: newGoal.priority,
        deadline_date: newGoal.deadline_date || null,
      },
    ]);

    setNewGoal({ name: '', target_amount: '', current_amount: '', priority: 'medium', deadline_date: '' });
    setShowAddModal(false);
  };

  const handleAllocateCarryOver = (goalId) => {
    if (previousCarryOver <= 0 || allocatedCarryOver) return;
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, current_amount: g.current_amount + previousCarryOver } : g)));
    setAllocatedCarryOver(true);
  };

  const totalSavings = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);

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
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/20 flex items-center justify-center">
              <PiggyBank size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Goal Savings</p>
              <h2 className="text-3xl font-extrabold text-slate-100">{formatCurrency(totalSavings)}</h2>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Target across all goals: <span className="text-slate-200 font-semibold">{formatCurrency(totalTarget)}</span> ({totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 100) : 0}% funded)
          </p>
        </div>

        {/* Carry-over Spending / Funding Confirmation */}
        <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Target className="text-teal-400" size={20} />
              <h3 className="text-lg font-bold text-slate-100">Carry-Over Allocation</h3>
            </div>
            <p className="text-sm text-slate-400">
              {previousCarryOver > 0
                ? `You have ${formatCurrency(previousCarryOver)} in unused carry-over balance from last month.`
                : 'No positive carry-over available from last month.'}
            </p>
          </div>

          {previousCarryOver > 0 && !allocatedCarryOver ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => handleAllocateCarryOver(goals[0]?.id)}
                className="py-2.5 px-4 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-xs"
              >
                Apply Carry-Over to Top Priority Goal
              </button>
            </div>
          ) : allocatedCarryOver ? (
            <div className="mt-4 flex items-center gap-2 text-teal-400 text-sm font-semibold">
              <CheckCircle2 size={18} />
              <span>Carry-over allocated successfully!</span>
            </div>
          ) : null}
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
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm"
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
            const percent = Math.min(100, Math.max(0, (goal.current_amount / goal.target_amount) * 100));
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
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${getPriorityBadge(goal.priority)}`}>
                      {goal.priority}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-extrabold text-slate-100">{formatCurrency(goal.current_amount)}</span>
                      <span className="text-sm font-medium text-slate-400">/ {formatCurrency(goal.target_amount)}</span>
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
                    onClick={() => {
                      const amount = prompt(`Add deposit to ${goal.name} (NZD):`, '100');
                      if (amount && !isNaN(amount)) {
                        setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, current_amount: g.current_amount + Number(amount) } : g)));
                      }
                    }}
                    className="py-2 px-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-xs flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Deposit
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
            <button onClick={() => setShowAddModal(true)} className="py-2 px-4 rounded-xl font-semibold bg-purple-600 text-white text-sm">
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
                    className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm"
                  >
                    Create Goal
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
