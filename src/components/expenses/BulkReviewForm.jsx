import { useRef, useState } from 'react';
import { CATEGORIES, getLocalDateString } from '../../utils/finance';
import { CustomNumberInput, CustomSelect, CustomInput, CustomDatePicker } from '../ui/forms';
import { Trash2, Plus } from 'lucide-react';

export default function BulkReviewForm({
  initialItems = [],
  failedCount,
  onSave,
  onCancel,
  defaultCurrency,
  saveError = '',
  isSaving = false,
  onClearError,
}) {
  const nextIdRef = useRef(initialItems.length);
  const [items, setItems] = useState(
    initialItems.map((item, idx) => ({
      id: `row-${idx + 1}`,
      amount: item.amount ?? '',
      category: item.category || CATEGORIES[0],
      date: item.date || getLocalDateString(),
      note: item.note || '',
    }))
  );

  const categoryOptions = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

  const updateItem = (id, field, value) => {
    if (onClearError) onClearError();
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id) => {
    if (onClearError) onClearError();
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addItem = () => {
    if (onClearError) onClearError();
    nextIdRef.current += 1;
    setItems((current) => [
      ...current,
      {
        id: `row-${nextIdRef.current}`,
        amount: '',
        category: CATEGORIES[0],
        date: getLocalDateString(),
        note: '',
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex justify-between items-center gap-3">
        <h3 className="text-lg sm:text-xl font-bold text-slate-100">Review Scanned Items</h3>
        <button
          type="button"
          onClick={addItem}
          className="min-h-[44px] sm:min-h-[34px] px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-purple-200 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Row</span>
        </button>
      </div>

      {failedCount > 0 && (
        <p className="text-xs sm:text-sm font-medium text-red-300 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          {failedCount} receipt(s) failed to scan. You can add them manually below.
        </p>
      )}

      <div className="space-y-3 sm:space-y-4 max-h-[50dvh] sm:max-h-[50vh] overflow-y-auto pr-1 sm:pr-2 overscroll-contain">
        {items.map((item, idx) => (
          <div key={item.id} className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-col gap-3 group">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Item #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove item ${idx + 1}`}
                className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <CustomNumberInput
                currency={defaultCurrency}
                label="Amount"
                value={item.amount}
                onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                showStepper={false}
                min={0}
                placeholder="0.00"
              />
              <CustomSelect
                label="Category"
                options={categoryOptions}
                value={item.category}
                onChange={(val) => updateItem(item.id, 'category', val)}
              />
              <CustomDatePicker
                label="Date"
                value={item.date}
                onChange={(val) => updateItem(item.id, 'date', val)}
                required
              />
              <CustomInput
                label="Note"
                value={item.note}
                placeholder="What was this for?"
                onChange={(e) => updateItem(item.id, 'note', e.target.value)}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            No items to review. Click &quot;Add Row&quot; to create an item.
          </p>
        )}
      </div>

      {saveError && <p role="alert" className="text-xs sm:text-sm font-medium text-red-400">{saveError}</p>}

      <div className="flex gap-3 sm:gap-4 mt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(items)}
          disabled={items.length === 0 || isSaving}
          className="flex-1 min-h-[44px] py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
        >
          {isSaving ? 'Saving...' : `Save All (${items.length})`}
        </button>
      </div>
    </div>
  );
}
