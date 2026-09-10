import { useState, useRef, useEffect } from 'react';
import { CATEGORIES, createExpense } from '../../utils/finance';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptScanner from './ReceiptScanner';
import BulkReviewForm from './BulkReviewForm';
import { ReceiptLLMProvider } from '../../lib/ReceiptLLMProvider';
import { CustomNumberInput, CustomSelect, CustomInput, CustomDatePicker } from '../ui/forms';
import useReceiptUploader from '../../hooks/useReceiptUploader';
import { UploadCloud } from 'lucide-react';

const llmProvider = new ReceiptLLMProvider();

export default function ExpenseForm({ onSubmit, userId = 'local-owner' }) {
  const [mode, setMode] = useState('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [failedCount, setFailedCount] = useState(0);
  const [scannerError, setScannerError] = useState('');

  const snapInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const [queueMessage, setQueueMessage] = useState('');
  const [isQueueError, setIsQueueError] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);

  // Always reset global drag overlay if mode changes or file is selected
  useEffect(() => {
    dragCounterRef.current = 0;
    setIsDraggingGlobal(false);
  }, [mode, droppedFile]);

  // Window-level safety net: any drop or dragend event resets drag state
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      dragCounterRef.current = 0;
      setIsDraggingGlobal(false);
    };

    window.addEventListener('drop', handleGlobalDragEnd);
    window.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('drop', handleGlobalDragEnd);
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  const {
    uploadReceipt,
    isUploading: isUploadingReceipt,
    statusMessage,
  } = useReceiptUploader();

  const [form, setForm] = useState({
    amount: '',
    category: CATEGORIES[0] || 'Food',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [error, setError] = useState('');

  const categoryOptions = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

  const handleQueueReceiptFile = async (file) => {
    if (!file) return;
    setQueueMessage('');
    setIsQueueError(false);
    setQueueSuccess(false);

    try {
      await uploadReceipt(file, userId);
      setQueueSuccess(true);
      setQueueMessage('✓ Receipt queued for evening agent processing! (0 MB retained)');
    } catch (err) {
      setIsQueueError(true);
      setQueueSuccess(false);
      setQueueMessage(`Upload failed: ${err.message}`);
    }
  };

  const handleSnapFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleQueueReceiptFile(file);
    if (snapInputRef.current) snapInputRef.current.value = '';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      setIsDraggingGlobal(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDraggingGlobal) {
      setIsDraggingGlobal(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingGlobal(false);
    }
  };

  const handleDropGlobal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingGlobal(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setDroppedFile(file);
      setMode('scanning');
    }
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
    <div
      className="relative w-full"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropGlobal}
    >
      {/* Global Drag & Drop Overlay: Expands whole form into huge purple drop zone */}
      {isDraggingGlobal && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current = 0;
            setIsDraggingGlobal(false);
          }}
          onDrop={handleDropGlobal}
          className="absolute inset-0 z-50 rounded-2xl bg-purple-950/90 border-2 border-dashed border-purple-400 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 cursor-copy shadow-2xl"
        >
          <div className="p-4 rounded-full bg-purple-500/25 text-purple-300 animate-bounce mb-3 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <UploadCloud className="w-9 h-9" />
          </div>
          <p className="text-lg font-bold text-slate-100">Drop receipt anywhere to scan or queue</p>
          <p className="text-xs text-purple-300 mt-1">Release to load your receipt instantly</p>
        </div>
      )}

      {/* Top Segmented Mode Bar */}
      <div className="flex items-center p-1 rounded-xl bg-slate-950/60 border border-white/10 mb-5">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'manual'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>✍️ Manual Entry</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('scanning')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'scanning'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📷 Drop or Choose Receipt</span>
        </button>
      </div>

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
            {queueMessage && (
              <p className={`text-sm font-medium ${isQueueError ? 'text-red-400' : 'text-emerald-400'}`}>
                {queueMessage}
              </p>
            )}

            {/* Hidden camera input for mobile Snap & Queue */}
            <input
              ref={snapInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleSnapFileSelected}
              disabled={isUploadingReceipt}
            />

            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setMode('scanning')}
                className="px-4 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all duration-200 flex-1 flex items-center justify-center gap-2"
              >
                <span>📷 Drop or Choose Receipt</span>
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
              initialFile={droppedFile}
              onFileSelect={(file) => {
                setDroppedFile(file);
                setIsDraggingGlobal(false);
                dragCounterRef.current = 0;
              }}
              onQueueFile={handleQueueReceiptFile}
              isQueueing={isUploadingReceipt}
              queueStatus={statusMessage || queueMessage}
              queueSuccess={queueSuccess}
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
