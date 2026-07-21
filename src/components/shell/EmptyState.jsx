import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No Data Available',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction,
  icon: Icon = FolderOpen,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto w-full relative overflow-hidden my-4 shadow-[0_0_20px_rgba(211,251,255,0.05)]"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-14 h-14 rounded-2xl bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(211,251,255,0.2)]">
        <Icon size={26} />
      </div>

      <h4 className="text-headline-md text-[var(--on-surface)] mb-2">{title}</h4>
      <p className="text-body-md text-[var(--on-surface-variant)] max-w-xs mb-6">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary py-2.5 px-5 text-label-md"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
