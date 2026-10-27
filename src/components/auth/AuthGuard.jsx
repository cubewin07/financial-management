import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { connectionHealth, useConnectionHealth, analyzeSupabaseError } from '../../lib/connectionHealth';
import LoginPage from './LoginPage';
import DatabasePausedScreen from '../shell/DatabasePausedScreen';
import DatabasePausedBanner from '../shell/DatabasePausedBanner';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

const AuthContext = createContext({
  session: null,
  isOffline: false,
  setDatabasePaused: () => {},
});

export const useAuth = () => useContext(AuthContext);

import {
  getStoredSession,
  hasStoredAuthToken,
  resolveInitialAuthView,
} from '../../lib/authSession';

export { getStoredSession };

/**
 * Root gatekeeper for the entire application.
 *
 * Responsibilities:
 * 1. Checks backend reachability before presenting protected data.
 * 2. If client device is offline (Option B), blocks access with a dedicated offline screen.
 * 3. If database is paused, displays <DatabasePausedScreen />.
 * 4. If backend is alive but unauthenticated, renders <LoginPage />.
 * 5. If authenticated, renders the protected application ({children}).
 */
export default function AuthGuard({ children }) {
  const { isPaused, status } = useConnectionHealth();
  const [session, setSession] = useState(() => getStoredSession());
  const [isClientOffline, setIsClientOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  // Monitor navigator.onLine changes
  useEffect(() => {
    const handleOnline = () => setIsClientOffline(false);
    const handleOffline = () => setIsClientOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine initial view: 'paused' | 'checking' | 'login' | 'app'
  const [authView, setAuthView] = useState(() => {
    return resolveInitialAuthView({
      isPaused: connectionHealth.getState().isPaused,
      storedSession: getStoredSession(),
      hasStoredToken: hasStoredAuthToken(),
    });
  });

  const checkAuthAndBackend = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsClientOffline(true);
        return false;
      }
      setIsClientOffline(false);

      // 1. If currently in paused/outage state, actively probe backend reachability to test recovery
      if (connectionHealth.getState().isPaused) {
        const isAlive = await connectionHealth.checkHealth();
        if (!isAlive) {
          setAuthView('paused');
          return false;
        }
      }

      // 2. Query Gotrue session (handles token validation & auto-refresh if near expiry)
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        const analysis = analyzeSupabaseError(error);
        if (analysis.isPaused) {
          connectionHealth.trip(analysis.status, analysis.message);
          setAuthView('paused');
          return false;
        }
      }

      if (data?.session) {
        setSession(data.session);
        setAuthView('app');
        return true;
      }

      // 3. Fallback to valid unexpired cached session if available
      const stored = getStoredSession();
      if (stored) {
        setSession(stored);
        setAuthView('app');
        return true;
      }

      // 4. No session: user needs to log in (never false-trip to paused!)
      setSession(null);
      setAuthView('login');
      return true;
    } catch (err) {
      const analysis = analyzeSupabaseError(err);
      if (analysis.isPaused) {
        connectionHealth.trip(analysis.status, analysis.message);
        setAuthView('paused');
        return false;
      }
      setSession(null);
      setAuthView('login');
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Run startup reachability check on mount
    checkAuthAndBackend();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAuthView('login');
        return;
      }

      // Prevent evicting active users if network is temporarily paused
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
  }, [checkAuthAndBackend]);

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

  // State 0: Client Device Completely Offline (Option B - Security Blocking)
  if (isClientOffline) {
    return (
      <div className="min-h-[100dvh] bg-[#0b0a12] text-slate-100 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-5">
            <WifiOff className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Internet Connection</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Your device is currently offline. Financial tracking and session authorization require an active connection.
          </p>
          <button
            type="button"
            onClick={checkAuthAndBackend}
            className="w-full py-3.5 px-5 rounded-2xl font-bold bg-purple-600 hover:bg-purple-500 active:scale-95 text-white transition-all shadow-[0_0_25px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </motion.div>
      </div>
    );
  }

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
      <div className="min-h-[100dvh] bg-[var(--background)] flex flex-col items-center justify-center p-4">
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
        isOffline: status === 'offline' || isClientOffline,
        setDatabasePaused: () => setAuthView('paused'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
