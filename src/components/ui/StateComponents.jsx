import { motion } from 'framer-motion';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export function LoadingState({ message = 'Loading financial data...' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[220px]"
    >
      <div className="w-12 h-12 rounded-full border-3 border-[rgba(208,188,255,0.2)] border-t-[var(--primary)] animate-spin mb-4 shadow-[0_0_15px_rgba(208,188,255,0.3)]" />
      <p className="text-body-md text-[var(--on-surface-variant)] font-medium">{message}</p>
    </motion.div>
  );
}

export function EmptyState({ 
  icon: Icon = Inbox, 
  title = 'No data available', 
  description = 'There are no records to display for the selected period.',
  actionLabel,
  onAction
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[220px]"
    >
      <div className="w-12 h-12 rounded-2xl bg-[rgba(208,188,255,0.1)] border border-[rgba(208,188,255,0.2)] flex items-center justify-center text-[var(--primary)] mb-4 shadow-[0_0_15px_rgba(208,188,255,0.15)]">
        <Icon size={24} />
      </div>
      <h3 className="text-headline-md text-[var(--on-surface)] mb-1">{title}</h3>
      <p className="text-body-md text-[var(--on-surface-variant)] max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary py-2 px-4 text-label-md">
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

export function ErrorState({ 
  message = 'An error occurred while loading data.', 
  onRetry 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-card p-6 border border-[rgba(255,180,171,0.3)] bg-[rgba(255,180,171,0.05)] flex flex-col items-center justify-center text-center min-h-[180px]"
    >
      <div className="w-10 h-10 rounded-full bg-[rgba(255,180,171,0.15)] text-[var(--error)] flex items-center justify-center mb-3">
        <AlertCircle size={20} />
      </div>
      <p className="text-body-md text-[var(--error)] font-medium mb-3">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary py-1.5 px-4 text-label-md inline-flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </motion.div>
  );
}

export default {
  LoadingState,
  EmptyState,
  ErrorState,
};
