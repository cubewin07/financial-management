import { useState } from 'react';
import { CATEGORIES } from '../../utils/finance';

export default function BulkReviewForm({ initialItems, failedCount, onSave, onCancel }) {
  const [items, setItems] = useState(
    initialItems.map((item, idx) => ({
      id: idx,
      amount: item.amount || '',
      category: item.category || CATEGORIES[0],
      date: item.date || new Date().toISOString().slice(0, 10),
      note: item.note || '',
    }))
  );

  const updateItem = (id, field, value) => {
    setItems(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => {
    setItems(current => current.filter(item => item.id !== id));
  };

  const addItem = () => {
    setItems(current => [
      ...current,
      {
        id: Date.now(),
        amount: '',
        category: CATEGORIES[0],
        date: new Date().toISOString().slice(0, 10),
        note: '',
      }
    ]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-headline-md text-[var(--on-surface)]">Review Scanned Items</h3>
        <button type="button" onClick={addItem} className="btn-secondary px-3 py-1 text-label-sm">
          + Add Row
        </button>
      </div>

      {failedCount > 0 && (
        <p className="text-label-md text-[var(--error)] bg-[var(--error-container)]/10 p-3 rounded-lg border border-[var(--error)]/20">
          {failedCount} receipt(s) failed to scan. You can add them manually.
        </p>
      )}

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.id} className="bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-xl p-4 flex flex-col gap-4 relative group">
            <button 
              type="button" 
              onClick={() => removeItem(item.id)}
              className="absolute top-2 right-2 text-[var(--on-surface-variant)] hover:text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="block text-label-sm text-[var(--on-surface-variant)] mb-1">Amount</span>
                <input 
                  type="number" step="0.01" min="0"
                  value={item.amount} onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                  className="input-shell w-full h-10"
                />
              </label>
              <label>
                <span className="block text-label-sm text-[var(--on-surface-variant)] mb-1">Category</span>
                <select 
                  value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                  className="input-shell w-full h-10"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </label>
              <label className="col-span-2 sm:col-span-1">
                <span className="block text-label-sm text-[var(--on-surface-variant)] mb-1">Date</span>
                <input 
                  type="date"
                  value={item.date} onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                  className="input-shell w-full h-10"
                />
              </label>
              <label className="col-span-2 sm:col-span-1">
                <span className="block text-label-sm text-[var(--on-surface-variant)] mb-1">Note</span>
                <input 
                  type="text"
                  value={item.note} onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                  className="input-shell w-full h-10"
                />
              </label>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-body-md text-[var(--on-surface-variant)] py-8">
            No items to review.
          </p>
        )}
      </div>

      <div className="flex gap-4 mt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 py-3">
          Cancel
        </button>
        <button 
          type="button" 
          onClick={() => onSave(items)} 
          className="btn-primary flex-1 py-3"
          disabled={items.length === 0}
        >
          Save All
        </button>
      </div>
    </div>
  );
}
