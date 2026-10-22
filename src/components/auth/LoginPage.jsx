import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { analyzeSupabaseError } from '../../lib/connectionHealth';
import { CustomInput } from '../ui/forms';
import { Mail, Lock, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * Clean, lightweight authentication view with sign-in, registration, and reset modes.
 * Backend reachability, session checking, and pause gating
 * are managed by parent <AuthGuard> with fallback via onDatabaseError.
 */
export default function LoginPage({ onDatabaseError }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const reduceMotion = useReducedMotion();

  const switchMode = (mode) => {
    setAuthMode(mode);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();

    try {
      if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) throw error;
        setMessage('Password reset instructions have been sent to your email.');
        return;
      }

      if (authMode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data?.user && !data?.session) {
          setMessage(
            'Account registered! Check your inbox to verify your email, or sign in directly if verification is disabled.'
          );
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else if (data?.session) {
          setMessage('Account created! Entering your portal...');
        }
        return;
      }

      // Default: 'signin'
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;
    } catch (err) {
      const analysis = analyzeSupabaseError(err);
      const statusCode = Number(err.status || err.code);
      const isOutage = analysis.isPaused || statusCode === 503 || statusCode === 504;

      if (isOutage && onDatabaseError) {
        onDatabaseError(err);
      } else {
        setError(err?.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle, Sophisticated Slate Lighting (No AI Purple Gradients) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-slate-800/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-slate-800/15 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        layout={!reduceMotion}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 32 },
          opacity: { duration: 0.3, ease: 'easeOut' },
          y: { duration: 0.3, ease: 'easeOut' },
        }}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
            Luminous
          </h1>
          <div className="min-h-[22px] flex items-center justify-center mt-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={authMode}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
                className="text-xs sm:text-sm text-slate-400"
              >
                {authMode === 'signup'
                  ? 'Create your account to track & share finances'
                  : authMode === 'reset'
                  ? 'Reset your account password'
                  : 'Sign in to your financial management portal'}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Enhanced Segmented Mode Switcher Tabs with Sliding Pill Animation */}
        <AnimatePresence initial={false}>
          {authMode !== 'reset' && (
            <motion.div
              key="auth-tabs"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-slate-950/80 border border-white/10">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="relative py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors duration-150"
                  aria-label="Switch to Sign In"
                >
                  {authMode === 'signin' && (
                    <motion.div
                      layoutId="activeAuthTabPill"
                      className="absolute inset-0 bg-slate-800 rounded-xl shadow-sm border border-white/10"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 500, damping: 38 }
                      }
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center gap-1.5 font-medium transition-colors duration-200 ${
                      authMode === 'signin'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LogIn size={15} />
                    <span>Sign In</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="relative py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors duration-150"
                  aria-label="Switch to Register"
                >
                  {authMode === 'signup' && (
                    <motion.div
                      layoutId="activeAuthTabPill"
                      className="absolute inset-0 bg-slate-800 rounded-xl shadow-sm border border-white/10"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 500, damping: 38 }
                      }
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center gap-1.5 font-medium transition-colors duration-200 ${
                      authMode === 'signup'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserPlus size={15} />
                    <span>Register</span>
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smooth Alerts & Feedback */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-4"
            >
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs sm:text-sm font-medium text-rose-300">
                <AlertCircle size={17} className="shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {message && (
            <motion.div
              key="message"
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-4"
            >
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs sm:text-sm font-medium text-emerald-300">
                <CheckCircle2 size={17} className="shrink-0 text-emerald-400 mt-0.5" />
                <span>{message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fields with Smooth Expansion/Collapsing */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomInput
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />


          <AnimatePresence initial={false}>
            {authMode !== 'reset' && (
              <motion.div
                key="password-field-wrapper"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-0.5">
                  <CustomInput
                    label="Password"
                    type="password"
                    icon={Lock}
                    placeholder={authMode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {authMode === 'signup' && (
              <motion.div
                key="confirm-password-field-wrapper"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-0.5">
                  <CustomInput
                    label="Confirm Password"
                    type="password"
                    icon={Lock}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Crisp, High-End Contrast Action Button */}
          <motion.button
            whileTap={reduceMotion ? undefined : { scale: 0.985 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-3 rounded-xl font-semibold bg-white hover:bg-slate-100 text-slate-900 transition-colors duration-150 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={loading ? 'loading' : authMode}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : authMode === 'signup' ? (
                  <>
                    <UserPlus size={16} />
                    <span>Create Account</span>
                  </>
                ) : authMode === 'reset' ? (
                  <>
                    <KeyRound size={16} />
                    <span>Send Reset Link</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </form>

        {/* Footer Navigation with Smooth Cross-Fade */}
        <div className="mt-6 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={authMode}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
            >
              {authMode === 'reset' ? (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              ) : authMode === 'signin' ? (
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Don&apos;t have an account? <span className="underline">Register</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-semibold text-slate-200 hover:text-white underline transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
