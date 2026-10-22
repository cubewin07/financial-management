import { motion } from 'framer-motion';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center relative overflow-hidden rounded-3xl border border-[var(--outline-variant)]/60 shadow-2xl"
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--primary)]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[var(--secondary)]/15 rounded-full blur-3xl pointer-events-none" />

        {/* 404 Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[rgba(208,188,255,0.15)] to-[rgba(208,188,255,0.05)] border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] mb-5 shadow-[0_0_25px_rgba(208,188,255,0.2)]">
          <Compass size={32} className="animate-pulse" />
        </div>

        <span className="text-xs uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 font-bold mb-3">
          Error 404
        </span>

        <h2 className="text-headline-md font-bold text-[var(--on-surface)] mb-2">
          Page Not Found
        </h2>

        <p className="text-body-md text-[var(--on-surface-variant)] mb-4 max-w-xs">
          The requested route doesn't exist or may have been moved.
        </p>

        {location.pathname && (
          <code className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-slate-300 mb-6 max-w-full truncate">
            {location.pathname}
          </code>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            to="/"
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] text-[var(--on-primary)] text-label-md font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:opacity-95 transition-opacity"
          >
            <Home size={18} />
            <span>Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[var(--on-surface)] text-label-md font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
