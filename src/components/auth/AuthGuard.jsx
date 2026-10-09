import { useEffect, useState, createContext, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { connectionHealth } from '../../lib/connectionHealth';
import LoginPage from './LoginPage';
import DatabasePausedBanner from '../shell/DatabasePausedBanner';
import DatabasePausedScreen from '../shell/DatabasePausedScreen';
import { useConnectionHealth } from '../../lib/connectionHealth';
import { motion } from 'framer-motion';

const AuthContext = createContext({ session: null });

export const useAuth = () => useContext(AuthContext);

function getStoredSession() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const supabaseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '';
    const projectRef = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
    const key = `sb-${projectRef}-auth-token`;
    const stored = window.localStorage.getItem(key) || window.localStorage.getItem('supabase.auth.token');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed && (parsed.user || parsed.access_token)) {
      return {
        ...parsed,
        user: parsed.user || { id: 'local-owner', email: 'owner@local.budget' },
        isOfflineFallback: true,
      };
    }
  } catch (err) {
    console.warn('Unable to read stored auth session:', err);
  }
  return null;
}

export default function AuthGuard({ children }) {
  const { isPaused, status } = useConnectionHealth();
  const [session, setSession] = useState(() => getStoredSession());
  const [authChecked, setAuthChecked] = useState(() => connectionHealth.getState().isPaused);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      // If circuit breaker is already open or paused, resolve immediately without touching network
      if (connectionHealth.getState().isPaused || connectionHealth.shouldBypassQuery()) {
        const fallback = getStoredSession();
        setSession(fallback);
        if (isMounted) setAuthChecked(true);
        return;
      }

      try {
        // Race getSession with a 1500ms safety timeout to prevent hanging on stalled network/DNS
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 1500)
        );

        const { data } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMounted) return;

        if (data?.session) {
          setSession(data.session);
        } else {
          const fallback = getStoredSession();
          setSession(fallback);
          // If the user is unauthenticated, proactively test Supabase connectivity BEFORE showing login.
          // If the project is paused or offline, checkHealth() trips the circuit breaker in ~50ms,
          // ensuring the user immediately sees DatabasePausedScreen instead of a futile login form.
          if (!fallback) {
            await connectionHealth.checkHealth();
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const fallback = getStoredSession();
        setSession(fallback);
      } finally {
        if (isMounted) {
          setAuthChecked(true);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Avoid evicting user when session refresh fails due to network/DNS/paused outages
      if (!nextSession && (connectionHealth.getState().isPaused || connectionHealth.shouldBypassQuery())) {
        const fallback = getStoredSession();
        if (fallback) {
          return;
        }
      }
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-4">
          <DatabasePausedBanner />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 flex flex-col items-center max-w-md w-full"
        >
          <div className="w-12 h-12 rounded-full border-4 border-[rgba(208,188,255,0.2)] border-t-[var(--primary)] animate-spin mb-4" />
          <p className="text-body-md text-[var(--on-surface)]">Checking secure session...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    if (isPaused || status === 'paused' || status === 'offline') {
      return (
        <DatabasePausedScreen
          onContinueOffline={() => {
            setSession({
              user: { id: 'local-owner', email: 'guest@local.budget' },
              isOfflineFallback: true,
            });
          }}
        />
      );
    }
    return <LoginPage />;
  }

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}
