import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import LoginPage from './LoginPage';
import { motion } from 'framer-motion';

const AuthContext = createContext({ session: null });

export const useAuth = () => useContext(AuthContext);

export default function AuthGuard({ children }) {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
      setAuthChecked(true);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-full border-4 border-[rgba(208,188,255,0.2)] border-t-[var(--primary)] animate-spin mb-4" />
          <p className="text-body-md text-[var(--on-surface)]">Checking secure session...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}
