import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ExpenseForm from './expenses/ExpenseForm';
import useModalDialog from '../hooks/useModalDialog';

export default function AddExpenseModal({ open, onClose, onAddExpense, userId, onReceiptQueued, defaultCurrency }) {
  const reduceMotion = useReducedMotion();
  const [sessionId, setSessionId] = useState(0);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open && wasOpenRef.current) {
      setSessionId((prev) => prev + 1);
    }
    wasOpenRef.current = Boolean(open);
  }, [open]);

  const dialogRef = useModalDialog(open, onClose);

  const handleModalSubmit = async (data) => {
    const result = await onAddExpense(data);
    if (result === false || result?.error) {
      throw new Error(result?.error?.message || 'Could not save expense. Please try again.');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.25 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-6 overscroll-contain"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-expense-modal-title"
            className="outline-none w-full max-w-2xl glass-card rounded-2xl p-4 sm:p-8 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain border border-[var(--outline-variant)]/40 shadow-2xl transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 sm:mb-6 flex items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-[var(--outline-variant)]/40 pb-3 sm:pb-4">
              <div>
                <h2 id="add-expense-modal-title" className="text-lg sm:text-headline-md font-semibold text-[var(--on-surface)]">
                  Add Expense
                </h2>
                <p className="text-xs sm:text-body-md text-[var(--on-surface-variant)] mt-0.5 sm:mt-1">
                  Capture spending fast.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-xl text-label-md transition-all duration-300 flex items-center gap-1.5 hover:bg-[var(--surface-container-high)] shrink-0"
                aria-label="Close modal"
              >
                <span>Close</span>
              </button>
            </div>
            
            <ExpenseForm
              key={sessionId}
              onSubmit={handleModalSubmit}
              onCancel={onClose}
              userId={userId}
              onReceiptQueued={onReceiptQueued}
              defaultCurrency={defaultCurrency}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
