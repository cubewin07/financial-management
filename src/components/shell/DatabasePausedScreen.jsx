import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Moon,
  ShieldCheck,
  Sparkles,
  Radio,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useConnectionHealth } from '../../lib/connectionHealth';

/**
 * Full-screen recovery portal displayed when the Supabase database
 * is paused (e.g. 7-day free tier inactivity sleep) or offline.
 *
 * Uses the exact viewport height (h-screen) with zero overscroll leakage,
 * pinned header and footer, and dedicated cloud wake-up guidance.
 */
export default function DatabasePausedScreen({ onRetry }) {
  const { status, errorMessage, retry } = useConnectionHealth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null); // 'success' | 'failed' | null
  const [copied, setCopied] = useState(false);

  const supabaseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '';
  const isSupabaseHosted = typeof supabaseUrl === 'string' && supabaseUrl.includes('.supabase.co');
  const projectRef = isSupabaseHosted ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
  const dashboardUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}`
    : 'https://supabase.com/dashboard';

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const isHealthy = onRetry ? await onRetry() : await retry();
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
  }, [retry, onRetry]);

  // Auto-probe when user returns to this window
  useEffect(() => {
    const handleRecheck = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (!isRetrying && retryResult !== 'success') {
        handleRetry();
      }
    };

    window.addEventListener('focus', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);
    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
    };
  }, [isRetrying, retryResult, handleRetry]);

  // Periodic auto-check while the screen is open
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isRetrying && retryResult !== 'success') {
        handleRetry();
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [isRetrying, retryResult, handleRetry]);

  const handleCopyRef = async () => {
    if (!projectRef) return;
    try {
      await navigator.clipboard.writeText(projectRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const isExhausted = status === 'exhausted';

  return (
    <div className="min-h-[100dvh] w-full bg-[#0b0a12] text-slate-100 flex flex-col justify-between overflow-x-hidden relative select-none">
      {/* Background Ambience strictly clipped to prevent overscroll space */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute -top-32 left-1/4 w-[500px] h-[350px] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-32 w-[450px] h-[350px] bg-amber-500/10 rounded-full blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[350px] bg-indigo-600/15 rounded-full blur-[140px]" />
      </div>

      {/* Pinned Top Navigation Bar */}
      <header className="shrink-0 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl relative z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block leading-tight">Luminous</span>
            <span className="text-[11px] text-slate-400 block leading-none">Financial Management</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span>{isExhausted ? 'Connection Pool Saturated' : 'Database Inactivity Sleep'}</span>
        </div>
      </header>

      {/* Main Content Area (Centered without overflow clipping) */}
      <main className="flex-1 min-h-0 overflow-y-auto w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-white/10 bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-9 shadow-2xl my-auto"
        >
          {/* Status Header Badge */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Moon className="h-3.5 w-3.5" />
              <span>Supabase 7-Day Inactivity Auto-Pause</span>
            </div>

            {projectRef && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <span className="text-slate-400">Project:</span>
                <code className="font-mono text-purple-300 font-semibold">{projectRef}</code>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="ml-1 text-slate-400 hover:text-white transition-colors"
                  title="Copy Project Reference"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Title & Explanation */}
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
              {retryResult === 'success' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              ) : isExhausted ? (
                <Database className="h-7 w-7 text-amber-300" />
              ) : (
                <AlertTriangle className="h-7 w-7 text-amber-300" />
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {retryResult === 'success'
                  ? 'Connection Restored!'
                  : isExhausted
                  ? 'Connection Pool Saturated'
                  : 'Your Database is in Sleep Mode'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {retryResult === 'success'
                  ? 'The Supabase backend has resumed. Reconnecting to your financial data...'
                  : isExhausted
                  ? 'All available PostgreSQL connections are currently occupied. Please wait a moment for connections to release.'
                  : 'Supabase automatically pauses free-tier databases after 7 days of inactivity to preserve cloud compute. Unpause the project in your dashboard to resume full sync.'}
              </p>
            </div>
          </div>

          {/* Data Safety Assurance Card */}
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-xs sm:text-sm font-bold text-emerald-200 block">All Financial Records Are 100% Safe</strong>
              <p className="text-xs text-emerald-300/80 mt-0.5 leading-tight">
                PostgreSQL data volumes remain intact. Expenses, categories, savings goals, and receipts will immediately reload once unpaused.
              </p>
            </div>
          </div>

          {/* 3-Step Guided Workflow */}
          <div className="mb-6 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              <span>How to restore access</span>
              <span className="text-slate-400 font-normal normal-case flex items-center gap-1 text-[11px]">
                <Clock className="h-3.5 w-3.5" /> Takes ~60 seconds to wake up
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 sm:flex-col sm:gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs">
                  1
                </span>
                <div>
                  <strong className="block text-xs font-semibold text-white">Open Supabase</strong>
                  <span className="text-[11px] text-slate-400 leading-snug block">Click unpause button below to open your project</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 sm:flex-col sm:gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs">
                  2
                </span>
                <div>
                  <strong className="block text-xs font-semibold text-white">Tap 'Restore'</strong>
                  <span className="text-[11px] text-slate-400 leading-snug block">Supabase spins up your PostgreSQL container</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 sm:flex-col sm:gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                  3
                </span>
                <div>
                  <strong className="block text-xs font-semibold text-white">Auto-Reconnect</strong>
                  <span className="text-[11px] text-slate-400 leading-snug block">This tab auto-detects and transitions back to login</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.35)] transition-all duration-200 active:scale-[0.98] text-sm"
              >
                <span>Unpause in Supabase Dashboard</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`h-4 w-4 text-purple-300 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>
                  {isRetrying
                    ? 'Testing connection...'
                    : retryResult === 'failed'
                    ? 'Still sleeping — Re-check'
                    : 'Test Connection Status'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
              <Radio className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              <span>Auto-listening active: this window resumes automatically once online</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Pinned Full-Width Footer */}
      <footer className="shrink-0 w-full border-t border-white/10 bg-slate-950/80 backdrop-blur-xl py-3 px-4 sm:px-8 text-center text-xs text-slate-400 relative z-20">
        <p>Luminous Financial Management • Free-Tier Cloud Gating Guard • 100% Data Integrity Guaranteed</p>
      </footer>
    </div>
  );
}
