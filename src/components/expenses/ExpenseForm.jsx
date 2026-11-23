import { useState, useEffect, useRef } from 'react';
import { isValid, parseISO } from 'date-fns';
import { CATEGORIES, createExpense, formatStorageMb, getLocalDateString, roundCurrency } from '../../utils/finance';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ReceiptScanner from './ReceiptScanner';
import BulkReviewForm from './BulkReviewForm';
import { ReceiptLLMProvider } from '../../lib/ReceiptLLMProvider';
import { CustomNumberInput, CustomSelect, CustomInput, CustomDatePicker } from '../ui/forms';
import useReceiptUploader from '../../hooks/useReceiptUploader';
import { compressReceiptImage } from '../../utils/imageCompression';
import { UploadCloud, AlertCircle, PenLine, Receipt, Check } from 'lucide-react';

function normalizeCategory(rawCategory) {
  if (!rawCategory) return CATEGORIES[0] || 'Other';
  const lower = String(rawCategory).trim().toLowerCase();
  const matched = CATEGORIES.find((c) => c.toLowerCase() === lower);
  return matched || (CATEGORIES.includes('Other') ? 'Other' : CATEGORIES[0] || 'Other');
}

function normalizeDate(rawDate) {
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    const parsed = parseISO(rawDate.trim());
    if (isValid(parsed)) return rawDate.trim();
  }
  return getLocalDateString();
}

