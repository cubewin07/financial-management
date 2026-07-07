import { useState, useMemo } from 'react';
import { CATEGORIES, createExpense, getCategoryColor } from '../utils/finance';
import AnimatedSelect from './AnimatedSelect';

const categoryIcons = {
  Food: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M12 3a4 4 0 0 1 4 4 1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1 4 4 0 0 1 4-4Z"/></svg>,
  Groceries: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  Transport: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>,
  Entertainment: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.4-2.2 1.5-2.5l13.5-4c1.1-.3 2.2.4 2.5 1.5.3 1 0 2.1-.9 2.4z"/><path d="m11.5 5.5-3 10"/><path d="m5 12 11.5 10"/><path d="m5.5 21 6.5-18.5"/><path d="m12.5 7.5 7 13"/></svg>,
  Shopping: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Bills: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  Health: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Education: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Other: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
};

function ExpenseForm({ onSubmit, userId = 'local-owner' }) {
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [error, setError] = useState('');

  const categoryOptions = useMemo(() => {
    return CATEGORIES.map((category) => ({
      value: category,
      label: category,
      description: `Log under ${category.toLowerCase()}`,
      icon: categoryIcons[category] || categoryIcons['Other'],
      accent: getCategoryColor(category),
    }));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleCategoryChange = (value) => {
    setForm((current) => ({ ...current, category: value }));
  };

  const handleAmountStep = (step) => {
    setForm((current) => {
      const currentVal = Number(current.amount) || 0;
      const newVal = Math.max(0, currentVal + step);
      // Format to 2 decimal places if it's not a whole number, otherwise keep it simple
      return { ...current, amount: newVal === 0 ? '' : Number.isInteger(newVal) ? newVal.toString() : newVal.toFixed(2) };
    });
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
    <form onSubmit={handleSubmit} className="section-shell section-shell-purple rounded-[32px] p-5 sm:p-7 md:p-8 flex flex-col min-h-full">
      <div className="flex-grow space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2.5 block text-sm font-medium text-[var(--text-secondary)]">Amount</span>
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

          <div className="block">
            <span className="mb-2.5 block text-sm font-medium text-[var(--text-secondary)]">Category</span>
            <AnimatedSelect
              options={categoryOptions}
              value={form.category}
              onChange={handleCategoryChange}
            />
          </div>

          <label className="block md:col-span-2">
            <span className="mb-2.5 block text-sm font-medium text-[var(--text-secondary)]">Note</span>
            <input
              name="note"
              type="text"
              value={form.note}
              onChange={handleChange}
              placeholder="What was this for?"
              className="input-shell text-base !min-h-[56px]"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2.5 block text-sm font-medium text-[var(--text-secondary)]">Date</span>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              className="input-shell text-base !min-h-[56px]"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.26)] bg-[rgba(248,113,113,0.1)] px-4 py-3 text-sm text-[var(--accent-coral)] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-8 pt-4 pb-4 md:pb-0 fixed bottom-0 left-0 right-0 z-50 p-4 md:static md:p-0 backdrop-blur-xl md:backdrop-blur-none bg-[rgba(10,10,15,0.85)] border-t border-[var(--border)] md:bg-transparent md:border-none rounded-t-3xl md:rounded-none flex flex-col md:flex-row items-center gap-3 justify-center md:justify-end">
        <button 
          type="button" 
          onClick={() => alert("Scan Receipt (AI) is coming in Version 2. This will process your image and auto-fill expenses.")} 
          className="btn-ai w-full md:w-auto flex items-center justify-center gap-2 !min-h-[56px] text-base px-6 shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
            <path d="M12 12v9"></path>
            <path d="m8 17 4 4 4-4"></path>
          </svg>
          Scan Receipt (AI)
        </button>
        <button type="submit" className="btn-primary w-full md:w-auto !min-h-[56px] text-base px-8 shadow-xl shadow-[var(--accent-purple)]/20">
          Save expense
        </button>
      </div>
    </form>
  );
}

export default ExpenseForm;
