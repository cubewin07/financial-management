import { useState } from 'react';

function SubscriptionForm({ onSubmit }) {
  const [form, setForm] = useState({
    label: '',
    amount: '',
    frequency: 'weekly',
    start_date: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!form.label.trim()) {
      setError('Add a label so you can recognize this fixed cost later.');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Enter a subscription amount greater than zero.');
      return;
    }

    setError('');
    onSubmit({
      label: form.label,
      amount,
      frequency: form.frequency,
      start_date: form.start_date,
      active: true,
    });

    setForm({
      label: '',
      amount: '',
      frequency: 'weekly',
      start_date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Add subscription</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Capture your recurring essentials
          </h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Weekly costs are projected with a 4.33x monthly multiplier.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Label</span>
          <input
            name="label"
            type="text"
            value={form.label}
            onChange={handleChange}
            placeholder="Bus pass"
            className="input-shell"
          />
        </label>

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
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Frequency</span>
          <select
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
            className="input-shell"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Start date</span>
          <input
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            className="input-shell"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-[var(--accent-coral)]">{error}</p> : null}

      <div className="mt-6 flex justify-end">
        <button type="submit" className="btn-primary">
          Add subscription
        </button>
      </div>
    </form>
  );
}

export default SubscriptionForm;
