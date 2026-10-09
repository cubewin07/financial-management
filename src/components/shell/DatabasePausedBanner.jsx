import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useConnectionHealth } from '../../lib/connectionHealth';

export default function DatabasePausedBanner() {
  const { status, errorMessage, isPaused, retry } = useConnectionHealth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null); // 'success' | 'failed' | null

  // Extract project ref from VITE_SUPABASE_URL for 1-tap unpause in Supabase dashboard
  const supabaseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '';
  const projectRef = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
  const dashboardUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : 'https://supabase.com/dashboard';

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const isHealthy = await retry();
      setRetryResult(isHealthy ? 'success' : 'failed');
      if (isHealthy) {
        setTimeout(() => setRetryResult(null), 3000);
      }
    } catch {
      setRetryResult('failed');
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isPaused && status !== 'offline' && retryResult !== 'success') {
    return null;
  }

  const isExhausted = status === 'exhausted';
  const title = isExhausted
    ? 'Connection Pool Limit Reached'
    : status === 'offline'
    ? 'Database Connection Stalled'
    : 'Supabase Project Is Paused';

  const description =
    errorMessage ||
    (isExhausted
      ? 'PostgreSQL connection slots are full. Background auto-sync is paused to prevent freezing.'
      : 'Supabase automatically pauses free-tier projects after inactivity. Unpause in the dashboard to restore live sync.');

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="mb-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/5 p-4 shadow-lg backdrop-blur-xl"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Main Status Information */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {retryResult === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : isExhausted ? (
                <Database className="h-5 w-5 text-amber-300" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h4 className="text-sm font-semibold text-amber-200 tracking-tight">
                  {retryResult === 'success' ? 'Connection Restored!' : title}
                </h4>
              </div>
              <p className="mt-0.5 text-xs text-amber-300/80 leading-relaxed line-clamp-2 sm:line-clamp-none">
                {retryResult === 'success' ? 'Database is responsive. Resuming synchronization.' : description}
              </p>
            </div>
          </div>

          {/* Action Buttons (Touch-friendly & Responsive) */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Open Dashboard Link */}
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            >
              <span>Dashboard</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>

            {/* Manual Retry Connection Button */}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying || status === 'checking'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-200 border border-amber-500/40 transition-all hover:bg-amber-500/30 active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-amber-300 ${isRetrying || status === 'checking' ? 'animate-spin' : ''}`}
              />
              <span>{isRetrying || status === 'checking' ? 'Checking...' : 'Retry'}</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
