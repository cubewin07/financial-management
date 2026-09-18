import { useState } from 'react';
import { CATEGORIES } from '../../utils/finance';
import { CustomNumberInput, CustomSelect, CustomInput, CustomDatePicker } from '../ui/forms';
import { Trash2, Plus } from 'lucide-react';

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

  const categoryOptions = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

  const updateItem = (id, field, value) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        amount: '',
        category: CATEGORIES[0],
        date: new Date().toISOString().slice(0, 10),
        note: '',
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-100">Review Scanned Items</h3>
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-purple-200 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </button>
      </div>

      {failedCount > 0 && (
        <p className="text-sm font-medium text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          {failedCount} receipt(s) failed to scan. You can add them manually below.
        </p>
      )}

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.id} className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-col gap-4 relative group">
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="absolute top-3 right-3 text-slate-400 hover:text-red-400 opacity-80 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-white/10"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <CustomNumberInput
                label="Amount"
                value={item.amount}
                onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
              />
              <CustomSelect
                label="Category"
                options={categoryOptions}
                value={item.category}
                onChange={(val) => updateItem(item.id, 'category', val)}
              />
              <div className="col-span-2 sm:col-span-1">
                <CustomDatePicker
                  label="Date"
                  value={item.date}
                  onChange={(val) => updateItem(item.id, 'date', val)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <CustomInput
                  label="Note"
                  value={item.note}
                  onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            No items to review. Click "Add Row" to create an item.
          </p>
        )}
      </div>

      <div className="flex gap-4 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(items)}
          disabled={items.length === 0}
          className="flex-1 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
        >
          Save All ({items.length})
        </button>
      </div>
    </div>
  );
}
