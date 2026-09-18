import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Trash2, Info, Loader2, X } from 'lucide-react';

const VARIANT_CONFIGS = {
  danger: {
    eyebrow: 'DESTRUCTIVE ACTION',
    eyebrowColor: 'text-rose-400',
    iconBadge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_24px_rgba(244,63,94,0.25)]',
    pulseHalo: 'bg-rose-500/20',
    glowGradient: 'from-rose-500/20 via-rose-500/5 to-transparent',
    borderGlow: 'border-rose-500/30',
    borderAccent: 'border-l-rose-500/70',
    defaultIcon: Trash2,
    confirmButton: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:from-rose-700 active:to-red-700 text-white shadow-[0_4px_24px_rgba(244,63,94,0.4)] hover:shadow-[0_6px_28px_rgba(244,63,94,0.5)]',
  },
  warning: {
    eyebrow: 'ATTENTION REQUIRED',
    eyebrowColor: 'text-amber-400',
    iconBadge: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.25)]',
    pulseHalo: 'bg-amber-500/20',
    glowGradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    borderGlow: 'border-amber-500/30',
    borderAccent: 'border-l-amber-500/70',
    defaultIcon: AlertTriangle,
    confirmButton: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 text-white shadow-[0_4px_24px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.5)]',
  },
  info: {
    eyebrow: 'ACTION REQUIRED',
    eyebrowColor: 'text-purple-400',
    iconBadge: 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_24px_rgba(168,85,247,0.25)]',
    pulseHalo: 'bg-purple-500/20',
    glowGradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
    borderGlow: 'border-purple-500/30',
    borderAccent: 'border-l-purple-500/70',
    defaultIcon: Info,
    confirmButton: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white shadow-[0_4px_24px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_28px_rgba(168,85,247,0.5)]',
  },
};

/**
 * Parses message string to automatically highlight quoted entities or currency amounts
 */
function renderFormattedMessage(message) {
  if (typeof message !== 'string') return message;

  // Split on double quotes or parentheses to emphasize entity names
  const parts = message.split(/(".*?"|\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span key={i} className="font-semibold text-white bg-white/[0.06] px-1.5 py-0.5 rounded-md">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon: CustomIcon,
  isLoading = false,
}) {
  const reduceMotion = useReducedMotion();
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.danger;
  const IconComponent = CustomIcon || config.defaultIcon;

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop with layered dark vignette */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: 'easeOut' }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Card */}
          <motion.div
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 36, scale: 0.94 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.95 }
            }
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 380,
              mass: 0.8,
            }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className={`relative w-full sm:max-w-md bg-slate-900/98 border ${config.borderGlow} border-white/15 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] z-10 flex flex-col gap-4 backdrop-blur-2xl pb-8 sm:pb-7 overflow-hidden font-sans`}
          >
            {/* Ambient Lighting Gradient */}
            <div
              className={`absolute -top-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-br ${config.glowGradient} blur-3xl pointer-events-none`}
            />

            {/* Mobile Sheet Pull Bar */}
            <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto -mt-1.5 mb-1 sm:hidden shrink-0" />

            {/* Header: Badge Icon, Eyebrow, Title, and Close Button */}
            <div className="flex items-start gap-4">
              {/* Badge with pulse halo & spring animation */}
              <motion.div
                initial={reduceMotion ? {} : { scale: 0.5, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 16, stiffness: 280, delay: 0.05 }}
                className="relative shrink-0"
              >
                <div
                  className={`absolute -inset-1 rounded-2xl ${config.pulseHalo} blur-sm opacity-60 animate-pulse`}
                />
                <div
                  className={`relative p-3.5 rounded-2xl border shrink-0 flex items-center justify-center ${config.iconBadge}`}
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </motion.div>

              {/* Title & Eyebrow */}
              <motion.div
                initial={reduceMotion ? {} : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.08 }}
                className="flex-1 min-w-0 pt-0.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest font-mono ${config.eyebrowColor}`}
                  >
                    {config.eyebrow}
                  </span>
                </div>
                <h3
                  id="confirm-dialog-title"
                  className="text-lg sm:text-xl font-bold sm:font-extrabold text-white tracking-[-0.025em] leading-snug"
                >
                  {title}
                </h3>
              </motion.div>

              {/* Desktop / Touch Close button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={isLoading ? undefined : onClose}
                className="p-1.5 -mr-1.5 -mt-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Primary Message */}
            {message && (
              <motion.div
                initial={reduceMotion ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.1 }}
              >
                <p
                  id="confirm-dialog-description"
                  className="text-xs sm:text-[13.5px] text-slate-300/90 leading-relaxed tracking-[-0.01em] font-normal"
                >
                  {renderFormattedMessage(message)}
                </p>
              </motion.div>
            )}

            {/* Optional Secondary Description Callout */}
            {description && (
              <motion.div
                initial={reduceMotion ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.14 }}
                className={`p-3.5 rounded-xl bg-white/[0.03] border-l-2 ${config.borderAccent} border-y border-r border-white/[0.06] text-xs sm:text-[12.5px] text-slate-400/95 leading-relaxed font-medium`}
              >
                {description}
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.16 }}
              className="flex items-center gap-3 pt-2"
            >
              <motion.button
                type="button"
                whileHover={reduceMotion ? {} : { scale: 1.02 }}
                whileTap={reduceMotion ? {} : { scale: 0.97 }}
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.16] text-slate-300 hover:text-white border border-white/10 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50 text-center min-h-[46px] tracking-[-0.01em]"
              >
                {cancelText}
              </motion.button>
              <motion.button
                type="button"
                whileHover={reduceMotion ? {} : { scale: 1.02 }}
                whileTap={reduceMotion ? {} : { scale: 0.97 }}
                onClick={onConfirm}
                disabled={isLoading}
                autoFocus
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-h-[46px] tracking-[-0.01em] ${config.confirmButton}`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <span>{confirmText}</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
