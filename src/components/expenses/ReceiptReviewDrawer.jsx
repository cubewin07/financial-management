import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isValid, parseISO } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Check, Trash2, Plus, Store, Calendar, FileText, AlertCircle } from 'lucide-react';
import { CATEGORIES, formatCurrency, getLocalDateString, getCurrencySymbol, roundCurrency } from '../../utils/finance';
import { useConfirm } from '../../context/ConfirmationContext';
import useModalDialog from '../../hooks/useModalDialog';
import { CustomSelect } from '../ui/forms';

function normalizeCategory(rawCategory) {
  if (!rawCategory) return 'Other';
  const lower = String(rawCategory).trim().toLowerCase();
  const matched = CATEGORIES.find((c) => c.toLowerCase() === lower);
  return matched || (CATEGORIES.includes('Other') ? 'Other' : CATEGORIES[0] || 'Other');
}

function normalizeReceiptItemDate(rawDate, fallbackDate = null) {
  for (const candidate of [rawDate, fallbackDate]) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && isValid(parseISO(trimmed))) {
        return trimmed;
      }
    }
  }
  return getLocalDateString();
}

const CATEGORY_SELECT_OPTIONS = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

export default function ReceiptReviewDrawer({
  isOpen,
  onClose,
  receipts = [],
  onApproveReceipt,
  onDismissReceipt,
  defaultCurrency = 'NZD',
}) {
  const confirm = useConfirm();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingItems, setEditingItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const loadedKeyRef = useRef(null);
  const customIdRef = useRef(0);

  const safeIndex = Math.min(activeIndex, Math.max(0, receipts.length - 1));
  const currentReceipt = receipts[safeIndex];
  const safeClose = () => {
    if (isSubmitting || isConfirming) return;
    onClose?.();
  };
  const dialogRef = useModalDialog(
    isOpen && receipts.length > 0 && !isConfirming && !isSubmitting,
    safeClose,
  );

  // Sync parent open state when queue drains externally so drawer doesn't pop open later
  useEffect(() => {
    if (isOpen && receipts.length === 0) {
      onClose?.();
    }
  }, [isOpen, receipts.length, onClose]);

  // Load items only when the drawer opens or switches to a different receipt ID so queue refreshes do not wipe edits.
  useEffect(() => {
    if (!isOpen || !currentReceipt) {
      loadedKeyRef.current = null;
      if (receipts.length === 0) {
        setEditingItems([]);
      }
      return;
    }

    if (loadedKeyRef.current === currentReceipt.id) return;
    loadedKeyRef.current = currentReceipt.id;
    setActionError('');

    const items = (currentReceipt?.extracted_data?.items || []).map((it, idx) => {
      const itemTitle = (it.item || it.name || it.note || it.description || 'Item').trim();
      const rawNote = (it.note || '').trim();
      const itemNote = rawNote && rawNote.toLowerCase() !== itemTitle.toLowerCase() ? rawNote : '';
      const parsedAmount = Number(it.amount);
      return {
        id: it.id || `item-${currentReceipt.id}-${idx}`,
        item: itemTitle,
        amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? String(roundCurrency(parsedAmount)) : '',
        category: normalizeCategory(it.category),
        date: normalizeReceiptItemDate(it.date, currentReceipt.extracted_data?.date),
        note: itemNote,
        isAddingNote: Boolean(itemNote),
      };
    });
    setEditingItems(items);
  }, [isOpen, currentReceipt, receipts.length]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen && receipts.length > 0) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, receipts.length]);

  const vendor = currentReceipt?.extracted_data?.vendor || 'Unknown Vendor';
  const displayReceiptDate = currentReceipt?.extracted_data?.date || 'Today';
  const isoReceiptDate = normalizeReceiptItemDate(currentReceipt?.extracted_data?.date);

  const receiptTotal = roundCurrency(
    editingItems.reduce((sum, item) => {
      const val = Number(item.amount);
      return sum + (Number.isFinite(val) && val > 0 ? val : 0);
    }, 0)
  );

  const handleItemChange = (index, field, value) => {
    if (actionError) setActionError('');
    setEditingItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    if (actionError) setActionError('');
    setEditingItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    if (actionError) setActionError('');
    customIdRef.current += 1;
    const defaultNote = vendor !== 'Unknown Vendor' ? vendor : '';
    setEditingItems((prev) => [
      ...prev,
      {
        id: `custom-${customIdRef.current}`,
        item: 'New item',
        amount: '',
        category: CATEGORIES[0] || 'Food',
        date: isoReceiptDate,
        note: defaultNote,
        isAddingNote: Boolean(defaultNote),
      },
    ]);
  };

  const handleApproveCurrent = async () => {
    if (!currentReceipt || editingItems.length === 0 || isSubmitting) return;
    setActionError('');

    const sanitizedItems = [];
    for (let i = 0; i < editingItems.length; i += 1) {
      const it = editingItems[i];
      const numAmount = Number(it.amount);
      const roundedAmount = Number.isFinite(numAmount) ? roundCurrency(numAmount) : 0;
      if (!Number.isFinite(numAmount) || roundedAmount <= 0) {
        setActionError(`Item #${i + 1} ("${it.item || 'Untitled'}") needs an amount greater than zero.`);
        return;
      }
      sanitizedItems.push({
        ...it,
        item: (it.item || '').trim() || it.category || 'Item',
        amount: roundedAmount,
        category: normalizeCategory(it.category),
        date: normalizeReceiptItemDate(it.date, isoReceiptDate),
      });
    }

    setIsSubmitting(true);
    try {
      const result = await onApproveReceipt(currentReceipt.id, sanitizedItems);
      if (result === false || result?.error) {
        setActionError(result?.error?.message || 'Could not approve this receipt. Please try again.');
        return;
      }
      if (safeIndex >= receipts.length - 1) {
        setActiveIndex(Math.max(0, receipts.length - 2));
      }
      if (receipts.length <= 1) {
        onClose();
      }
    } catch (err) {
      setActionError(err?.message || 'Failed to approve receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissCurrent = async () => {
    if (!currentReceipt || isSubmitting || isConfirming) return;
    setIsConfirming(true);
    let confirmed = false;
    try {
      confirmed = await confirm({
        title: 'Discard Receipt',
        message: `Are you sure you want to discard the receipt from "${vendor}"?`,
        description: 'This receipt will be permanently removed from your review queue.',
        confirmText: 'Discard Receipt',
        cancelText: 'Keep Receipt',
        variant: 'danger',
      });
    } finally {
      setIsConfirming(false);
    }

    if (confirmed) {
      setActionError('');
      setIsSubmitting(true);
      try {
        const result = await onDismissReceipt(currentReceipt.id);
        if (result === false || result?.error) {
          setActionError(result?.error?.message || 'Could not discard this receipt. Please try again.');
          return;
        }
        if (safeIndex >= receipts.length - 1) {
          setActiveIndex(Math.max(0, receipts.length - 2));
        }
        if (receipts.length <= 1) {
          onClose();
        }
      } catch (err) {
        setActionError(err?.message || 'Failed to discard receipt. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && receipts.length > 0 && (
        <div className="fixed inset-0 z-[180] flex justify-end overflow-hidden">
          {/* Backdrop dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
            onClick={safeClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer panel */}
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={reduceMotion ? { duration: 0.12 } : { type: 'spring', damping: 28, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
            aria-label="Receipt Review Drawer"
            className="outline-none relative z-10 flex h-full w-full max-w-lg flex-col bg-slate-900 border-l border-white/10 shadow-2xl overflow-hidden"
          >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Store className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-100 truncate">{vendor}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {displayReceiptDate}
                  </span>
                  <span>•</span>
                  <span className="tabular-nums">{receipts.length} in queue</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleDismissCurrent}
                disabled={isSubmitting}
                title="Discard this receipt"
                aria-label={`Discard receipt from ${vendor}`}
                className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={safeClose}
                disabled={isSubmitting}
                aria-label="Close review drawer"
                className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Receipt selector if multiple */}
          {receipts.length > 1 && (
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b border-white/5 bg-slate-950/40 overflow-x-auto no-scrollbar">
              {receipts.map((r, idx) => {
                const isActive = idx === safeIndex;
                const v = r.extracted_data?.vendor || `Receipt #${idx + 1}`;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isSubmitting}
                    aria-pressed={isActive}
                    onClick={() => setActiveIndex(idx)}
                    className={`min-h-[44px] sm:min-h-[32px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all disabled:opacity-50 ${
                      isActive
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{v}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Line Items List (High density on mobile) */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Extracted Items ({editingItems.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="min-h-[44px] sm:min-h-[32px] px-2.5 inline-flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors rounded-lg hover:bg-purple-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {editingItems.map((item, idx) => {
                const hasNote = Boolean(item.note?.trim() || item.isAddingNote);
                const itemLabel = item.item || `item ${idx + 1}`;

                return (
                  <div
                    key={item.id || idx}
                    className="rounded-xl border border-white/[0.08] bg-slate-950/40 hover:bg-slate-950/60 p-3 hover:border-purple-500/30 focus-within:border-purple-500/40 focus-within:bg-purple-950/10 transition-all shadow-sm"
                  >
                    {/* Main Row: Title on Left, Amount & Delete on Right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                          placeholder="Item or product name"
                          aria-label={`Item ${idx + 1} name`}
                          className="w-full bg-transparent text-base sm:text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:text-purple-200 border-b border-transparent focus:border-purple-500/50 pb-0.5 transition-colors"
                        />
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                        {/* Price Input with tight currency adornment */}
                        <div className="flex items-center gap-1 bg-slate-900/80 hover:bg-slate-900 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 rounded-lg px-2 py-1 border border-white/10 transition-all">
                          <span className="text-xs font-semibold text-purple-400/80">{getCurrencySymbol(defaultCurrency)}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                            aria-label={`Amount for ${itemLabel}`}
                            className="w-20 bg-transparent text-right text-base sm:text-xs font-bold font-mono text-slate-100 focus:outline-none tabular-nums"
                          />
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                          aria-label={`Remove ${itemLabel}`}
                          className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Secondary Row: Category Select & Note Trigger */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/[0.04]">
                        <div className="w-40 sm:w-44">
                          <CustomSelect
                            ariaLabel={`Category for ${itemLabel}`}
                            options={CATEGORY_SELECT_OPTIONS}
                            value={item.category || 'Other'}
                            onChange={(val) => handleItemChange(idx, 'category', val)}
                          />
                        </div>

                        {/* Add Note Button if no note */}
                        {!hasNote && (
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'isAddingNote', true)}
                            className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[28px] text-[11px] font-medium text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add note</span>
                          </button>
                        )}
                      </div>

                    {/* Note Input Row (Only shown if note exists or user tapped Add note) */}
                    {hasNote && (
                      <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/5 focus-within:border-purple-500/40 focus-within:bg-purple-950/20 transition-all">
                        <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <input
                          type="text"
                          value={item.note || ''}
                          onFocus={() => {
                            if (!item.isAddingNote) handleItemChange(idx, 'isAddingNote', true);
                          }}
                          onChange={(e) => {
                            if (!item.isAddingNote) handleItemChange(idx, 'isAddingNote', true);
                            handleItemChange(idx, 'note', e.target.value);
                          }}
                          placeholder="Add note (e.g. snack for work, doctor advice)..."
                          aria-label={`Note for ${itemLabel}`}
                          autoFocus={item.isAddingNote && !item.note}
                          className="w-full bg-transparent text-base sm:text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleItemChange(idx, 'note', '');
                            handleItemChange(idx, 'isAddingNote', false);
                          }}
                          aria-label={`Clear note for ${itemLabel}`}
                          className="min-w-[44px] min-h-[44px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors rounded-md"
                          title="Clear note"
                        >
                          <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {editingItems.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No items on this receipt. Tap &ldquo;Add Item&rdquo; to add manually or discard receipt.
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="border-t border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 space-y-2.5">
            {actionError && (
              <p role="alert" className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{actionError}</span>
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Extracted:</span>
              <span className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                {formatCurrency(receiptTotal, defaultCurrency)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={safeClose}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleApproveCurrent}
                disabled={isSubmitting || editingItems.length === 0}
                className="flex-[2] min-h-[44px] py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white shadow-[0_0_20px_rgba(147,51,234,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding to Ledger...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Add to Ledger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>,
  document.body
);
}
