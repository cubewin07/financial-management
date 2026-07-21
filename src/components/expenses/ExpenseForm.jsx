import { useState } from 'react';
import { CATEGORIES, createExpense } from '../../utils/finance';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptScanner from './ReceiptScanner';
import BulkReviewForm from './BulkReviewForm';
import { ReceiptLLMProvider } from '../../lib/ReceiptLLMProvider';

const llmProvider = new ReceiptLLMProvider();

export default function ExpenseForm({ onSubmit, userId = 'local-owner' }) {
  const [mode, setMode] = useState('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [failedCount, setFailedCount] = useState(0);
  const [scannerError, setScannerError] = useState('');

  const [form, setForm] = useState({
    amount: '',
    category: CATEGORIES[0] || 'Food',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(current => ({ ...current, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    setError('');
    onSubmit(
      createExpense({
        amount,
        category: form.category,
        date: form.date,
        note: form.note,
      }, userId)
    );
  };

  const handleProcessFiles = async (files) => {
    setIsProcessing(true);
    setScannerError('');
    setFailedCount(0);
    try {
      const promises = files.map(f => llmProvider.parseReceipt(f));
      const results = await Promise.allSettled(promises);
      let extracted = [];
      let fails = 0;
      let lastErr = null;
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          if (res.value.error) {
            fails++;
            lastErr = res.value.error;
          } else if (res.value.items?.length > 0) {
            extracted.push(...res.value.items);
          } else {
            fails++;
          }
        } else {
          fails++;
          lastErr = res.reason?.message || 'Unknown error';
        }
      });
      if (extracted.length === 0) {
        setScannerError(lastErr || 'Failed to extract data.');
        setIsProcessing(false);
      } else {
        setScannedItems(extracted);
        setFailedCount(fails);
        setIsProcessing(false);
        setMode('reviewing');
      }
    } catch (err) {
      setScannerError('Unexpected error.');
      setIsProcessing(false);
    }
  };

  const handleBulkSave = (items) => {
    const valid = items.filter(i => Number(i.amount) > 0);
    if (valid.length > 0) {
      onSubmit(valid);
    }
  };

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {mode === 'manual' && (
          <motion.form
            key="manual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="block text-label-md text-[var(--on-surface-variant)] mb-2">Amount</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="input-shell w-full text-headline-md h-14"
                />
              </label>

              <label className="block">
                <span className="block text-label-md text-[var(--on-surface-variant)] mb-2">Category</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="input-shell w-full h-14"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="block text-label-md text-[var(--on-surface-variant)] mb-2">Note (optional)</span>
                <input
                  name="note"
                  type="text"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="What was this for?"
                  className="input-shell w-full h-12"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="block text-label-md text-[var(--on-surface-variant)] mb-2">Date</span>
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  className="input-shell w-full h-12"
                />
              </label>
            </div>

            {error && <p className="text-label-md text-[var(--error)]">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-4 mt-4">
              <button 
                type="button" 
                onClick={() => setMode('scanning')}
                className="btn-secondary flex-1 py-3"
              >
                Scan Receipt (AI)
              </button>
              <button type="submit" className="btn-primary flex-1 py-3">
                Save Expense
              </button>
            </div>
          </motion.form>
        )}

        {mode === 'scanning' && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReceiptScanner 
              isProcessing={isProcessing}
              error={scannerError}
              onProcessFiles={handleProcessFiles}
              onCancel={() => setMode('manual')}
            />
          </motion.div>
        )}

        {mode === 'reviewing' && (
          <motion.div key="reviewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BulkReviewForm 
              initialItems={scannedItems}
              failedCount={failedCount}
              onSave={handleBulkSave}
              onCancel={() => setMode('manual')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
