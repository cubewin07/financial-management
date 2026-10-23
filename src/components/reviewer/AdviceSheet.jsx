import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import AdviceComposer from './AdviceComposer';
import { FOCUS } from './styles';

export default function AdviceSheet({
  open = false,
  onClose,
  onSubmit,
  suggestedNote,
  disabled,
  name,
}) {
  const reduceMotion = useReducedMotion();

  // Esc key and body scroll lock
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const handleSubmitAndClose = async (text) => {
    if (onSubmit) {
      await onSubmit(text);
      if (onClose) onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="advice-sheet-title"
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 350,
              duration: reduceMotion ? 0.05 : 0.25,
            }}
            className="relative z-[60] w-full max-w-lg mx-auto max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-[#161120] border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Drag Handle & Close Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-4 pb-2 bg-[#161120]/95 backdrop-blur-md">
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <h2 id="advice-sheet-title" className="text-sm font-bold text-slate-100">
                Leave Monthly Advice
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close advice composer"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer ${FOCUS}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Composer Content */}
            <div className="px-5 pt-2">
              <AdviceComposer
                onSubmit={handleSubmitAndClose}
                suggestedNote={suggestedNote}
                disabled={disabled}
                name={name}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
