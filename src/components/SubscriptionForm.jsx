import { useState } from 'react';
import DatePicker from './ui/DatePicker';
import Select from './ui/Select';

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

  const handleAmountStep = (step) => {
    setForm((current) => {
      const currentVal = Number(current.amount) || 0;
      const newVal = Math.max(0, currentVal + step);
      return { ...current, amount: newVal === 0 ? '' : Number.isInteger(newVal) ? newVal.toString() : newVal.toFixed(2) };
    });
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

      <div className="mt-6 grid gap-5 md:grid-cols-2">
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
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium text-lg">$</span>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="input-shell tabular-nums !pl-10 !pr-[96px] text-lg !min-h-[56px] no-spinners"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                tabIndex="-1"
                onClick={(e) => { e.preventDefault(); handleAmountStep(-1); }}
                className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:bg-[rgba(124,111,224,0.12)] hover:border-[rgba(124,111,224,0.2)] hover:text-[var(--accent-purple)] transition-all"
                aria-label="Decrease amount"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
              </button>
              <button
                type="button"
                tabIndex="-1"
                onClick={(e) => { e.preventDefault(); handleAmountStep(1); }}
                className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:bg-[rgba(124,111,224,0.12)] hover:border-[rgba(124,111,224,0.2)] hover:text-[var(--accent-purple)] transition-all"
                aria-label="Increase amount"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>
            </div>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Frequency</span>
          <Select
            name="frequency"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={form.frequency}
            onChange={handleChange}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-secondary)]">Start date</span>
          <DatePicker
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
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
