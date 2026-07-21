import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ExpenseForm from './ExpenseForm';

function AddExpenseModal({ open, onClose, onAddExpense, userId }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
            className="w-full max-w-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-shell section-shell-purple rounded-[32px] p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    Add Expense
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Capture spending fast.
                  </p>
                </div>
                <button type="button" onClick={onClose} className="btn-secondary h-10 min-h-[40px] px-4 rounded-full">
                  Close
                </button>
              </div>
              <ExpenseForm onSubmit={onAddExpense} userId={userId} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default AddExpenseModal;
