import { useState, useEffect } from 'react';

/**
 * @typedef {'healthy' | 'paused' | 'exhausted' | 'offline' | 'checking'} ConnectionStatus
 *
 * @typedef {Object} ConnectionHealthState
 * @property {ConnectionStatus} status
 * @property {string | null} errorMessage
 * @property {number | null} lastChecked
 * @property {number | null} cooldownUntil
 * @property {boolean} isPaused
 */

const DEFAULT_COOLDOWN_MS = 30000; // 30s cooldown when paused or pool exhausted
const VISIBILITY_THROTTLE_MS = 30000; // Minimum 30s between automatic background syncs

const PAUSED_KEYWORDS = [
  'project is paused',
  'database is paused',
  'project_paused',
  'project is temporarily paused',
  'restore it via the supabase dashboard',
  'restore it via supabase dashboard',
];

const EXHAUSTED_KEYWORDS = [
  'remaining connection slots are reserved',
  'too many clients',
  'connection pool exhausted',
  'connection limit exceeded',
  'max client connections reached',
  'server closed the connection unexpectedly',
  'canceling statement due to statement timeout',
];

/**
 * Analyzes an error or status response for Supabase pause/connection pool exhaustion patterns.
 * @param {any} errorOrResponse
 * @returns {{ status: ConnectionStatus, isPaused: boolean, message: string }}
 */
export function analyzeSupabaseError(errorOrResponse) {
  if (!errorOrResponse) {
    return { status: 'healthy', isPaused: false, message: '' };
  }

  const status = errorOrResponse.status || (errorOrResponse.response && errorOrResponse.response.status);
  const rawMessage = (
    errorOrResponse.message ||
    errorOrResponse.error_description ||
    (typeof errorOrResponse === 'string' ? errorOrResponse : '') ||
    JSON.stringify(errorOrResponse)
  ).toLowerCase();

  // 1. Check for paused project
  const isPaused = status === 503 || PAUSED_KEYWORDS.some((kw) => rawMessage.includes(kw));
  if (isPaused) {
    return {
      status: 'paused',
      isPaused: true,
      message: 'Supabase project is paused. Unpause it in the Supabase Dashboard to resume.',
    };
  }

  // 2. Check for connection pool exhaustion
  const isExhausted =
    status === 504 ||
    EXHAUSTED_KEYWORDS.some((kw) => rawMessage.includes(kw));
  if (isExhausted) {
    return {
      status: 'exhausted',
      isPaused: true,
      message: 'Database connection pool is exhausted. Background queries are temporarily paused.',
    };
  }

  // 3. Timeout / Abort / Network failure
  const isTimeout =
    rawMessage.includes('abort') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('networkerror');
  if (isTimeout) {
    return {
      status: 'offline',
      isPaused: false,
      message: 'Database request timed out or network is unavailable.',
    };
  }

  return { status: 'healthy', isPaused: false, message: '' };
}

class ConnectionHealthManager {
  constructor() {
    /** @type {ConnectionHealthState} */
    this.state = {
      status: 'healthy',
      errorMessage: null,
      lastChecked: null,
      cooldownUntil: null,
      isPaused: false,
    };
    /** @type {Set<(state: ConnectionHealthState) => void>} */
    this.listeners = new Set();
    this.lastSyncTime = 0;
  }

  getState() {
    return { ...this.state };
  }

  /**
   * Returns true if circuit breaker is open (paused/exhausted) and cooldown is still active.
   */
  shouldBypassQuery() {
    if (!this.state.isPaused) return false;
    if (this.state.cooldownUntil && Date.now() < this.state.cooldownUntil) {
      return true;
    }
    return false;
  }

  /**
   * Trips the circuit breaker.
   * @param {ConnectionStatus} status
   * @param {string} message
   * @param {number} [cooldownMs]
   */
  trip(status, message, cooldownMs = DEFAULT_COOLDOWN_MS) {
    const isPaused = status === 'paused' || status === 'exhausted';
    this.state = {
      status,
      errorMessage: message,
      lastChecked: Date.now(),
      cooldownUntil: Date.now() + cooldownMs,
      isPaused,
    };
    this.notify();
  }

  /**
   * Resets health state back to healthy.
   */
  reset() {
    this.state = {
      status: 'healthy',
      errorMessage: null,
      lastChecked: Date.now(),
      cooldownUntil: null,
      isPaused: false,
    };
    this.notify();
  }

