import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import AdviceComposer from './AdviceComposer';
import useModalDialog from '../../hooks/useModalDialog';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = Boolean(disabled || isSubmitting);
  const closeTimerRef = useRef(null);

  const safeClose = () => {
    if (isBusy) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose?.();
  };
  const sheetRef = useModalDialog(open, safeClose);

  useEffect(() => {
    if (!open && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  // Focus textarea and lock body scroll while sheet is open
  useEffect(() => {
    if (!open) return undefined;

    const focusTimer = setTimeout(() => {
      const textarea = sheetRef.current?.querySelector('textarea');
      textarea?.focus();
    }, 50);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, sheetRef]);

  const handleSubmitAndClose = async (text) => {
    if (!onSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(text);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose?.();
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.2 }}
            onClick={safeClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
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
            className="relative z-10 w-full max-w-lg mx-auto max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-[#161120] border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] pb-[max(1.5rem,env(safe-area-inset-bottom))] focus:outline-none"
          >
            {/* Drag Handle & Close Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-2.5 bg-[#161120]/95 backdrop-blur-md">
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" aria-hidden="true" />
              <h2 id="advice-sheet-title" className="text-sm font-bold text-slate-100">
                Leave Monthly Advice
              </h2>
              <button
                type="button"
                onClick={safeClose}
                disabled={isBusy}
                aria-label="Close advice composer"
                className={`w-11 h-11 sm:w-9 sm:h-9 -mr-2 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 ${FOCUS}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Composer Content */}
            <div className="px-5 pt-2">
              <AdviceComposer
                embedded
                onSubmit={handleSubmitAndClose}
                suggestedNote={suggestedNote}
                disabled={isBusy}
                name={name}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
