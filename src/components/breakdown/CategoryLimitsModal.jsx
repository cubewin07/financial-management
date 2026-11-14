import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sliders, X, Check, Trash2 } from 'lucide-react';
import { CATEGORIES, getCategoryColor } from '../../utils/finance';
import { CustomNumberInput } from '../ui/forms';
import useModalDialog from '../../hooks/useModalDialog';

const roundCurrency = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

export default function CategoryLimitsModal({
  open,
  onClose,
  categoryLimits = {},
  onSaveCategoryLimits,
  defaultCurrency = 'NZD',
}) {
  const reduceMotion = useReducedMotion();
  const [limitsState, setLimitsState] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const wasOpenRef = useRef(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const normalized = {};
      Object.entries(categoryLimits || {}).forEach(([cat, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          normalized[cat] = String(val);
        }
      });
      setLimitsState(normalized);
      setIsSaved(false);
      setIsSaving(false);
      setSaveError('');
    }
    wasOpenRef.current = Boolean(open);
  }, [open, categoryLimits]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
  }, []);

  const dialogRef = useModalDialog(open, onClose);

  const handleLimitChange = (category, value) => {
    if (saveError) setSaveError('');
    setIsSaved(false);
    setLimitsState((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleClearCategory = (category) => {
    if (saveError) setSaveError('');
    setIsSaved(false);
    setLimitsState((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError('');

    const cleanedLimits = {};
    for (const [cat, rawVal] of Object.entries(limitsState)) {
      if (rawVal === '' || rawVal === null || rawVal === undefined) continue;
      const trimmed = String(rawVal).trim();
      if (!trimmed) continue;
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num < 0) {
        setSaveError(`Please enter a valid positive limit for ${cat}.`);
        return;
      }
      if (num > 0) {
        cleanedLimits[cat] = roundCurrency(num);
      }
    }

    if (onSaveCategoryLimits) {
      setIsSaving(true);
      try {
        const result = await onSaveCategoryLimits(cleanedLimits);
        if (result === false || result?.error) {
          setSaveError(result?.error?.message || 'Could not save your limits. Please try again.');
          return;
        }
      } catch (err) {
        setSaveError(err?.message || 'Could not save your limits. Please try again.');
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setIsSaved(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 300);
  };

  const allCategoryNames = Array.from(
    new Set([...CATEGORIES, ...Object.keys(limitsState)])
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-md px-3 sm:px-4 py-4 sm:py-6 overscroll-contain"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-limits-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-h-[90dvh] sm:max-h-[85vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 id="category-limits-title" className="text-headline-sm font-bold text-slate-100">
                    Set Category Budget Limits
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define monthly spending targets per category
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Limit Inputs Scrollable Area */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 pt-3 sm:pt-4">
              <div className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1 overscroll-contain">
                {allCategoryNames.map((catName) => {
                  const val = limitsState[catName] ?? '';
                  const numericVal = Number(val);
                  const hasValue = val !== '' && val !== null && val !== undefined && (!Number.isFinite(numericVal) || numericVal > 0);

                  return (
                    <div
                      key={catName}
                      className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                          style={{ backgroundColor: getCategoryColor(catName) }}
                        />
                        <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                          {catName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="w-28 sm:w-32">
                          <CustomNumberInput
                            currency={defaultCurrency}
                            placeholder="No limit"
                            value={val}
                            label={`${catName} limit`}
                            onChange={(e) => handleLimitChange(catName, e.target.value)}
                            min={0}
                            showStepper={false}
                          />
                        </div>

                        {hasValue && (
                          <button
                            type="button"
                            onClick={() => handleClearCategory(catName)}
                            className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove limit"
                            aria-label={`Remove ${catName} limit`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {saveError && <p role="alert" className="pt-3 text-xs text-rose-300">{saveError}</p>}

              {/* Modal Footer Actions */}
              <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/10 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSaved ? (
                    <>
                      <Check size={16} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>{isSaving ? 'Saving...' : 'Save All Limits'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
