import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createCircuitBreakerFetch } from './connectionHealth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local or GitHub Actions secrets.',
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => {
      // Direct lock runner to prevent navigator.locks 5000ms deadlocks during network outages
      return fn();
    },
  },
  global: {
    fetch: createCircuitBreakerFetch(fetch, { timeoutMs: 8000 }),
  },
});
