import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';

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
          className="fixed inset-0 z-[160] flex items-center justify-center bg-[var(--surface-container-lowest)]/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
            className="w-full max-w-lg glass-card rounded-xl p-6 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-headline-md text-[var(--on-surface)]">
                  Monthly Review Note
                </h2>
                <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
                  Leave a note for {monthLabel}
                </p>
              </div>
              <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-label-md rounded-full">
                Close
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                placeholder="Share your feedback for this month's budget..."
                className="input-shell w-full resize-none p-4"
              />
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={onClose} className="btn-secondary py-2 px-6">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} className="btn-primary py-2 px-6">
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
