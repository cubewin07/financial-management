import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CustomInput } from '../ui/forms';
import { Mail, Lock, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password reset instructions have been sent to your email.');
        }
        setLoading(false);
        return;
      }

      if (authMode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          setError(error.message);
        } else if (data?.user && !data?.session) {
          setMessage(
            'Account registered! Check your inbox to verify your email, or sign in directly if verification is disabled.'
          );
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else if (data?.session) {
          setMessage('Account created! Entering your portal...');
        }
        setLoading(false);
        return;
      }

      // Default: 'signin'
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err?.message || 'Authentication error.');
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
            Luminous
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {authMode === 'signup'
              ? 'Create your account to track & share finances'
              : authMode === 'reset'
              ? 'Reset your account password'
              : 'Sign in to your financial management portal'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Sign In / Register) */}
        {authMode !== 'reset' && (
          <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-2xl bg-slate-950/80 border border-white/10">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={15} />
              <span>Register</span>
            </button>
          </div>
        )}

        {/* Alerts & Feedback */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs sm:text-sm font-medium text-rose-300"
            >
              <AlertCircle size={17} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {message && (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-xs sm:text-sm font-medium text-emerald-300"
            >
              <CheckCircle2 size={17} className="shrink-0 text-emerald-400 mt-0.5" />
              <span>{message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fields */}
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

          {authMode !== 'reset' && (
            <CustomInput
              label="Password"
              type="password"
              icon={Lock}
              placeholder={authMode === 'signup' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}

          {authMode === 'signup' && (
            <CustomInput
              label="Confirm Password"
              type="password"
              icon={Lock}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          {/* Crisp, High-End Contrast Action Button (Replaced AI-Generated Purple Gradient) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-3 rounded-xl font-semibold bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 transition-all duration-150 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                <span>Processing...</span>
              </span>
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
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 text-center space-y-2">
          {authMode === 'reset' ? (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to Sign In
            </button>
          ) : authMode === 'signin' ? (
            <div className="flex items-center justify-between text-xs pt-1">
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
            <p className="text-xs text-slate-400 pt-1">
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
        </div>
      </motion.div>
    </div>
  );
}
