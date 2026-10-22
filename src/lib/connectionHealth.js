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
const VISIBILITY_THROTTLE_MS = 30000; // Minimum 30s between automatic background syncs per hook

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

  // 0. Explicit client offline check via navigator.onLine
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      status: 'offline',
      isPaused: false,
      message: 'Your device is offline. Please check your internet connection.',
    };
  }

  const status = errorOrResponse.status || (errorOrResponse.response && errorOrResponse.response.status);
  let rawMessage = '';
  try {
    rawMessage = (
      errorOrResponse.message ||
      errorOrResponse.error_description ||
      (typeof errorOrResponse === 'string' ? errorOrResponse : '') ||
      JSON.stringify(errorOrResponse)
    ).toLowerCase();
  } catch {
    rawMessage = String(errorOrResponse?.message || errorOrResponse || '').toLowerCase();
  }

  // 1. Check for paused project explicit HTTP or body keywords
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

  // 3. DNS resolution failure (Canonical behavior of paused Supabase free-tier projects)
  const isDnsFailure =
    rawMessage.includes('err_name_not_resolved') ||
    rawMessage.includes('nxdomain') ||
    rawMessage.includes('enotfound') ||
    rawMessage.includes('could not resolve host');
  if (isDnsFailure) {
    return {
      status: 'paused',
      isPaused: true,
      message: 'Supabase domain cannot be resolved (project is likely paused or offline). Unpause it in the Supabase Dashboard.',
    };
  }

  // 3b. Gateway failure (Cloudflare 502 Bad Gateway / upstream gateway failure)
  if (status === 502 || rawMessage.includes('bad gateway')) {
    return {
      status: 'offline',
      isPaused: true,
      message: 'Database gateway is unreachable (HTTP 502 Bad Gateway). The upstream service may be restarting.',
    };
  }

  // PostgreSQL 25P02 transaction aborted and statement timeout are query-level errors, NOT infrastructure outages!
  if (rawMessage.includes('transaction is aborted') || rawMessage.includes('statement timeout')) {
    return { status: 'healthy', isPaused: false, message: '' };
  }

  // Client and authentication errors (400, 401, 403, 404, 422) originate from an active, responsive server.
  // They must NEVER be treated as infrastructure outages or paused databases.
  if (status >= 400 && status < 500) {
    return { status: 'healthy', isPaused: false, message: '' };
  }

  // 4. Timeout / Abort / Network failure
  const isAbort =
    rawMessage.includes('the operation was aborted') ||
    rawMessage.includes('aborterror') ||
    errorOrResponse?.name === 'AbortError';

  const isTimeoutOrNetwork =
    isAbort ||
    rawMessage.includes('timed out') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('fetch failed') ||
    rawMessage.includes('network') ||
    rawMessage.includes('load failed');
  if (isTimeoutOrNetwork) {
    return {
      status: 'offline',
      isPaused: true,
      message: 'Database endpoint is unreachable (project is likely paused or offline). Unpause it in the Supabase Dashboard.',
    };
  }

  return { status: 'healthy', isPaused: false, message: '' };
}

const STORAGE_KEY = 'sb_connection_health';

function readStoredHealth() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isPaused) {
      // Discard stale pause state if cooldown has already expired
      if (parsed.cooldownUntil && Date.now() >= parsed.cooldownUntil) {
        return null;
      }
      return {
        status: parsed.status || 'paused',
        errorMessage: parsed.errorMessage || null,
        lastChecked: parsed.lastChecked || null,
        cooldownUntil: parsed.cooldownUntil || null,
        isPaused: true,
      };
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return null;
}

function writeStoredHealth(state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (state && state.isPaused) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          status: state.status,
          errorMessage: state.errorMessage,
          lastChecked: state.lastChecked,
          cooldownUntil: state.cooldownUntil,
          isPaused: true,
        })
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    // Ignore storage write errors
  }
}

class ConnectionHealthManager {
  constructor() {
    const stored = readStoredHealth();
    /** @type {ConnectionHealthState} */
    this.state = stored || {
      status: 'healthy',
      errorMessage: null,
      lastChecked: null,
      cooldownUntil: null,
      isPaused: false,
    };
    /** @type {Set<(state: ConnectionHealthState) => void>} */
    this.listeners = new Set();
    /** @type {Map<string, number>} */
    this.lastSyncTimes = new Map();
    /** @type {Promise<boolean> | null} */
    this.activeProbePromise = null;
  }

  getState() {
    return { ...this.state };
  }

  /**
   * Returns true if circuit breaker is open (paused/exhausted/offline) and cooldown is still active.
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
    const isPaused = status === 'paused' || status === 'exhausted' || status === 'offline';
    this.state = {
      status,
      errorMessage: message,
      lastChecked: Date.now(),
      cooldownUntil: Date.now() + cooldownMs,
      isPaused,
    };
    writeStoredHealth(this.state);
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
    writeStoredHealth(this.state);
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
    } else if (status >= 500) {
      this.trip('offline', bodyText || `Upstream gateway or server error (HTTP ${status}).`);
    }
  }

  /**
   * Handles fetch network errors or timeouts.
   * @param {Error} error
   */
  handleNetworkError(error) {
    const analysis = analyzeSupabaseError(error);
    this.trip(
      analysis.status === 'healthy' ? 'offline' : analysis.status,
      analysis.message || 'Database endpoint is unreachable.',
    );
  }

