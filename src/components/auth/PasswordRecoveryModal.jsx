import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CustomInput } from '../ui/forms';
import useModalDialog from '../../hooks/useModalDialog';

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

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const dialogRef = useModalDialog(open, handleClose);

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
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-4">
      <form
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-recovery-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md glass-card rounded-2xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain focus:outline-none"
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
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="btn-secondary min-h-[44px] px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 min-h-[44px] py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
