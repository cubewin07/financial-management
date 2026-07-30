import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CustomTextarea } from '../ui/forms';

export default function MonthlyNoteModal({ open, monthLabel, initialBody, onSave, onClose }) {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(initialBody || '');
    }
  }, [open, initialBody]);

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Monthly Review Note
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Leave a note for {monthLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <CustomTextarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Share your feedback or notes for this month..."
              />
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all text-sm"
                >
                  Save Note
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