export default function ExpenseForm({ onSubmit, onCancel, userId = 'local-owner', isSubmitting = false, onReceiptQueued, defaultCurrency }) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [scanKey, setScanKey] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [scannerError, setScannerError] = useState('');

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
    uploadReceipts,
    isUploading: isUploadingReceipt,
    statusMessage,
  } = useReceiptUploader();

  const [form, setForm] = useState({
    amount: '',
    category: CATEGORIES[0] || 'Food',
    date: getLocalDateString(),
    note: '',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const llmProviderRef = useRef(null);
  const scanGenRef = useRef(0);
  const isBusy = isProcessing || isUploadingReceipt || isSaving || isSubmitting;

  const getLlmProvider = () => {
    if (!llmProviderRef.current) {
      llmProviderRef.current = new ReceiptLLMProvider();
    }
    return llmProviderRef.current;
  };

  const submitExpense = async (payload, setFailure) => {
    setIsSaving(true);
    setFailure('');
    try {
      const result = await onSubmit(payload);
      if (result === false || result?.error) {
        setFailure(result?.error?.message || 'Could not save. Please try again.');
      }
    } catch (err) {
      setFailure(err?.message || 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryOptions = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

  const handleModeSwitch = (nextMode) => {
    if (isBusy) return;
    scanGenRef.current += 1;
    setMode(nextMode);
    setError('');
    setBulkError('');
    setScannerError('');
    setQueueMessage('');
    setIsQueueError(false);
    setQueueSuccess(false);
  };

  const handleFilesChange = (newFiles) => {
    setReceiptFiles(newFiles);
    if (newFiles.length > 0) {
      setQueueMessage('');
      setIsQueueError(false);
      setQueueSuccess(false);
      setScannerError('');
    }
  };

  const handleQueueReceiptFiles = async (files) => {
    if (!files || files.length === 0 || isUploadingReceipt || isProcessing) return;
    setQueueMessage('');
    setIsQueueError(false);
    setQueueSuccess(false);

    try {
      const summary = await uploadReceipts(files, userId, (progress) => {
        if (files.length > 1) {
          setQueueMessage(`Queueing receipt ${progress.current} of ${progress.total}...`);
        }
      });

      setReceiptFiles(summary.failedFiles);

      if (summary.failCount === 0) {
        const dynamicMb = formatStorageMb(summary.totalUploadedBytes);
        setQueueSuccess(true);
        setIsQueueError(false);
        setQueueMessage(
          files.length === 1
            ? `✓ Receipt queued for evening agent processing! (${dynamicMb} retained)`
            : `✓ All ${files.length} receipts queued for evening agent processing! (${dynamicMb} retained)`
        );
        if (onReceiptQueued) {
          onReceiptQueued();
        }
      } else if (summary.successCount > 0) {
        setIsQueueError(true);
        setQueueSuccess(false);
        setQueueMessage(
          `Queued ${summary.successCount} receipt(s), but ${summary.failCount} failed: ${summary.lastErrorMessage}`
        );
        if (onReceiptQueued) {
          onReceiptQueued();
        }
      } else {
        setIsQueueError(true);
        setQueueSuccess(false);
        const msg = summary.lastErrorMessage || 'Upload failed: unable to queue receipt.';
        setQueueMessage(msg.startsWith('Please') ? msg : `Upload failed: ${msg}`);
      }
    } catch (err) {
      setIsQueueError(true);
      setQueueSuccess(false);
      const msg = err?.message || 'Upload failed: unable to queue receipt.';
      setQueueMessage(msg.startsWith('Please') ? msg : `Upload failed: ${msg}`);
    }
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
      const isValidDrop = checkDragItemsValid(e.dataTransfer.items);
      setDragValidation(isValidDrop ? 'valid' : 'invalid');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const isValidDrop = checkDragItemsValid(e.dataTransfer.items);
    e.dataTransfer.dropEffect = isValidDrop ? 'copy' : 'none';
    if (!dragValidation) {
      setDragValidation(isValidDrop ? 'valid' : 'invalid');
    }
  };

  const handleDropGlobal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragValidation(null);
    if (isBusy) return;

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
    if (isSaving || isSubmitting) return;
    const rawAmount = Number(form.amount);
    const roundedAmount = Number.isFinite(rawAmount) ? roundCurrency(rawAmount) : 0;
    if (!Number.isFinite(rawAmount) || roundedAmount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!form.date) {
      setError('Select an expense date.');
      return;
    }
    submitExpense(
      createExpense({
        amount: roundedAmount,
        category: normalizeCategory(form.category),
        date: normalizeDate(form.date),
        note: form.note,
      }, userId),
      setError,
    );
  };

  const handleProcessFiles = async (files) => {
    if (!files || files.length === 0 || isProcessing || isUploadingReceipt) return;
    const scanGen = ++scanGenRef.current;
    setIsProcessing(true);
    setScannerError('');
    setFailedCount(0);
    setBulkError('');
    try {
      // Compress one file at a time: decoding several photos at once can exhaust iPhone memory.
      const results = [];
      const provider = getLlmProvider();
      for (const f of files) {
        if (scanGenRef.current !== scanGen) return;
        let fileForScan = f;
        try {
          const { file: compressedFile } = await compressReceiptImage(f);
          fileForScan = compressedFile || f;
        } catch {
          // Compression is an optimisation; scan the original if it fails.
        }
        try {
          results.push({ status: 'fulfilled', value: await provider.parseReceipt(fileForScan) });
        } catch (reason) {
          results.push({ status: 'rejected', reason });
        }
      }
      if (scanGenRef.current !== scanGen) return;
      const extracted = [];
      let fails = 0;
      let lastErr = null;
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          if (res.value.error) {
            fails++;
            lastErr = res.value.error;
          } else if (res.value.items?.length > 0) {
            res.value.items.forEach((item) => {
              const parsedAmount = Number(item.amount);
              extracted.push({
                ...item,
                amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? roundCurrency(parsedAmount) : '',
                category: normalizeCategory(item.category),
                date: normalizeDate(item.date),
                note: item.note || '',
              });
            });
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
        setScanKey((k) => k + 1);
        setFailedCount(fails);
        setIsProcessing(false);
        setMode('reviewing');
      }
    } catch (err) {
      if (scanGenRef.current !== scanGen) return;
      setScannerError(err?.message || 'Unexpected error.');
      setIsProcessing(false);
    }
  };

  const handleBulkSave = (items) => {
    if (isSaving || isSubmitting) return;
    if (!items || items.length === 0) {
      setBulkError('Add at least one item before saving.');
      return;
    }

    const normalized = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const rawAmount = Number(item.amount);
      const roundedAmount = Number.isFinite(rawAmount) ? roundCurrency(rawAmount) : 0;
      if (!Number.isFinite(rawAmount) || roundedAmount <= 0) {
        setBulkError(`Item #${i + 1} needs an amount greater than zero (or remove it).`);
        return;
      }
      if (!item.date) {
        setBulkError(`Item #${i + 1} needs a date.`);
        return;
      }
      normalized.push(
        createExpense({
          amount: roundedAmount,
          category: normalizeCategory(item.category),
          date: normalizeDate(item.date),
          note: item.note || '',
        }, userId)
      );
    }

    submitExpense(normalized, setBulkError);
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
            const isValidDrop = checkDragItemsValid(e.dataTransfer.items);
            e.dataTransfer.dropEffect = isValidDrop ? 'copy' : 'none';
            if (!isValidDrop && dragValidation !== 'invalid') {
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
      <div
        role="group"
        aria-label="Expense entry mode"
        className="relative flex items-center p-1 sm:p-1.5 rounded-2xl bg-black/40 border border-white/[0.08] mb-5 sm:mb-6 backdrop-blur-md shadow-inner"
      >
        {[
          { id: 'manual', label: 'Manual Entry', icon: PenLine },
          { id: 'scanning', label: 'Drop or Choose Receipt', icon: Receipt },
        ].map((tab) => {
          const isActive = mode === tab.id || (mode === 'reviewing' && tab.id === 'scanning');
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              disabled={isBusy}
              onClick={() => handleModeSwitch(tab.id)}
              className={`relative flex-1 min-h-[44px] py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 select-none disabled:opacity-60 disabled:cursor-not-allowed ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={reduceMotion ? undefined : 'activeExpenseModePill'}
                  className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-colors z-10 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="z-10 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'manual' && (
          <motion.form
            key="manual"
            initial={reduceMotion ? false : { opacity: 0, x: -14, filter: 'blur(3px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 14, filter: 'blur(3px)' }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 sm:gap-6"
          >
            <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
              <CustomNumberInput
                currency={defaultCurrency}
                label="Amount"
                value={form.amount}
                onChange={(e) => {
                  if (error) setError('');
                  setForm((prev) => ({ ...prev, amount: e.target.value }));
                }}
                min={0}
                placeholder="0.00"
              />

              <CustomSelect
                label="Category"
                options={categoryOptions}
                value={form.category}
                onChange={(val) => {
                  if (error) setError('');
                  setForm((prev) => ({ ...prev, category: val }));
                }}
              />

              <div className="sm:col-span-2">
                <CustomInput
                  label="Note (optional)"
                  value={form.note}
                  onChange={(e) => {
                    if (error) setError('');
                    setForm((prev) => ({ ...prev, note: e.target.value }));
                  }}
                  placeholder="What was this for?"
                />
              </div>

              <div className="sm:col-span-2">
                <CustomDatePicker
                  label="Date"
                  value={form.date}
                  onChange={(val) => {
                    if (error) setError('');
                    setForm((prev) => ({ ...prev, date: val }));
                  }}
                  required
                />
              </div>
            </div>

            {error && <p role="alert" className="text-sm font-medium text-red-400">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-1 sm:mt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting || isSaving}
                  className="min-h-[44px] px-5 py-3 rounded-xl font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 hover:border-white/20 transition-all duration-200 text-sm cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || isSaving}
                className="flex-1 min-h-[44px] py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:via-teal-300 hover:to-cyan-400 active:scale-[0.98] text-slate-950 shadow-[0_0_25px_rgba(0,238,252,0.35)] hover:shadow-[0_0_35px_rgba(0,238,252,0.5)] transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isSaving ? 'Saving...' : 'Save Expense'}</span>
              </button>
            </div>
          </motion.form>
        )}

        {mode === 'scanning' && (
          <motion.div
            key="scanning"
            initial={reduceMotion ? false : { opacity: 0, x: 14, filter: 'blur(3px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -14, filter: 'blur(3px)' }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <ReceiptScanner
              files={receiptFiles}
              onFilesChange={handleFilesChange}
              onScan={handleProcessFiles}
              onQueue={handleQueueReceiptFiles}
              onCancel={() => handleModeSwitch('manual')}
              isProcessing={isProcessing}
              isQueueing={isUploadingReceipt}
              queueStatus={isUploadingReceipt ? statusMessage : (queueMessage || statusMessage)}
              queueSuccess={queueSuccess}
              isQueueError={isQueueError}
              error={scannerError}
            />
          </motion.div>
        )}

        {mode === 'reviewing' && (
          <motion.div key="reviewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BulkReviewForm
              key={scanKey}
              defaultCurrency={defaultCurrency}
              initialItems={scannedItems}
              failedCount={failedCount}
              saveError={bulkError}
              isSaving={isSaving || isSubmitting}
              onClearError={() => setBulkError('')}
              onSave={handleBulkSave}
              onCancel={() => handleModeSwitch('manual')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
