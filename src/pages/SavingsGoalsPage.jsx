import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, CheckCircle2, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils/finance';
import { EmptyState } from '../components/common/States';

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

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) return;

    setGoals(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: newGoal.name,
        target_amount: Number(newGoal.target_amount),
        current_amount: Number(newGoal.current_amount || 0),
        priority: newGoal.priority,
        deadline_date: newGoal.deadline_date || null,
      }
    ]);

    setNewGoal({ name: '', target_amount: '', current_amount: '', priority: 'medium', deadline_date: '' });
    setShowAddModal(false);
  };

  const handleAllocateCarryOver = (goalId) => {
    if (previousCarryOver <= 0 || allocatedCarryOver) return;
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, current_amount: g.current_amount + previousCarryOver } : g));
    setAllocatedCarryOver(true);
  };

  const totalSavings = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-[rgba(255,176,202,0.15)] text-[var(--tertiary)] border-[rgba(255,176,202,0.3)]';
      case 'low':
        return 'bg-[rgba(211,251,255,0.15)] text-[var(--secondary)] border-[rgba(211,251,255,0.3)]';
      default:
        return 'bg-[rgba(208,188,255,0.15)] text-[var(--primary)] border-[rgba(208,188,255,0.3)]';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 220 } }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stat & Carry-Over Confirm Banner */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-10 blur-2xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[rgba(208,188,255,0.1)] text-[var(--primary)] flex items-center justify-center">
              <PiggyBank size={24} />
            </div>
            <div>
              <p className="text-label-md text-[var(--on-surface-variant)] uppercase tracking-wider">Total Goal Savings</p>
              <h2 className="text-display text-[var(--on-surface)]">{formatCurrency(totalSavings)}</h2>
            </div>
          </div>
          <p className="text-label-sm text-[var(--on-surface-variant)]">
            Target across all goals: <span className="text-[var(--on-surface)] font-semibold">{formatCurrency(totalTarget)}</span> ({totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 100) : 0}% funded)
          </p>
        </div>

        {/* Carry-over Spending / Funding Confirmation */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-[var(--secondary)] opacity-10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-[var(--secondary)]" size={20} />
              <h3 className="text-headline-md text-[var(--on-surface)]">Carry-Over Allocation</h3>
            </div>
            <p className="text-body-md text-[var(--on-surface-variant)]">
              {previousCarryOver > 0
                ? `You have ${formatCurrency(previousCarryOver)} in unused carry-over balance from last month.`
                : 'No positive carry-over available from last month.'}
            </p>
          </div>

          {previousCarryOver > 0 && !allocatedCarryOver ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => handleAllocateCarryOver(goals[0]?.id)}
                className="btn-primary py-2 px-4 text-label-md"
              >
                Apply Carry-Over to Top Priority Goal
              </button>
            </div>
          ) : allocatedCarryOver ? (
            <div className="mt-4 flex items-center gap-2 text-[var(--secondary)] text-label-md">
              <CheckCircle2 size={18} />
              <span>Carry-over allocated successfully!</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md text-[var(--on-surface)]">Active Savings Goals</h3>
          <p className="text-body-md text-[var(--on-surface-variant)]">Track priorities & milestone progress</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 py-2.5 px-4">
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
                whileHover={{ y: -2 }}
                className="glass-card p-6 flex flex-col justify-between relative group hover:border-[rgba(255,255,255,0.2)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-headline-md text-[var(--on-surface)]">{goal.name}</h4>
                      {goal.deadline_date && (
                        <p className="text-label-sm text-[var(--on-surface-variant)] mt-0.5">
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
                      <span className="text-display text-[var(--on-surface)] text-2xl font-bold">{formatCurrency(goal.current_amount)}</span>
                      <span className="text-label-md text-[var(--on-surface-variant)]">/ {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-[0_0_10px_var(--primary)] transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-label-sm text-[var(--on-surface-variant)] mt-1.5 text-right">{percent.toFixed(0)}% funded</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--outline-variant)] flex items-center justify-between">
                  <button
                    onClick={() => {
                      const amount = prompt(`Add deposit to ${goal.name} (NZD):`, '100');
                      if (amount && !isNaN(amount)) {
                        setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, current_amount: g.current_amount + Number(amount) } : g));
                      }
                    }}
                    className="btn-secondary py-1.5 px-3 text-label-sm flex items-center gap-1"
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
            <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 text-label-md">
              Create First Goal
            </button>
          }
        />
      )}

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card p-6 w-full max-w-md space-y-4"
            >
              <h3 className="text-headline-md text-[var(--on-surface)]">Add New Savings Goal</h3>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-label-md text-[var(--on-surface-variant)] mb-1">Goal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Laptop"
                    value={newGoal.name}
                    onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                    className="input-shell w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-[var(--on-surface-variant)] mb-1">Target Amount (NZD)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1000"
                      value={newGoal.target_amount}
                      onChange={e => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                      className="input-shell w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md text-[var(--on-surface-variant)] mb-1">Initial Savings (NZD)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newGoal.current_amount}
                      onChange={e => setNewGoal({ ...newGoal, current_amount: e.target.value })}
                      className="input-shell w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-[var(--on-surface-variant)] mb-1">Priority</label>
                    <select
                      value={newGoal.priority}
                      onChange={e => setNewGoal({ ...newGoal, priority: e.target.value })}
                      className="input-shell w-full bg-[var(--surface-container)]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-md text-[var(--on-surface-variant)] mb-1">Deadline</label>
                    <input
                      type="date"
                      value={newGoal.deadline_date}
                      onChange={e => setNewGoal({ ...newGoal, deadline_date: e.target.value })}
                      className="input-shell w-full bg-[var(--surface-container)] text-[var(--on-surface)] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-2">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1 py-2">
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
