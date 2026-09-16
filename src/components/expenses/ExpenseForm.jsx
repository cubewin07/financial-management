import { useState, useRef, useEffect } from 'react';
import { CATEGORIES, createExpense, formatStorageMb } from '../../utils/finance';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptScanner from './ReceiptScanner';
import BulkReviewForm from './BulkReviewForm';
import { ReceiptLLMProvider } from '../../lib/ReceiptLLMProvider';
import { CustomNumberInput, CustomSelect, CustomInput, CustomDatePicker } from '../ui/forms';
import useReceiptUploader from '../../hooks/useReceiptUploader';
import { UploadCloud, AlertCircle, PenLine, Receipt, Check } from 'lucide-react';

const llmProvider = new ReceiptLLMProvider();

export default function ExpenseForm({ onSubmit, onCancel, userId = 'local-owner', isSubmitting = false }) {
  const [mode, setMode] = useState('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [failedCount, setFailedCount] = useState(0);
  const [scannerError, setScannerError] = useState('');

  const snapInputRef = useRef(null);
  const [queueMessage, setQueueMessage] = useState('');
  const [isQueueError, setIsQueueError] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [dragValidation, setDragValidation] = useState(null); // null | 'valid' | 'invalid'

  // Reset drag overlay if mode changes
  useEffect(() => {
    setDragValidation(null);
  }, [mode]);

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

  const handleQueueReceiptFiles = async (files) => {
    if (!files || files.length === 0) return;
    setQueueMessage('');
    setIsQueueError(false);
    setQueueSuccess(false);

    let successCount = 0;
    let failCount = 0;
    let totalUploadedBytes = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (files.length > 1) {
          setQueueMessage(`Queueing receipt ${i + 1} of ${files.length}...`);
        }
        const uploadRes = await uploadReceipt(file, userId);
        totalUploadedBytes += (uploadRes?.compressedSize || file.size || 0);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to queue ${file.name}:`, err);
      }
    }

    if (failCount === 0) {
      const dynamicMb = formatStorageMb(totalUploadedBytes);
      setQueueSuccess(true);
      setQueueMessage(
        files.length === 1
          ? `✓ Receipt queued for evening agent processing! (${dynamicMb} retained)`
          : `✓ All ${files.length} receipts queued for evening agent processing! (${dynamicMb} retained)`
      );
    } else if (successCount > 0) {
      setIsQueueError(true);
      setQueueMessage(`Queued ${successCount} receipts, but ${failCount} failed.`);
    } else {
      setIsQueueError(true);
      setQueueMessage('Upload failed: unable to queue receipts.');
    }
  };

  const handleSnapFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleQueueReceiptFiles([file]);
    if (snapInputRef.current) snapInputRef.current.value = '';
  };

  const checkDragItemsValid = (items) => {
    if (!items || items.length === 0) return true;
    const fileItems = Array.from(items).filter(item => item.kind === 'file');
    if (fileItems.length === 0) return true;
    // Check if any file has a defined MIME type that is not image or PDF
    const hasIncompatible = fileItems.some(item => 
      item.type && !item.type.startsWith('image/') && item.type !== 'application/pdf'
    );
    return !hasIncompatible;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      const isValid = checkDragItemsValid(e.dataTransfer.items);
      setDragValidation(isValid ? 'valid' : 'invalid');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const isValid = checkDragItemsValid(e.dataTransfer.items);
    e.dataTransfer.dropEffect = isValid ? 'copy' : 'none';
    if (!dragValidation) {
      setDragValidation(isValid ? 'valid' : 'invalid');
    }
  };

  const handleDropGlobal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragValidation(null);

    const rawFiles = Array.from(e.dataTransfer.files || []);
    if (rawFiles.length === 0) return;

    const validFiles = rawFiles.filter(f => 
      f.type?.startsWith('image/') || f.type === 'application/pdf' || /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(f.name)
    );

    if (validFiles.length === 0) {
      setScannerError('Unsupported file type. Please drop receipt image(s) (PNG, JPG, WebP, HEIC) or PDF.');
      setMode('scanning');
      return;
    }

    setScannerError('');
    setReceiptFiles(validFiles);
    setMode('scanning');
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
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setDragValidation(null);
        }
      }}
      onDrop={handleDropGlobal}
    >
      {/* Dynamic Drag & Drop Overlay: Expands whole form into huge cyan drop zone */}
      {dragValidation && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const isValid = checkDragItemsValid(e.dataTransfer.items);
            e.dataTransfer.dropEffect = isValid ? 'copy' : 'none';
            if (!isValid && dragValidation !== 'invalid') {
              setDragValidation('invalid');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setDragValidation(null);
            }
          }}
          onDrop={handleDropGlobal}
          className={`absolute inset-0 z-50 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center text-center p-6 shadow-2xl transition-all duration-200 ${
            dragValidation === 'valid'
              ? 'bg-cyan-950/90 border-2 border-dashed border-cyan-400/80 shadow-[0_0_30px_rgba(0,238,252,0.25)] cursor-copy'
              : 'bg-rose-950/90 border-2 border-dashed border-rose-500 cursor-not-allowed'
          }`}
        >
          {dragValidation === 'valid' ? (
            <div className="pointer-events-none flex flex-col items-center">
              <div className="p-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 animate-bounce mb-3 shadow-[0_0_20px_rgba(0,238,252,0.35)]">
                <UploadCloud className="w-9 h-9" />
              </div>
              <p className="text-lg font-bold text-slate-100">Drop receipt(s) anywhere to scan or queue</p>
              <p className="text-xs text-cyan-300 mt-1">Accepts PNG, JPG, WebP, HEIC, or PDF</p>
            </div>
          ) : (
            <div className="pointer-events-none flex flex-col items-center">
              <div className="p-4 rounded-full bg-rose-500/25 text-rose-300 animate-pulse mb-3 shadow-[0_0_20px_rgba(244,63,94,0.35)]">
                <AlertCircle className="w-9 h-9" />
              </div>
              <p className="text-lg font-bold text-rose-100">Incompatible file type</p>
              <p className="text-xs text-rose-300 mt-1">Please drop receipt image(s) (PNG, JPG, WebP) or PDF only</p>
            </div>
          )}
        </div>
      )}

      {/* Sleek Segmented Mode Bar with Spring Pill Motion */}
      <div className="relative flex items-center p-1.5 rounded-2xl bg-black/40 border border-white/[0.08] mb-6 backdrop-blur-md shadow-inner">
        {[
          { id: 'manual', label: 'Manual Entry', icon: PenLine },
          { id: 'scanning', label: 'Drop or Choose Receipt', icon: Receipt },
        ].map((tab) => {
          const isActive = mode === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`relative flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 select-none ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeExpenseModePill"
                  className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Icon className={`w-4 h-4 transition-colors z-10 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'manual' && (
          <motion.form
            key="manual"
            initial={{ opacity: 0, x: -14, filter: 'blur(3px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 14, filter: 'blur(3px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-3 rounded-xl font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 hover:border-white/20 transition-all duration-200 text-sm cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:via-teal-300 hover:to-cyan-400 active:scale-[0.98] text-slate-950 shadow-[0_0_25px_rgba(0,238,252,0.35)] hover:shadow-[0_0_35px_rgba(0,238,252,0.5)] transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Expense</span>
              </button>
            </div>
          </motion.form>
        )}

        {mode === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, x: 14, filter: 'blur(3px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -14, filter: 'blur(3px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReceiptScanner 
              files={receiptFiles}
              onFilesChange={setReceiptFiles}
              onScan={handleProcessFiles}
              onQueue={handleQueueReceiptFiles}
              onCancel={() => setMode('manual')}
              isProcessing={isProcessing}
              isQueueing={isUploadingReceipt}
              queueStatus={statusMessage || queueMessage}
              queueSuccess={queueSuccess}
              error={scannerError}
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
