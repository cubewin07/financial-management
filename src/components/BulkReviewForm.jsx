import { useState, useMemo } from 'react';
import { CATEGORIES } from '../utils/finance';
import AnimatedSelect from './AnimatedSelect';

export default function BulkReviewForm({ initialItems, onSave, onCancel }) {
  const [items, setItems] = useState(initialItems || []);

  const categoryOptions = useMemo(() => {
    return CATEGORIES.map((category) => ({
      value: category,
      label: category,
      description: `Log under ${category.toLowerCase()}`,
    }));
  }, []);

  const handleChange = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(items);
  };

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      { amount: '', category: 'Food', date: new Date().toISOString().slice(0, 10), note: '' }
    ]);
  };

  const handleDeleteRow = (indexToRemove) => {
    setItems((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="section-shell section-shell-purple rounded-[32px] p-5 sm:p-7 md:p-8 flex flex-col min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Review Expenses</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Please verify the extracted details below.</p>
        </div>
        <button type="button" onClick={onCancel} className="btn-secondary h-10 min-h-[40px] px-4 rounded-full">
          Cancel
        </button>
      </div>

      <div className="flex-grow space-y-4 overflow-y-auto pr-2 pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">No items found.</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Item {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteRow(index)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--accent-coral)] transition-colors p-1"
                  aria-label="Delete row"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Note</span>
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => handleChange(index, 'note', e.target.value)}
                    className="input-shell text-sm !min-h-[44px]"
                    placeholder="Description"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Amount</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount || ''}
                      onChange={(e) => handleChange(index, 'amount', e.target.value)}
                      className="input-shell text-sm !min-h-[44px] !pl-7 no-spinners"
                      placeholder="0.00"
                    />
                  </div>
                </label>

                <div className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Category</span>
                  <AnimatedSelect
                    options={categoryOptions}
                    value={item.category || 'Food'}
                    onChange={(val) => handleChange(index, 'category', val)}
                  />
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Date</span>
                  <input
                    type="date"
                    value={item.date || ''}
                    onChange={(e) => handleChange(index, 'date', e.target.value)}
                    className="input-shell text-sm !min-h-[44px]"
                  />
                </label>
              </div>
            </div>
          ))
        )}
        
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-2 text-sm font-medium text-[var(--accent-purple)] hover:text-white transition-colors py-2 px-4 rounded-xl hover:bg-[rgba(124,111,224,0.1)] w-full justify-center border border-dashed border-[rgba(124,111,224,0.3)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Row
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.05)]">
        <button 
          onClick={handleSubmit}
          className="btn-primary w-full !min-h-[56px] text-base shadow-xl shadow-[var(--accent-purple)]/20"
        >
          Save {items.length} Expense{items.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
