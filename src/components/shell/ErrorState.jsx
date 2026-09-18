import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Something Went Wrong',
  message = 'An unexpected error occurred while processing your request.',
  onRetry,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto w-full relative overflow-hidden my-4 border-[rgba(255,180,171,0.3)] shadow-[0_0_30px_rgba(255,180,171,0.15)]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--error)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-14 h-14 rounded-2xl bg-[rgba(255,180,171,0.15)] text-[var(--error)] flex items-center justify-center mb-4 border border-[rgba(255,180,171,0.3)] shadow-[0_0_15px_rgba(255,180,171,0.2)]">
        <AlertTriangle size={28} />
      </div>

      <h4 className="text-headline-md text-[var(--on-surface)] mb-2">{title}</h4>
      <p className="text-body-md text-[var(--error)] max-w-xs mb-6 font-medium">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary py-2.5 px-5 text-label-md flex items-center gap-2 border-[rgba(255,180,171,0.4)] text-[var(--error)] hover:bg-[rgba(255,180,171,0.1)]"
        >
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      )}
    </motion.div>
  );
}
