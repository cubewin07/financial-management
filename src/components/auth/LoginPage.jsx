import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) setError(error.message);
      else setMessage('Password reset instructions sent.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">
        {/* Glow effect behind form */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-[var(--primary)] opacity-10 blur-3xl pointer-events-none" />
        
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-display text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] mb-2">
            Luminous
          </h1>
          <p className="text-body-md text-[var(--on-surface-variant)]">
            {isReset ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(255,180,171,0.1)] border border-[rgba(255,180,171,0.2)] relative z-10">
            <p className="text-label-md text-[var(--error)]">{error}</p>
          </div>
        )}
        
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(208,188,255,0.1)] border border-[rgba(208,188,255,0.2)] relative z-10">
            <p className="text-label-md text-[var(--primary)]">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-label-md text-[var(--on-surface)] mb-1.5 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-shell w-full"
              required
            />
          </div>
          
          {!isReset && (
            <div>
              <label className="block text-label-md text-[var(--on-surface)] mb-1.5 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-shell w-full"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 py-3"
          >
            {loading ? 'Processing...' : (isReset ? 'Send Reset Link' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center relative z-10">
          <button
            onClick={() => {
              setIsReset(!isReset);
              setError(null);
              setMessage(null);
            }}
            className="text-label-md text-[var(--primary)] hover:text-[var(--tertiary)] transition-colors"
          >
            {isReset ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </div>
      </div>
    </div>
  );
}