  /**
   * Handles HTTP responses.
   * @param {number} status
   * @param {string} bodyText
   */
  handleHttpError(status, bodyText = '') {
    const analysis = analyzeSupabaseError({ status, message: bodyText });
    if (analysis.isPaused) {
      this.trip(analysis.status, analysis.message);
    }
  }

  /**
   * Handles fetch network errors or timeouts.
   * @param {Error} error
   */
  handleNetworkError(error) {
    const analysis = analyzeSupabaseError(error);
    if (analysis.isPaused) {
      this.trip(analysis.status, analysis.message);
    }
  }

  handleSuccess() {
    if (this.state.status !== 'healthy') {
      this.reset();
    }
  }

  /**
   * Subscribes a callback to health state changes.
   * @param {(state: ConnectionHealthState) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Connection health listener error:', err);
      }
    });
  }

  /**
   * Proactively ping Supabase to test connectivity.
   * @param {string} [supabaseUrl]
   * @param {string} [publishableKey]
   * @returns {Promise<boolean>}
   */
  async checkHealth(supabaseUrl, publishableKey) {
    const url = supabaseUrl || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL);
    const key = publishableKey || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY);

    if (!url || !key) {
      return false;
    }

    this.state = { ...this.state, status: 'checking' };
    this.notify();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      // Lightweight request to rest/v1/ with apikey header
      const res = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 503 || res.status === 504) {
        const text = await res.text().catch(() => '');
        this.handleHttpError(res.status, text);
        return false;
      }

      this.reset();
      return true;
    } catch (err) {
      clearTimeout(timeout);
      this.handleNetworkError(err);
      return false;
    }
  }

  resetSyncThrottle() {
    this.lastSyncTime = 0;
  }
}

export const connectionHealth = new ConnectionHealthManager();

/**
 * Throttle guard for window focus & visibilitychange event listeners.
 * Prevents mobile devices from sending synchronized query barrages when resuming or when paused.
 * @returns {boolean}
 */
export function shouldTriggerVisibilitySync() {
  const state = connectionHealth.getState();

  // If paused or pool exhausted, completely gate background sync
  if (state.isPaused) {
    return false;
  }

  const now = Date.now();
  if (now - connectionHealth.lastSyncTime < VISIBILITY_THROTTLE_MS) {
    return false;
  }

  connectionHealth.lastSyncTime = now;
  return true;
}

/**
 * Creates a fetch wrapper with:
 * 1. Circuit breaker fast-fail bypass
 * 2. Enforced 8-second request timeout
 * 3. Automatic 503/504 inspection & circuit tripping
 * 4. Recovery on successful response
 *
 * @param {typeof fetch} [baseFetch]
 * @param {{ timeoutMs?: number }} [options]
 * @returns {typeof fetch}
 */
export function createCircuitBreakerFetch(baseFetch = globalThis.fetch, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;

  return async function circuitBreakerFetch(input, init = {}) {
    // 1. Fast-fail if circuit breaker is open
    if (connectionHealth.shouldBypassQuery()) {
      const state = connectionHealth.getState();
      const bypassError = new Error(
        `[CircuitBreaker] Supabase is currently ${state.status}: ${state.errorMessage || 'Queries suspended to prevent freezing.'}`
      );
      bypassError.isCircuitBreakerBypass = true;
      bypassError.status = 503;
      throw bypassError;
    }

    // 2. Enforce request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Supabase request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (init && init.signal) {
      init.signal.addEventListener('abort', () => {
        controller.abort(init.signal.reason);
      });
    }

    try {
      const response = await baseFetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // 3. Inspect 503 / 504 status codes
      if (response.status === 503 || response.status === 504) {
        try {
          const clone = response.clone();
          const text = await clone.text();
          connectionHealth.handleHttpError(response.status, text);
        } catch {
          connectionHealth.handleHttpError(response.status, '');
        }
      } else if (response.ok) {
        connectionHealth.handleSuccess();
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      connectionHealth.handleNetworkError(err);
      throw err;
    }
  };
}

/**
 * Custom React hook for subscribing to connection health state in components.
 */
export function useConnectionHealth() {
  const [health, setHealth] = useState(() => connectionHealth.getState());

  useEffect(() => {
    return connectionHealth.subscribe(setHealth);
  }, []);

  const retry = async () => {
    return connectionHealth.checkHealth();
  };

  return {
    ...health,
    retry,
    isCircuitBreakerActive: connectionHealth.shouldBypassQuery(),
  };
}
