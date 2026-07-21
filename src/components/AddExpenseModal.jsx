import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ExpenseForm from './expenses/ExpenseForm';

export default function AddExpenseModal({ open, onClose, onAddExpense, userId }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.25 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-6"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl glass-card rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto border border-[var(--outline-variant)]/40 shadow-2xl transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start sm:items-center justify-between gap-4 border-b border-[var(--outline-variant)]/40 pb-4">
              <div>
                <h2 className="text-headline-md font-semibold text-[var(--on-surface)]">
                  Add Expense
                </h2>
                <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
                  Capture spending fast.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-4 py-2 rounded-xl text-label-md transition-all duration-300 flex items-center gap-1.5 hover:bg-[var(--surface-container-high)]"
                aria-label="Close modal"
              >
                <span>Close</span>
              </button>
            </div>
            
            <ExpenseForm onSubmit={(data) => { onAddExpense(data); onClose(); }} userId={userId} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
