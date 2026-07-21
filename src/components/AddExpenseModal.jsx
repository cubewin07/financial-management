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
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-[var(--surface-container-lowest)]/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
            className="w-full max-w-2xl glass-card rounded-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-headline-md text-[var(--on-surface)]">
                  Add Expense
                </h2>
                <p className="text-body-md text-[var(--on-surface-variant)] mt-1">
                  Capture spending fast.
                </p>
              </div>
              <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-label-md">
                Close
              </button>
            </div>
            
            <ExpenseForm onSubmit={(data) => { onAddExpense(data); onClose(); }} userId={userId} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
