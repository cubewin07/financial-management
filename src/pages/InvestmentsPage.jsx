import { motion } from 'framer-motion';
import { TrendingUp, Lock, PieChart, ShieldCheck } from 'lucide-react';

export default function InvestmentsPage() {
  return (
    <main className="space-y-8 animate-in fade-in duration-500">
      <header>
        <p className="text-label-md text-[var(--primary)] uppercase tracking-wider mb-2">Portfolio</p>
        <h1 className="text-headline-lg text-[var(--on-surface)]">Investments</h1>
        <p className="text-body-md text-[var(--on-surface-variant)] mt-2">
          Track assets, stocks, and long-term portfolio growth.
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[380px] max-w-2xl mx-auto space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />

        <div className="w-20 h-20 rounded-full bg-[rgba(208,188,255,0.12)] text-[var(--primary)] flex items-center justify-center shadow-[0_0_20px_rgba(208,188,255,0.2)]">
          <TrendingUp size={36} />
        </div>

        <div className="space-y-2 max-w-md">
          <h3 className="text-headline-md text-[var(--on-surface)]">Investment Tracking Coming Soon</h3>
          <p className="text-body-md text-[var(--on-surface-variant)]">
            Portfolio analytics, stock performance monitoring, and asset allocation views are currently under active development.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
          <div className="p-4 rounded-xl bg-[var(--surface-container-low)] border border-white/5 flex flex-col items-center gap-1.5">
            <PieChart size={20} className="text-[var(--secondary)]" />
            <span className="text-label-sm text-[var(--on-surface-variant)]">Asset Allocation</span>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface-container-low)] border border-white/5 flex flex-col items-center gap-1.5">
            <ShieldCheck size={20} className="text-[var(--tertiary)]" />
            <span className="text-label-sm text-[var(--on-surface-variant)]">Risk Analytics</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] text-label-md border border-[rgba(211,251,255,0.2)]">
          <Lock size={14} />
          <span>Pro Feature Preview</span>
        </div>
      </motion.div>
    </main>
  );
}
