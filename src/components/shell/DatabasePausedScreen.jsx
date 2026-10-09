import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useConnectionHealth } from '../../lib/connectionHealth';

/**
 * Dedicated full-screen recovery screen displayed when the Supabase project
 * is paused, DNS unresolved, or connection pool is exhausted.
 *
 * Prevents users from being presented with futile email/password forms when
 * the backend is offline, providing 1-tap unpause links and connectivity probes.
 */
export default function DatabasePausedScreen({ onContinueOffline }) {
  const { status, errorMessage, retry } = useConnectionHealth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null); // 'success' | 'failed' | null

  const supabaseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '';
  const projectRef = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
  const dashboardUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : 'https://supabase.com/dashboard';

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const isHealthy = await retry();
      setRetryResult(isHealthy ? 'success' : 'failed');
      if (isHealthy) {
        setTimeout(() => {
          setRetryResult(null);
        }, 1500);
      }
    } catch {
      setRetryResult('failed');
    } finally {
      setIsRetrying(false);
    }
  }, [retry]);

  // Automatically test connection when user switches back to this tab/window after unpausing
  useEffect(() => {
    const handleRecheck = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (!isRetrying) {
        handleRetry();
      }
    };

    window.addEventListener('focus', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);
    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
    };
  }, [isRetrying, handleRetry]);

  const isExhausted = status === 'exhausted';
  const title = isExhausted
    ? 'Connection Pool Exhausted'
    : 'Supabase Database Is Paused';

  const subtitle = isExhausted
    ? 'All available PostgreSQL connection slots are full. Waiting for clients to disconnect.'
    : 'Supabase free-tier projects automatically pause after 7 days of inactivity. Because the backend is offline, authentication and live syncing are temporarily paused.';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-lg p-7 sm:p-9 rounded-3xl border border-amber-500/30 bg-slate-900/90 backdrop-blur-2xl shadow-2xl relative z-10"
      >
        {/* Header Icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            {retryResult === 'success' ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            ) : isExhausted ? (
              <Database className="h-7 w-7 text-amber-300" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-amber-400" />
            )}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{isExhausted ? 'Pool Full' : 'Paused Free Tier'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {retryResult === 'success' ? 'Connection Restored!' : title}
            </h1>
          </div>
        </div>

        {/* Informative Explanation */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {retryResult === 'success'
            ? 'Supabase backend is responsive again. Live authentication and syncing are re-enabled.'
            : errorMessage || subtitle}
        </p>

        {/* Project Reference Badge */}
        {projectRef && (
          <div className="mb-6 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Supabase Project Ref:</span>
            <code className="font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              {projectRef}
            </code>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Action: Open Supabase Dashboard to Unpause */}
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all duration-200 active:scale-[0.98]"
          >
            <span>Unpause in Supabase Dashboard</span>
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Secondary Action: Live Probe / Retry */}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-purple-300 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>
              {isRetrying
                ? 'Testing connection...'
                : retryResult === 'failed'
                ? 'Still paused — Click to re-check'
                : 'Check Connection Status'}
            </span>
          </button>
        </div>

        {/* Offline / Guest Mode Fallback */}
        {onContinueOffline && (
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={onContinueOffline}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-purple-300 transition-colors"
            >
              <span>Explore application in Offline Mode</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
