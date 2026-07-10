import { useState, useMemo } from 'react';
import { CATEGORIES, createExpense, getCategoryColor } from '../utils/finance';
import AnimatedSelect from './AnimatedSelect';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptScanner from './ReceiptScanner';
import BulkReviewForm from './BulkReviewForm';
import { ReceiptLLMProvider } from '../lib/ReceiptLLMProvider';
import { Utensils, ShoppingCart, Car, Film, ShoppingBag, Receipt, HeartPulse, GraduationCap, MoreHorizontal } from 'lucide-react';
import DatePicker from './ui/DatePicker';

const categoryIcons = {
  Food: <Utensils width={20} height={20} />,
  Groceries: <ShoppingCart width={20} height={20} />,
  Transport: <Car width={20} height={20} />,
  Entertainment: <Film width={20} height={20} />,
  Shopping: <ShoppingBag width={20} height={20} />,
  Bills: <Receipt width={20} height={20} />,
  Health: <HeartPulse width={20} height={20} />,
  Education: <GraduationCap width={20} height={20} />,
  Other: <MoreHorizontal width={20} height={20} />,
};

const llmProvider = new ReceiptLLMProvider();

function ExpenseForm({ onSubmit, userId = 'local-owner' }) {
  const [mode, setMode] = useState('manual'); // 'manual', 'scanning', 'reviewing'
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [failedCount, setFailedCount] = useState(0);
  const [scannerError, setScannerError] = useState('');

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

  const handleProcessFiles = async (files) => {
    setIsProcessing(true);
    setScannerError('');
    setFailedCount(0);

    try {
      const promises = files.map(file => llmProvider.parseReceipt(file));
      const results = await Promise.allSettled(promises);

      let allExtractedItems = [];
      let failureCount = 0;

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const { items, error } = result.value;
          if (error) {
            console.warn(`File ${files[idx].name} failed to parse: ${error}`);
            failureCount++;
          } else if (items && items.length > 0) {
            allExtractedItems.push(...items);
          } else {
            failureCount++;
          }
        } else {
          console.error(`Promise rejected for file ${files[idx].name}:`, result.reason);
          failureCount++;
        }
      });

      if (allExtractedItems.length === 0) {
        // Complete failure
        setScannerError('Failed to extract data from all receipts. Please try again with clearer images.');
        setIsProcessing(false);
      } else {
        // Success or Partial Success
        setScannedItems(allExtractedItems);
        setFailedCount(failureCount);
        setIsProcessing(false);
        setMode('reviewing');
      }
    } catch (err) {
      console.error("Error processing files:", err);
      setScannerError('An unexpected error occurred while processing receipts.');
      setIsProcessing(false);
    }
  };

  const handleBulkSave = (items) => {
    const validItems = items.filter(item => {
      const amount = Number(item.amount);
      return amount && amount > 0;
    });

    if (validItems.length === 0) {
      return;
    }

    onSubmit(validItems);
  };

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <AnimatePresence mode="wait">
        {mode === 'manual' && (
          <motion.form 
            key="manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit} 
            className="section-shell section-shell-purple rounded-[32px] p-5 sm:p-7 md:p-8 flex flex-col min-h-full"
          >
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
                  <DatePicker
                    value={form.date}
                    onChange={handleChange}
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
                onClick={() => { setMode('scanning'); setScannerError(''); }}
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
          </motion.form>
        )}

        {mode === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <ReceiptScanner 
              isProcessing={isProcessing}
              error={scannerError}
              onProcessFiles={handleProcessFiles} 
              onCancel={() => setMode('manual')} 
            />
          </motion.div>
        )}

        {mode === 'reviewing' && (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
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

export default ExpenseForm;
