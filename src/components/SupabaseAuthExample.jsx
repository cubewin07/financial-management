import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const initialFormState = {
  email: '',
  password: '',
};

function SupabaseAuthExample() {
  const [form, setForm] = useState(initialFormState);
  const [authLoading, setAuthLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const canSubmit = useMemo(
    () => form.email.trim().length > 0 && form.password.trim().length >= 6,
    [form.email, form.password],
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Welcome back. Loading your workspace...');

      setForm((current) => ({ ...current, password: '' }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = form.email.trim();

    if (!email) {
      setErrorMessage('Enter your email first, then use Reset password.');
      setSuccessMessage('');
      return;
    }

    setResetLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        throw error;
      }

      setSuccessMessage('Password reset link sent. Check your inbox and then sign in.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <section className="section-shell auth-login-shell relative overflow-hidden rounded-[36px] p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-[rgba(124,111,224,0.22)] blur-3xl"
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-10 right-[-2.75rem] h-40 w-40 rounded-full bg-[rgba(45,212,191,0.14)] blur-3xl"
          animate={{ opacity: [0.22, 0.48, 0.22] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative mx-auto max-w-2xl"
      >
        <p className="inline-flex items-center rounded-full border border-[rgba(124,111,224,0.26)] bg-[rgba(124,111,224,0.12)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--accent-purple)]">
          Shared Budget Login
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Welcome back
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          First time here? Use your invited email and, if needed, tap Reset password to create a new password.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div className="surface-panel rounded-2xl px-3 py-2 text-xs text-[var(--text-secondary)]">1. Enter invited email</div>
          <div className="surface-panel rounded-2xl px-3 py-2 text-xs text-[var(--text-secondary)]">2. Enter or reset password</div>
          <div className="surface-panel rounded-2xl px-3 py-2 text-xs text-[var(--text-secondary)]">3. Enter workspace</div>
        </div>

        <div className="auth-login-card mt-5 rounded-[28px] p-5 sm:p-6">
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                className="input-shell auth-login-input"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">Password</span>
              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  className="input-shell auth-login-input pr-24"
                  placeholder="Minimum 6 characters"
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  {passwordVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-xs font-medium text-[var(--accent-teal)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetLoading ? 'Sending reset link...' : 'Reset password'}
              </button>
              <span className="text-xs text-[var(--text-tertiary)]">Invite-only access</span>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={authLoading || !canSubmit}>
              {authLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="status-spinner status-spinner-light" aria-hidden="true" />
                  Connecting...
                </span>
              ) : (
                'Enter Workspace'
              )}
            </button>
          </form>

          <AnimatePresence mode="wait">
            {errorMessage ? (
              <motion.div
                key="auth-error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-xl border border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.12)] px-3 py-2 text-sm text-[var(--accent-coral)]"
              >
                {errorMessage}
              </motion.div>
            ) : null}

            {!errorMessage && successMessage ? (
              <motion.div
                key="auth-success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-xl border border-[rgba(45,212,191,0.28)] bg-[rgba(45,212,191,0.12)] px-3 py-2 text-sm text-[var(--accent-teal)]"
              >
                {successMessage}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <p className="mt-4 text-xs leading-5 text-[var(--text-tertiary)]">
            If your email is not recognized, ask the owner to add your account in Supabase Auth.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

export default SupabaseAuthExample;
