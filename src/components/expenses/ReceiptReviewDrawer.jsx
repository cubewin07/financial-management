import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Plus, Store, Calendar, ArrowRight, DollarSign, FileText, ChevronDown } from 'lucide-react';
import { CATEGORIES, formatCurrency, getCategoryColor, getCategoryBadgeStyle } from '../../utils/finance';
import { useConfirm } from '../../context/ConfirmationContext';

export default function ReceiptReviewDrawer({
  isOpen,
  onClose,
  receipts = [],
  onApproveReceipt,
  onDismissReceipt,
  defaultCurrency = 'NZD',
}) {
  const confirm = useConfirm();
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingItems, setEditingItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(null);

  // Sync active receipt items when activeIndex or receipts change
  useEffect(() => {
    if (receipts.length > 0) {
      const current = receipts[Math.min(activeIndex, receipts.length - 1)];
      const items = (current?.extracted_data?.items || []).map((it, idx) => {
        const itemTitle = (it.item || it.name || it.note || it.description || 'Item').trim();
        const rawNote = (it.note || '').trim();
        // If note is explicitly distinct from title, preserve it; otherwise empty string for clean placeholder
        const itemNote = rawNote && rawNote.toLowerCase() !== itemTitle.toLowerCase() ? rawNote : '';
        return {
          id: it.id || `item-${idx}-${Date.now()}`,
          item: itemTitle,
          amount: String(it.amount || 0),
          category: it.category || 'Other',
          date: it.date || current.extracted_data?.date || new Date().toISOString().slice(0, 10),
          note: itemNote,
        };
      });
      setEditingItems(items);
    } else {
      setEditingItems([]);
    }
  }, [activeIndex, receipts]);

  // Lock background scroll when drawer is open & handle Escape key navigation
  useEffect(() => {
    if (isOpen && receipts.length > 0) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (activeCategoryIdx !== null) {
            setActiveCategoryIdx(null);
          } else if (onClose) {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, receipts.length, activeCategoryIdx, onClose]);

  const currentReceipt = receipts[Math.min(activeIndex, Math.max(0, receipts.length - 1))];
  const vendor = currentReceipt?.extracted_data?.vendor || 'Unknown Vendor';
  const receiptDate = currentReceipt?.extracted_data?.date || 'Today';

  const receiptTotal = editingItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleItemChange = (index, field, value) => {
    setEditingItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    setEditingItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    setEditingItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        item: 'New item',
        amount: '0.00',
        category: CATEGORIES[0] || 'Food',
        date: receiptDate,
        note: vendor,
      },
    ]);
  };

  const handleApproveCurrent = async () => {
    if (!currentReceipt || editingItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await onApproveReceipt(currentReceipt.id, editingItems);
      if (activeIndex >= receipts.length - 1) {
        setActiveIndex(Math.max(0, receipts.length - 2));
      }
      if (receipts.length <= 1) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to approve receipt:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissCurrent = async () => {
    if (!currentReceipt) return;
    const confirmed = await confirm({
      title: 'Discard Receipt',
      message: `Are you sure you want to discard the receipt from "${vendor}"?`,
      description: 'This receipt will be permanently removed from your review queue.',
      confirmText: 'Discard Receipt',
      cancelText: 'Keep Receipt',
      variant: 'danger',
    });

    if (confirmed) {
      setIsSubmitting(true);
      try {
        await onDismissReceipt(currentReceipt.id);
        if (activeIndex >= receipts.length - 1) {
          setActiveIndex(Math.max(0, receipts.length - 2));
        }
        if (receipts.length <= 1) {
          onClose();
        }
      } catch (err) {
        console.error('Failed to dismiss receipt:', err);
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col bg-slate-900 border-l border-white/10 shadow-2xl overflow-hidden"
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
                    {receiptDate}
                  </span>
                  <span>•</span>
                  <span>{receipts.length} in queue</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDismissCurrent}
                disabled={isSubmitting}
                title="Discard this receipt"
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Receipt selector if multiple */}
          {receipts.length > 1 && (
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b border-white/5 bg-slate-950/40 overflow-x-auto no-scrollbar">
              {receipts.map((r, idx) => {
                const isActive = idx === activeIndex;
                const v = r.extracted_data?.vendor || `Receipt #${idx + 1}`;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
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
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Extracted Items ({editingItems.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {editingItems.map((item, idx) => {
                const hasNote = Boolean(item.note?.trim() || item.isAddingNote);

                return (
                  <div
                    key={item.id || idx}
                    className="rounded-xl border border-white/[0.08] bg-slate-950/40 hover:bg-slate-950/60 p-3 hover:border-purple-500/30 focus-within:border-purple-500/40 focus-within:bg-purple-950/10 transition-all shadow-sm"
                  >
                    {/* Main Row: Title on Left, Amount & Delete on Right */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                          placeholder="Item or product name"
                          className="w-full bg-transparent text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:text-purple-200 border-b border-transparent focus:border-purple-500/50 pb-0.5 transition-colors"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Price Input with tight dollar adornment */}
                        <div className="flex items-center gap-1 bg-slate-900/80 hover:bg-slate-900 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 rounded-lg px-2 py-1 border border-white/10 transition-all">
                          <span className="text-xs font-semibold text-purple-400/80">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                            className="w-14 sm:w-16 bg-transparent text-right text-xs font-bold font-mono text-slate-100 focus:outline-none"
                          />
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Secondary Row: Category Popover Badge & Note Trigger */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/[0.04]">
                        {/* Self-contained Category Badge & Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCategoryIdx(activeCategoryIdx === idx ? null : idx);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all hover:brightness-110 active:scale-95 shadow-sm"
                            style={getCategoryBadgeStyle(item.category)}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: getCategoryColor(item.category) }}
                            />
                            <span>{item.category || 'Other'}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
                                activeCategoryIdx === idx ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {activeCategoryIdx === idx && (
                            <>
                              {/* Backdrop dismiss */}
                              <div
                                className="fixed inset-0 z-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCategoryIdx(null);
                                }}
                              />
                              {/* Dropdown Menu (opens upward if near bottom to prevent container clipping) */}
                              <div className={`absolute left-0 ${idx >= editingItems.length - 2 && editingItems.length > 2 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-48 p-1.5 rounded-xl border border-white/10 bg-slate-900/98 shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-2xl z-40 animate-in fade-in zoom-in-95 duration-100`}>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-0.5">
                                  Select Category
                                </div>
                                <div className="space-y-0.5 max-h-52 overflow-y-auto no-scrollbar">
                                  {CATEGORIES.map((cat) => {
                                    const isSelected =
                                      (item.category || '').toLowerCase() === cat.toLowerCase();
                                    return (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleItemChange(idx, 'category', cat);
                                          setActiveCategoryIdx(null);
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                          isSelected
                                            ? 'bg-purple-600/30 text-purple-200 font-semibold'
                                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: getCategoryColor(cat) }}
                                          />
                                          <span>{cat}</span>
                                        </div>
                                        {isSelected && (
                                          <Check className="w-3.5 h-3.5 text-purple-400" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Add Note Button if no note */}
                        {!hasNote && (
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'isAddingNote', true)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 py-0.5 rounded-md transition-colors"
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
                          onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                          placeholder="Add note (e.g. snack for work, doctor advice)..."
                          autoFocus={item.isAddingNote && !item.note}
                          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleItemChange(idx, 'note', '');
                            handleItemChange(idx, 'isAddingNote', false);
                          }}
                          className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
                          title="Clear note"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {editingItems.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No items on this receipt. Tap &ldquo;Add Item&rdquo; to add manually or discard receipt.
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="border-t border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 sm:px-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">Total Extracted:</span>
              <span className="text-lg font-bold text-slate-100 font-mono">
                {formatCurrency(receiptTotal, defaultCurrency)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleApproveCurrent}
                disabled={isSubmitting || editingItems.length === 0}
                className="flex-[2] py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white shadow-[0_0_20px_rgba(147,51,234,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding to Ledger...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Add to Ledger</span>
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
