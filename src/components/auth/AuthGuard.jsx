import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { connectionHealth, useConnectionHealth } from '../../lib/connectionHealth';
import LoginPage from './LoginPage';
import DatabasePausedScreen from '../shell/DatabasePausedScreen';
import DatabasePausedBanner from '../shell/DatabasePausedBanner';
import { motion } from 'framer-motion';

const AuthContext = createContext({
  session: null,
  isOffline: false,
  setDatabasePaused: () => {},
});

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

/**
 * Root gatekeeper for the entire application.
 *
 * Responsibilities:
 * 1. Checks backend reachability before presenting any UI.
 * 2. If the database is paused or unreachable, catches the error immediately
 *    and displays <DatabasePausedScreen />.
 * 3. If backend is alive but unauthenticated, renders <LoginPage />.
 * 4. If authenticated, renders the protected application ({children}).
 */
export default function AuthGuard({ children }) {
  const { isPaused } = useConnectionHealth();
  const [session, setSession] = useState(() => getStoredSession());
  const [isOffline, setIsOffline] = useState(false);

  // Determine initial view: 'paused' | 'checking' | 'login' | 'app'
  const [authView, setAuthView] = useState(() => {
    if (connectionHealth.getState().isPaused) return 'paused';
    const stored = getStoredSession();
    if (stored) return 'app';
    return 'checking';
  });

  const checkAuthAndBackend = useCallback(async () => {
    try {
      // 1. Actively probe backend reachability (fires real GET /rest/v1/ request visible in Network tab)
      const isAlive = await connectionHealth.checkHealth();
      if (!isAlive) {
        setAuthView('paused');
        return false;
      }

      // 2. Backend is alive! Check cached session
      const stored = getStoredSession();
      if (stored) {
        setSession(stored);
        setAuthView('app');
        return true;
      }

      // 3. Retrieve session from Supabase
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
        setAuthView('app');
      } else {
        setSession(null);
        setAuthView('login');
      }
      return true;
    } catch (err) {
      connectionHealth.handleNetworkError(err);
      setAuthView('paused');
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Run startup check if not already resolved from cache
    if (authView === 'checking') {
      checkAuthAndBackend();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      // Prevent evicting active users if network/DNS is temporarily offline
      if (!nextSession && connectionHealth.getState().isPaused) {
        const fallback = getStoredSession();
        if (fallback) {
          setSession(fallback);
          return;
        }
      }

      setSession(nextSession);
      if (nextSession) {
        setAuthView('app');
      } else if (connectionHealth.getState().isPaused) {
        setAuthView('paused');
      } else {
        setAuthView('login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [authView, checkAuthAndBackend]);

  // Sync with global pause state changes (e.g. from runtime query failures)
  useEffect(() => {
    if (isPaused && !session) {
      setAuthView('paused');
    }
  }, [isPaused, session]);

  const handleDatabaseDown = (err) => {
    connectionHealth.handleNetworkError(err);
    setAuthView('paused');
  };

  // State 1: Paused / Offline Database Screen
  if (authView === 'paused' || (!session && isPaused)) {
    return (
      <DatabasePausedScreen
        onRetry={async () => {
          const isRestored = await checkAuthAndBackend();
          return isRestored;
        }}
      />
    );
  }

  // State 2: Initializing / Checking
  if (authView === 'checking') {
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

  // State 3: Unauthenticated -> Login View
  if (!session || authView === 'login') {
    return <LoginPage onDatabaseError={handleDatabaseDown} />;
  }

  // State 4: Authenticated -> Render App
  return (
    <AuthContext.Provider
      value={{
        session,
        isOffline,
        setDatabasePaused: () => setAuthView('paused'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
