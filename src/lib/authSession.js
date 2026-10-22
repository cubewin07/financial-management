/**
 * Pure session and auth view state resolution utilities.
 * Decoupled from React and DOM for strict headless testing.
 */

/**
 * Extracts cached session from storage.
 * Strict Security Invariants (Option B):
 * 1. Must contain a real user object with an ID (never fabricates 'local-owner').
 * 2. Token must not be expired (rejects if expires_at is in the past).
 *
 * @param {Storage | null} [customStorage]
 * @param {string} [customSupabaseUrl]
 */
export function getStoredSession(customStorage, customSupabaseUrl) {
  const storage = customStorage !== undefined ? customStorage : (typeof window !== 'undefined' ? window.localStorage : null);
  if (!storage) return null;

  try {
    const supabaseUrl =
      customSupabaseUrl ||
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '') ||
      '';
    const projectRef = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
    const key = `sb-${projectRef}-auth-token`;
    const stored = storage.getItem(key) || storage.getItem('supabase.auth.token');
    if (!stored) return null;
    const parsed = JSON.parse(stored);

    // Require valid user object with id (supports numeric sequence ID, bigint, string, and UUID)
    if (!parsed || !parsed.user || parsed.user.id === null || parsed.user.id === undefined || parsed.user.id === '') {
      return null;
    }

    // Require unexpired token
    if (parsed.expires_at && Math.floor(Date.now() / 1000) > parsed.expires_at) {
      return null;
    }

    return {
      ...parsed,
      isOfflineFallback: true,
    };
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('Unable to read stored auth session:', err);
    }
  }
  return null;
}

/**
 * Checks whether any Supabase auth token key exists in storage,
 * even if expired (indicating a returning user whose session can be refreshed).
 *
 * @param {Storage | null} [customStorage]
 * @param {string} [customSupabaseUrl]
 */
export function hasStoredAuthToken(customStorage, customSupabaseUrl) {
  const storage = customStorage !== undefined ? customStorage : (typeof window !== 'undefined' ? window.localStorage : null);
  if (!storage) return false;

  try {
    const supabaseUrl =
      customSupabaseUrl ||
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '') ||
      '';
    const projectRef = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
    const key = `sb-${projectRef}-auth-token`;

    if (storage.getItem(key) || storage.getItem('supabase.auth.token')) {
      return true;
    }

    const length = storage.length || 0;
    for (let i = 0; i < length; i++) {
      const storageKey = storage.key(i);
      if (storageKey && storageKey.startsWith('sb-') && storageKey.endsWith('-auth-token')) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Pure state resolver for AuthGuard initial view on cold start.
 * Prevents flash of login screen for returning users with refreshable sessions.
 *
 * @param {{ isPaused: boolean, storedSession: any, hasStoredToken: boolean }} params
 * @returns {'paused' | 'app' | 'checking' | 'login'}
 */
export function resolveInitialAuthView({ isPaused, storedSession, hasStoredToken }) {
  if (isPaused) return 'paused';
  if (storedSession) return 'app';
  if (hasStoredToken) return 'checking';
  return 'login';
}

/**
 * Pure state resolver for AuthGuard view resolution.
 *
 * @param {{ isClientOffline: boolean, isPaused: boolean, session: any, authView?: string }} params
 * @returns {'offline' | 'paused' | 'checking' | 'app' | 'login'}
 */
export function resolveAuthGuardState({ isClientOffline, isPaused, session, authView }) {
  if (isClientOffline) return 'offline';
  if (authView === 'paused' || (isPaused && !session)) return 'paused';
  if (authView === 'checking') return 'checking';
  if (session) return 'app';
  return 'login';
}
