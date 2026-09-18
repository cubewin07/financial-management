import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CustomInput } from '../ui/forms';
import { Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 rounded-3xl border border-white/15 bg-slate-900/80 backdrop-blur-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-200 to-indigo-300 tracking-tight">
            Luminous
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isReset ? 'Reset your password' : 'Sign in to your financial portal'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}
        
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm font-medium text-purple-300">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <CustomInput
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          {!isReset && (
            <CustomInput
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="status-spinner" />
                <span>Processing...</span>
              </span>
            ) : isReset ? (
              'Send Reset Link'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsReset(!isReset);
              setError(null);
              setMessage(null);
            }}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isReset ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
