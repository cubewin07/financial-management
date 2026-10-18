import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createCircuitBreakerFetch } from './connectionHealth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local or GitHub Actions secrets.',
  );
}

// Intra-tab sequential mutex: Prevents concurrent token refreshes within the same tab
// from racing on rotating refresh tokens, while eliminating cross-tab navigator.locks deadlocks.
let activeAuthLock = Promise.resolve();

export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => {
      const prev = activeAuthLock;
      let resolver: () => void = () => {};
      activeAuthLock = new Promise<void>((resolve) => {
        resolver = resolve;
      });
      try {
        await prev;
        return await fn();
      } finally {
        resolver();
      }
    },
  },
  global: {
    fetch: createCircuitBreakerFetch(fetch, { timeoutMs: 8000, storageTimeoutMs: 45000 }),
  },
});
