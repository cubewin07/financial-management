import { useState } from 'react';
import { CATEGORIES, createExpense } from '../../utils/finance';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptScanner from './ReceiptScanner';
import BulkReviewForm from './BulkReviewForm';
import { ReceiptLLMProvider } from '../../lib/ReceiptLLMProvider';
import { CustomNumberInput, CustomSelect, CustomInput, CustomDatePicker } from '../ui/forms';

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

  const categoryOptions = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

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
            <div className="grid gap-5 sm:grid-cols-2">
              <CustomNumberInput
                label="Amount"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />

              <CustomSelect
                label="Category"
                options={categoryOptions}
                value={form.category}
                onChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
              />

              <div className="sm:col-span-2">
                <CustomInput
                  label="Note (optional)"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="What was this for?"
                />
              </div>

              <div className="sm:col-span-2">
                <CustomDatePicker
                  label="Date"
                  value={form.date}
                  onChange={(val) => setForm((prev) => ({ ...prev, date: val }))}
                />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-red-400">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-4 mt-2">
              <button 
                type="button" 
                onClick={() => setMode('scanning')}
                className="px-4 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all duration-200 flex-1"
              >
                Scan Receipt (AI)
              </button>
              <button
                type="submit"
                className="px-4 py-3 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all duration-200 flex-1"
              >
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
