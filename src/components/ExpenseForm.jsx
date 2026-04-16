import { useState } from 'react';
import { CATEGORIES, createExpense } from '../utils/finance';

function ExpenseForm({ onSubmit, userId = 'local-owner' }) {
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
    onSubmit(
      createExpense(
        {
          amount,
          category: form.category,
          date: form.date,
          note: form.note,
        },
        userId,
      ),
    );

    setForm({
      amount: '',
      category: 'Food',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="section-shell section-shell-purple rounded-[32px] p-7 sm:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Amount</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            className="input-shell tabular-nums"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Category</span>
          <select name="category" value={form.category} onChange={handleChange} className="input-shell">
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Date</span>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            className="input-shell"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Note</span>
          <input
            name="note"
            type="text"
            value={form.note}
            onChange={handleChange}
            placeholder="Lunch on campus"
            className="input-shell"
          />
        </label>
      </div>

      {error ? <p className="mt-5 text-sm text-[var(--accent-coral)]">{error}</p> : null}

      <div className="mt-8 flex justify-end">
        <button type="submit" className="btn-primary">
          Save expense
        </button>
      </div>
    </form>
  );
}

export default ExpenseForm;
