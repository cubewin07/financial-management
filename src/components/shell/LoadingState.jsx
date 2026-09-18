import { motion } from 'framer-motion';

export default function LoadingState({ message = 'Loading financial data...' }) {
  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center max-w-md w-full relative overflow-hidden shadow-[0_0_30px_rgba(208,188,255,0.1)]"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--primary)] opacity-15 blur-3xl rounded-full pointer-events-none" />
        
        {/* Neon Spinner */}
        <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-[rgba(208,188,255,0.15)]" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] border-r-[var(--tertiary)] animate-spin shadow-[0_0_15px_var(--primary)]" />
        </div>

        <h4 className="text-headline-md text-[var(--on-surface)] mb-1">Syncing</h4>
        <p className="text-body-md text-[var(--on-surface-variant)]">{message}</p>
      </motion.div>
    </div>
  );
}
