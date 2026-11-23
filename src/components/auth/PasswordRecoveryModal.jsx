import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { CustomInput } from '../ui/forms';
import useModalDialog from '../../hooks/useModalDialog';
import {
  isPasswordRecoveryPending,
  setPasswordRecoveryPending,
} from '../../lib/authSession';

function clearRecoveryUrlParams() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.get('type') === 'recovery') {
      url.searchParams.delete('type');
      changed = true;
    }
    if (url.hash && url.hash.includes('type=recovery')) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      if (hashParams.get('type') === 'recovery') {
        hashParams.delete('type');
        const nextHash = hashParams.toString();
        url.hash = nextHash ? `#${nextHash}` : '';
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // ignore malformed URL
  }
}

export default function PasswordRecoveryModal() {
  const [open, setOpen] = useState(() => isPasswordRecoveryPending());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPasswordRecoveryPending()) {
      setOpen(true);
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
        setOpen(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleClose = () => {
    if (saving) return;
    setPasswordRecoveryPending(false);
    clearRecoveryUrlParams();
    setOpen(false);
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const dialogRef = useModalDialog(open, handleClose);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
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
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setPasswordRecoveryPending(false);
      clearRecoveryUrlParams();
      setOpen(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Could not update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const modal = (
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

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