  handleSuccess() {
    if (this.state.status !== 'healthy' || this.state.isPaused) {
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
    try {
      listener(this.getState());
    } catch (err) {
      console.error('Connection health initial listener error:', err);
    }
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
   * Uses a shared in-flight probe promise to avoid thundering herd on recovery.
   * @param {string} [supabaseUrl]
   * @param {string} [publishableKey]
   * @returns {Promise<boolean>}
   */
  async checkHealth(supabaseUrl, publishableKey) {
    if (this.activeProbePromise) {
      return this.activeProbePromise;
    }

    const url = supabaseUrl || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL);
    const key = publishableKey || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY);

    if (!url || !key) {
      return false;
    }

    const cleanUrl = url.replace(/\/+$/, '');
    const previousState = { ...this.state };
    this.state = { ...this.state, status: 'checking' };
    this.notify();

    this.activeProbePromise = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        // Probe Supabase Auth health endpoint (/auth/v1/health) which returns 200 OK without requiring secret keys
        const res = await fetch(`${cleanUrl}/auth/v1/health`, {
          method: 'GET',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // 5xx Server Errors (500 Internal, 502 Bad Gateway, 503 Paused/Unavailable, 504 Timeout)
        if (res.status >= 500) {
          const text = await res.text().catch(() => '');
          this.handleHttpError(res.status, text);
          return false;
        }

        // 2xx (OK), 401 (Unauthorized), 403 (Forbidden): The server is online, responsive, and processing HTTP requests
        if (this.state.status !== 'healthy' || this.state.isPaused) {
          this.reset();
        }
        return true;
      } catch (err) {
        clearTimeout(timeout);
        this.handleNetworkError(err);
        return false;
      } finally {
        if (this.state.status === 'checking') {
          this.state = previousState;
          this.notify();
        }
        this.activeProbePromise = null;
      }
    })();

    return this.activeProbePromise;
  }

  /**
   * Throttle guard per hook/channel for window focus & visibilitychange event listeners.
   * @param {string} [hookKey='default']
   * @returns {boolean}
   */
  shouldTriggerVisibilitySync(hookKey = 'default') {
    const state = this.getState();
    if (state.isPaused) {
      return false;
    }

    const now = Date.now();
    const last = this.lastSyncTimes.get(hookKey) || 0;
    if (now - last < VISIBILITY_THROTTLE_MS) {
      return false;
    }

    this.lastSyncTimes.set(hookKey, now);
    return true;
  }

  resetSyncThrottle(hookKey) {
    if (hookKey) {
      this.lastSyncTimes.delete(hookKey);
    } else {
      this.lastSyncTimes.clear();
    }
  }
}

export { ConnectionHealthManager };
export const connectionHealth = new ConnectionHealthManager();

/**
 * Throttle guard for window focus & visibilitychange event listeners.
 * Prevents mobile devices from sending synchronized query barrages when resuming or when paused.
 * Supports per-hook keying to eliminate sibling starvation.
 * @param {string} [hookKey='default']
 * @returns {boolean}
 */
export function shouldTriggerVisibilitySync(hookKey = 'default') {
  return connectionHealth.shouldTriggerVisibilitySync(hookKey);
}

/**
 * Creates a fetch wrapper with:
 * 1. Circuit breaker fast-fail bypass
 * 2. Enforced timeout (45s for Storage, 8s for REST queries)
 * 3. Automatic 503/504 inspection & circuit tripping
 * 4. Recovery on successful response
 * 5. Full abort listener cleanup and Request object signal support
 *
 * @param {typeof fetch} [baseFetch]
 * @param {{ timeoutMs?: number, storageTimeoutMs?: number }} [options]
 * @returns {typeof fetch}
 */
export function createCircuitBreakerFetch(baseFetch = globalThis.fetch, options = {}) {
  const defaultTimeoutMs = options.timeoutMs || 8000;
  const storageTimeoutMs = options.storageTimeoutMs || 45000;

  return async function circuitBreakerFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : (input && input.url) || (input && typeof input.href === 'string' ? input.href : '');
    const isStorage = typeof url === 'string' && url.includes('/storage/v1/');
    const timeoutMs = init?.timeoutMs || (isStorage ? storageTimeoutMs : defaultTimeoutMs);

    // 1. Fast-fail if circuit breaker is open (in cooldown)
    if (connectionHealth.shouldBypassQuery()) {
      const state = connectionHealth.getState();
      const bypassError = new Error(
        `[CircuitBreaker] Supabase is currently ${state.status}: ${state.errorMessage || 'Queries suspended to prevent freezing.'}`
      );
      bypassError.isCircuitBreakerBypass = true;
      bypassError.status = 503;
      throw bypassError;
    }

    // 2. Enforce request timeout & abort bridging
    const controller = new AbortController();
    let isTimeout = false;
    const timeoutId = setTimeout(() => {
      isTimeout = true;
      controller.abort(new Error(`Supabase request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const callerSignal = init?.signal || (typeof input === 'object' && input?.signal);
    const onCallerAbort = () => {
      controller.abort(callerSignal?.reason);
    };

    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener('abort', onCallerAbort);
      }
    }

    if (controller.signal.aborted) {
      clearTimeout(timeoutId);
      if (callerSignal && !callerSignal.aborted) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
      const abortErr = new Error(
        typeof controller.signal.reason === 'string'
          ? controller.signal.reason
          : controller.signal.reason?.message || 'The operation was aborted'
      );
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    try {
      const response = await Reflect.apply(baseFetch, globalThis, [
        input,
        {
          ...init,
          signal: controller.signal,
        },
      ]);
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
      const isCallerAbort = Boolean(callerSignal?.aborted && !isTimeout);
      if (!isCallerAbort) {
        connectionHealth.handleNetworkError(err);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (callerSignal && !callerSignal.aborted) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
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
