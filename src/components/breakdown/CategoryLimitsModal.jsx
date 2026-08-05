import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sliders, X, Check, Trash2 } from 'lucide-react';
import { CATEGORIES, getCategoryColor } from '../../utils/finance';
import { CustomNumberInput } from '../ui/forms';

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

  useEffect(() => {
    if (open) {
      setLimitsState(categoryLimits || {});
      setIsSaved(false);
    }
  }, [open, categoryLimits]);

  const handleLimitChange = (category, value) => {
    const val = value === '' ? '' : Math.max(0, Number(value));
    setLimitsState((prev) => ({
      ...prev,
      [category]: val,
    }));
  };

  const handleClearCategory = (category) => {
    setLimitsState((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (onSaveCategoryLimits) {
      const cleanedLimits = {};
      Object.entries(limitsState).forEach(([cat, val]) => {
        if (val !== '' && val !== null && val !== undefined && Number(val) > 0) {
          cleanedLimits[cat] = Number(val);
        }
      });
      onSaveCategoryLimits(cleanedLimits);
    }
    setIsSaved(true);
    setTimeout(() => {
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
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-7 max-h-[85vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-headline-sm font-bold text-slate-100">
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
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Limit Inputs Scrollable Area */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 pt-4">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {allCategoryNames.map((catName) => {
                  const val = limitsState[catName] ?? '';
                  const hasValue = val !== '' && val !== null && val !== undefined && Number(val) > 0;

                  return (
                    <div
                      key={catName}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: getCategoryColor(catName) }}
                        />
                        <span className="text-sm font-semibold text-slate-200 truncate">
                          {catName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-32">
                          <CustomNumberInput
                            placeholder="No limit"
                            value={val}
                            onChange={(newVal) => handleLimitChange(catName, newVal)}
                            min={0}
                            step="10"
                          />
                        </div>

                        {hasValue && (
                          <button
                            type="button"
                            onClick={() => handleClearCategory(catName)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove limit"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all flex items-center gap-1.5"
                >
                  {isSaved ? (
                    <>
                      <Check size={16} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save All Limits</span>
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
