import { useState } from 'react';
import { motion } from 'framer-motion';

export default function AddSubscriptionModal({ onClose, onAdd }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label || !amount || !startDate) return;

    onAdd({
      label,
      amount: parseFloat(amount),
      frequency,
      start_date: startDate
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-[var(--surface-container-lowest)]/80 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-card relative w-full max-w-md p-8 flex flex-col gap-6"
      >
        <div>
          <h2 className="text-2xl font-bold text-[var(--on-surface)] m-0">Add Subscription</h2>
          <p className="text-sm text-[var(--on-surface-variant)] mt-1">Track a new fixed cost.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--on-surface)]">Service Name</label>
            <input 
              type="text"
              required
              className="input-shell"
              placeholder="e.g. Netflix, Gym, Utilities"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--on-surface)]">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]">$</span>
              <input 
                type="number"
                required
                min="0.01"
                step="0.01"
                className="input-shell w-full pl-7"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Frequency</label>
              <select 
                className="input-shell appearance-none bg-[var(--surface-container)]"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--on-surface)]">Start Date</label>
              <input 
                type="date"
                required
                className="input-shell w-full bg-[var(--surface-container)] text-[var(--on-surface)] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
             <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 rounded-lg">
               Cancel
             </button>
             <button type="submit" className="btn-primary flex-1 py-3 rounded-lg font-semibold">
               Add Subscription
             </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
