import { useState } from 'react';
import { CATEGORIES } from '../utils/finance';

function createExpenseId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ExpenseForm({ onSubmit }) {
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!amount || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    setError('');
    onSubmit({
      id: createExpenseId(),
      amount,
      category: form.category,
      date: form.date,
      note: form.note.trim(),
    });

    setForm({
      amount: '',
      category: 'Food',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="premium-card rounded-2xl p-8 transition duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-gray-400">Amount</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            className="premium-panel w-full rounded-lg px-4 py-3 text-lg text-white outline-none transition duration-200 placeholder:text-gray-500 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-gray-400">Category</span>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="premium-panel w-full appearance-none rounded-lg px-4 py-3 text-lg text-white outline-none transition duration-200 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category} className="bg-slate-900">
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-gray-400">Date</span>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            className="premium-panel w-full rounded-lg px-4 py-3 text-lg text-white outline-none transition duration-200 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-gray-400">Note</span>
          <input
            name="note"
            type="text"
            value={form.note}
            onChange={handleChange}
            placeholder="What was this for?"
            className="premium-panel w-full rounded-lg px-4 py-3 text-lg text-white outline-none transition duration-200 placeholder:text-gray-500 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
          />
        </label>
      </div>

      {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        className="mt-8 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black shadow-md transition duration-200 hover:-translate-y-0.5"
      >
        Save expense
      </button>
    </form>
  );
}

export default ExpenseForm;
