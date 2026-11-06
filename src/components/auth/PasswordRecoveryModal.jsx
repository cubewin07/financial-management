import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CustomInput } from '../ui/forms';

// Captured at import: the auth client removes the token from the URL after processing it.
const openedFromRecoveryLink =
  typeof window !== 'undefined' && /type=recovery/.test(window.location.hash);

export default function PasswordRecoveryModal() {
  const [open, setOpen] = useState(openedFromRecoveryLink);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setOpen(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-recovery-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md glass-card rounded-2xl p-6 space-y-4"
      >
        <h2 id="password-recovery-title" className="text-lg font-bold text-white">
          Set a new password
        </h2>
        <CustomInput
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <CustomInput
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 rounded-xl disabled:opacity-50">
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
