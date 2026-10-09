import assert from 'node:assert/strict';
import {
  connectionHealth,
  ConnectionHealthManager,
  analyzeSupabaseError,
  shouldTriggerVisibilitySync,
  createCircuitBreakerFetch,
} from '../lib/connectionHealth.js';

let totalAssertions = 0;
function track(desc) {
  totalAssertions++;
  console.log(`  ✓ ${desc}`);
}

async function runTests() {
  console.log('--- Running connection-circuit-breaker source-of-truth tests ---\n');

  // =========================================================================
  // Group 1: Error Taxonomy & Diagnostic Pattern Matching (analyzeSupabaseError)
  // =========================================================================
  console.log('▸ Error Taxonomy & Diagnostic Pattern Matching');

  // 1.1 HTTP 503 Paused Project
  const p1 = analyzeSupabaseError({ status: 503 });
  assert.equal(p1.status, 'paused');
  assert.equal(p1.isPaused, true);
  track('HTTP status 503 classified as paused');

  const p2 = analyzeSupabaseError({ response: { status: 503 } });
  assert.equal(p2.status, 'paused');
  assert.equal(p2.isPaused, true);
  track('Nested response status 503 classified as paused');

  // 1.2 Paused explicit body keywords
  const pausedKeywords = [
    'project is paused',
    'database is paused',
    'project_paused',
    'project is temporarily paused',
    'restore it via the supabase dashboard',
    'restore it via supabase dashboard',
    'PROJECT IS PAUSED. RESTORE IT VIA THE SUPABASE DASHBOARD',
  ];
  for (const kw of pausedKeywords) {
    const res = analyzeSupabaseError({ message: kw });
    assert.equal(res.status, 'paused', `Keyword "${kw}" should classify as paused`);
    assert.equal(res.isPaused, true);
  }
  track(`All ${pausedKeywords.length} pause keywords match case-insensitively`);

  // 1.3 Connection pool exhaustion (HTTP 504 and keywords)
  const e1 = analyzeSupabaseError({ status: 504 });
  assert.equal(e1.status, 'exhausted');
  assert.equal(e1.isPaused, true);
  track('HTTP status 504 classified as connection pool exhausted');

  const exhaustedKeywords = [
    'remaining connection slots are reserved for non-replication superuser connections',
    'too many clients already',
    'connection pool exhausted',
    'connection limit exceeded',
    'max client connections reached',
    'server closed the connection unexpectedly',
    'canceling statement due to statement timeout',
    'SERVER CLOSED THE CONNECTION UNEXPECTEDLY',
  ];
  for (const kw of exhaustedKeywords) {
    const res = analyzeSupabaseError({ message: kw });
    assert.equal(res.status, 'exhausted', `Keyword "${kw}" should classify as exhausted`);
    assert.equal(res.isPaused, true);
  }
  track(`All ${exhaustedKeywords.length} pool exhaustion keywords match case-insensitively`);

  // 1.4 DNS resolution failure variants
  const dnsErrors = [
    'POST https://example.supabase.co/auth/v1/token net::ERR_NAME_NOT_RESOLVED',
    'getaddrinfo ENOTFOUND example.supabase.co',
    'could not resolve host: example.supabase.co',
    'queryA NXDOMAIN example.supabase.co',
  ];
  for (const msg of dnsErrors) {
    const res = analyzeSupabaseError(new Error(msg));
    assert.equal(res.status, 'paused', `DNS error "${msg}" should classify as paused`);
    assert.equal(res.isPaused, true);
  }
  track(`All ${dnsErrors.length} DNS resolution failure patterns classify as paused`);

  // 1.5 Network & Transport failures
  const netErrors = [
    'TypeError: Failed to fetch',
    'TypeError: fetch failed',
    'DOMException: NetworkError when attempting to fetch resource',
    'Load failed',
    'TimeoutError: The operation timed out',
    'AbortError: The operation was aborted due to timeout',
  ];
  for (const msg of netErrors) {
    const res = analyzeSupabaseError(new Error(msg));
    assert.equal(res.status, 'offline', `Network error "${msg}" should classify as offline`);
    assert.equal(res.isPaused, true);
  }
  track(`All ${netErrors.length} transport & network failures classify as offline`);

  // 1.6 Business & client application errors (MUST NOT trip circuit breaker)
  const safeErrors = [
    { status: 400, message: 'Bad Request: invalid uuid syntax' },
    { status: 401, message: 'Invalid login credentials' },
    { status: 403, message: 'new row violates row-level security policy for table "expenses"' },
    { status: 404, message: 'JSON object requested, multiple (or no) rows returned' },
    { status: 409, message: 'duplicate key value violates unique constraint' },
    { status: 422, message: 'Unprocessable Entity' },
    { status: 429, message: 'Too Many Requests: rate limit exceeded' },
    new Error('Validation failed: amount must be a positive number'),
  ];
  for (const err of safeErrors) {
    const res = analyzeSupabaseError(err);
    assert.equal(res.status, 'healthy', `Safe error "${err.message || err}" must not trip`);
    assert.equal(res.isPaused, false);
  }
  track(`All ${safeErrors.length} business/client HTTP errors safely remain healthy`);

  // 1.7 Pathological & edge-case inputs
  assert.equal(analyzeSupabaseError(null).status, 'healthy');
  assert.equal(analyzeSupabaseError(undefined).status, 'healthy');
  assert.equal(analyzeSupabaseError('').status, 'healthy');
  assert.equal(analyzeSupabaseError({}).status, 'healthy');
  assert.equal(analyzeSupabaseError(404).status, 'healthy');

  // Circular reference object safety
  const circularObj = { message: 'project is paused' };
  circularObj.self = circularObj;
  const circularRes = analyzeSupabaseError(circularObj);
  assert.equal(circularRes.status, 'paused');

  // OAuth error_description format
  const oauthErr = { error_description: 'Database is paused. Unpause in dashboard.' };
  assert.equal(analyzeSupabaseError(oauthErr).status, 'paused');
  track('Pathological, circular, and OAuth-shaped error objects handled safely');

  // =========================================================================
  // Group 2: Circuit Breaker State Transitions & Lifecycle
  // =========================================================================
  console.log('\n▸ Circuit Breaker State Transitions & Lifecycle');

  connectionHealth.reset();
  const baseline = connectionHealth.getState();
  assert.equal(baseline.status, 'healthy');
  assert.equal(baseline.isPaused, false);
  assert.equal(baseline.errorMessage, null);
  assert.equal(connectionHealth.shouldBypassQuery(), false);
  track('Initial baseline state is healthy with bypass inactive');

  // Trip to paused
  connectionHealth.trip('paused', 'Project paused by admin', 100);
  const statePaused = connectionHealth.getState();
  assert.equal(statePaused.status, 'paused');
  assert.equal(statePaused.isPaused, true);
  assert.equal(statePaused.errorMessage, 'Project paused by admin');
  assert.equal(connectionHealth.shouldBypassQuery(), true);
  track('Tripping to paused activates query bypass and records message');

  // Trip to exhausted
  connectionHealth.trip('exhausted', 'Connection slots full', 100);
  assert.equal(connectionHealth.getState().status, 'exhausted');
  assert.equal(connectionHealth.getState().isPaused, true);
  track('Tripping to exhausted updates status and maintains query bypass');

  // Cooldown expiration
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(connectionHealth.shouldBypassQuery(), false);
  track('Cooldown expiration unblocks query bypass after elapsed duration');

  // Reset restores clean slate
  connectionHealth.reset();
  const resetState = connectionHealth.getState();
  assert.equal(resetState.status, 'healthy');
  assert.equal(resetState.isPaused, false);
  assert.equal(resetState.errorMessage, null);
  assert.equal(resetState.cooldownUntil, null);
  track('Reset method fully restores healthy state and clears cooldown');

  // handleSuccess self-healing from paused state
  connectionHealth.trip('paused', 'Outage simulated', 50000);
  connectionHealth.handleSuccess();
  assert.equal(connectionHealth.getState().status, 'healthy');
  assert.equal(connectionHealth.getState().isPaused, false);
  track('handleSuccess method heals tripped state back to healthy');

  // =========================================================================
  // Group 3: Multi-Subscriber Pub/Sub & Fault Isolation
  // =========================================================================
  console.log('\n▸ Multi-Subscriber Pub/Sub & Fault Isolation');

  connectionHealth.reset();
  let sub1Calls = 0;
  let sub2Calls = 0;
  let sub3Calls = 0;
  let lastSub2Status = '';

  const originalConsoleError = console.error;
  console.error = () => {};

  const unsub1 = connectionHealth.subscribe(() => {
    sub1Calls++;
    throw new Error('Subscriber 1 deliberate crash test');
  });
  const unsub2 = connectionHealth.subscribe((s) => {
    sub2Calls++;
    lastSub2Status = s.status;
  });
  const unsub3 = connectionHealth.subscribe(() => {
    sub3Calls++;
  });

  // Verify immediate execution on subscription
  assert.equal(sub1Calls, 1);
  assert.equal(sub2Calls, 1);
  assert.equal(sub3Calls, 1);
  track('All subscribers immediately receive current state on subscribe()');

  // Trigger notification — Subscriber 1 throws, Subscriber 2 & 3 must still receive!
  connectionHealth.trip('paused', 'Broadcast test', 30000);
  assert.equal(sub1Calls, 2);
  assert.equal(sub2Calls, 2);
  assert.equal(sub3Calls, 2);
  assert.equal(lastSub2Status, 'paused');
  track('Fault isolation: Throwing subscriber does not prevent sibling subscribers from receiving');

  console.error = originalConsoleError;

  // Unsubscribe cleanly
  unsub1();
  unsub2();
  unsub3();

  // Idempotent unsubscribe safety
  unsub1();
  unsub2();

  connectionHealth.reset();
  assert.equal(sub2Calls, 2, 'Unsubscribed listener must not be called after reset');
  track('Unsubscribe cleans up listeners and is safely idempotent');

  // =========================================================================
  // Group 4: LocalStorage Persistence & Cold Boot Resilience
  // =========================================================================
  console.log('\n▸ LocalStorage Persistence & Cold Boot Resilience');

  const mockStorageMap = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (mockStorageMap.has(k) ? mockStorageMap.get(k) : null),
      setItem: (k, v) => mockStorageMap.set(k, String(v)),
      removeItem: (k) => mockStorageMap.delete(k),
    },
  };

  // 4.1 Persistence on trip
  connectionHealth.trip('paused', 'Persistent pause test', 60000);
  assert.ok(mockStorageMap.has('sb_connection_health'), 'Paused state must be saved to storage');
  const storedJson = JSON.parse(mockStorageMap.get('sb_connection_health'));
  assert.equal(storedJson.isPaused, true);
  assert.equal(storedJson.status, 'paused');
  assert.equal(storedJson.errorMessage, 'Persistent pause test');
  track('trip() serializes and saves paused state to localStorage');

  // 4.2 Cold boot reconstitution
  const coldBootManager = new ConnectionHealthManager();
  const coldState = coldBootManager.getState();
  assert.equal(coldState.isPaused, true);
  assert.equal(coldState.status, 'paused');
  assert.equal(coldState.errorMessage, 'Persistent pause test');
  assert.equal(coldBootManager.shouldBypassQuery(), true);
  track('New ConnectionHealthManager boots with preserved paused state from storage');

  // 4.3 Storage removal on reset
  connectionHealth.reset();
  assert.equal(mockStorageMap.has('sb_connection_health'), false);
  track('reset() removes state item from localStorage');

  // 4.4 Corrupted JSON in storage does not crash constructor
  mockStorageMap.set('sb_connection_health', '{"invalid_json: true');
  const resilientManager = new ConnectionHealthManager();
  assert.equal(resilientManager.getState().status, 'healthy');
  assert.equal(resilientManager.getState().isPaused, false);
  track('Corrupted JSON in localStorage is safely ignored on boot');

  // 4.5 Storage setItem throwing (QuotaExceededError or private mode SecurityError)
  globalThis.window.localStorage.setItem = () => {
    const quotaErr = new Error('QuotaExceededError: storage limit reached');
    quotaErr.name = 'QuotaExceededError';
    throw quotaErr;
  };
  // Should not throw
  connectionHealth.trip('exhausted', 'Storage throwing test', 10000);
  assert.equal(connectionHealth.getState().status, 'exhausted');
  track('Storage quota / security exceptions are swallowed without crashing app');

  delete globalThis.window;

  // =========================================================================
  // Group 5: Fetch Interceptor (createCircuitBreakerFetch) Invariants
  // =========================================================================
  console.log('\n▸ Fetch Interceptor (createCircuitBreakerFetch) Invariants');

  connectionHealth.reset();

  // 5.1 Fast-fail latency & zero egress
  connectionHealth.trip('paused', 'Fast fail test', 30000);
  let networkTouched = false;
  const mockFetchBlocked = async () => {
    networkTouched = true;
    return new Response('{}', { status: 200 });
  };
  const fastFailFetch = createCircuitBreakerFetch(mockFetchBlocked, { timeoutMs: 5000 });

  const startTime = Date.now();
  let caughtBypassErr = null;
  try {
    await fastFailFetch('https://example.supabase.co/rest/v1/expenses');
  } catch (err) {
    caughtBypassErr = err;
  }
  const elapsed = Date.now() - startTime;

  assert.ok(caughtBypassErr !== null, 'Must reject fast-fail request');
  assert.equal(caughtBypassErr.isCircuitBreakerBypass, true);
  assert.equal(caughtBypassErr.status, 503);
  assert.equal(networkTouched, false, 'Network must NEVER be touched when circuit breaker is active');
  assert.ok(elapsed < 20, `Fast-fail must complete in <20ms (took ${elapsed}ms)`);
  track('Fast-fail query bypass rejects in <20ms with zero network egress');

  // 5.2 Response body preservation on 503 (Body stream cloning)
  connectionHealth.reset();
  const mock503Fetch = async () => {
    return new Response(JSON.stringify({ message: 'Project is paused. Restore it via Supabase.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const interceptor503 = createCircuitBreakerFetch(mock503Fetch);
  const res503 = await interceptor503('https://example.supabase.co/rest/v1/test');

  // Interceptor tripped breaker
  assert.equal(connectionHealth.getState().status, 'paused');
  assert.equal(connectionHealth.getState().isPaused, true);

  // Consumer can still consume the response body because interceptor used response.clone()!
  const bodyJson = await res503.json();
  assert.equal(bodyJson.message, 'Project is paused. Restore it via Supabase.');
  track('HTTP 503 body stream preserved for consumer reading via clone()');

  // 5.3 Non-outage HTTP responses pass through without tripping
  connectionHealth.reset();
  const safeStatuses = [200, 201, 204, 400, 401, 403, 404, 409, 422];
  for (const status of safeStatuses) {
    const mockPassFetch = async () => new Response(status === 204 ? null : '{"ok":true}', { status });
    const wrappedPassFetch = createCircuitBreakerFetch(mockPassFetch);
    const resp = await wrappedPassFetch('https://example.supabase.co/rest/v1/test');
    assert.equal(resp.status, status);
    assert.equal(connectionHealth.getState().status, 'healthy');
    assert.equal(connectionHealth.getState().isPaused, false);
  }
  track(`All ${safeStatuses.length} non-outage HTTP status codes pass through without tripping breaker`);

  // 5.4 Timeout enforcement
  connectionHealth.reset();
  const hangingFetch = async (_url, init) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response('{}', { status: 200 })), 1000);
      if (init?.signal) {
        init.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    });
  };
  const timeoutFetch = createCircuitBreakerFetch(hangingFetch, { timeoutMs: 40 });
  await assert.rejects(async () => {
    await timeoutFetch('https://example.supabase.co/rest/v1/test');
  }, /timed out|aborted/);
  assert.equal(connectionHealth.getState().status, 'offline');
  track('Hanging request aborted on timeout and correctly trips circuit breaker');

  // 5.5 Caller-initiated abort (e.g. React unmount) DOES NOT trip circuit breaker
  connectionHealth.reset();
  const clientAbortController = new AbortController();
  const cancellableFetch = createCircuitBreakerFetch(hangingFetch, { timeoutMs: 5000 });
  const pendingPromise = cancellableFetch('https://example.supabase.co/rest/v1/test', {
    signal: clientAbortController.signal,
  });
  // Caller unmounts/aborts immediately
  clientAbortController.abort('Component unmounted');

  await assert.rejects(async () => {
    await pendingPromise;
  }, /aborted/);
  // BREAKER MUST STAY HEALTHY!
  assert.equal(
    connectionHealth.getState().status,
    'healthy',
    'Caller-initiated abort must NOT trip circuit breaker to offline/paused'
  );
  assert.equal(connectionHealth.shouldBypassQuery(), false);
  track('Caller-initiated abort (React component unmount) does NOT trip circuit breaker');

  // 5.6 Already-aborted signal rejection
  const preAbortedController = new AbortController();
  preAbortedController.abort('Pre-aborted');
  const preAbortedFetch = createCircuitBreakerFetch(async () => new Response('{}', { status: 200 }));
  await assert.rejects(async () => {
    await preAbortedFetch('https://example.supabase.co/rest/v1/test', {
      signal: preAbortedController.signal,
    });
  });
  assert.equal(connectionHealth.getState().status, 'healthy');
  track('Pre-aborted AbortSignal rejects immediately without tripping breaker');

  // 5.7 Input polymorphism: Accepts string URL, Request object, and URL object
  const echoFetch = async (input) => {
    const urlStr = typeof input === 'string' ? input : input.url || input.href || '';
    return new Response(JSON.stringify({ url: urlStr }), { status: 200 });
  };
  const polymorphicFetch = createCircuitBreakerFetch(echoFetch);

  const r1 = await polymorphicFetch('https://example.supabase.co/rest/v1/string');
  const d1 = await r1.json();
  assert.equal(d1.url, 'https://example.supabase.co/rest/v1/string');

  const r2 = await polymorphicFetch({ url: 'https://example.supabase.co/rest/v1/request-obj' });
  const d2 = await r2.json();
  assert.equal(d2.url, 'https://example.supabase.co/rest/v1/request-obj');

  const r3 = await polymorphicFetch(new URL('https://example.supabase.co/rest/v1/url-obj'));
  const d3 = await r3.json();
  assert.equal(d3.url, 'https://example.supabase.co/rest/v1/url-obj');
  track('Fetch interceptor handles string URL, Request object, and URL instances');

  // =========================================================================
  // Group 6: Proactive Backend Probe (checkHealth)
  // =========================================================================
  console.log('\n▸ Proactive Backend Probe (checkHealth)');

  connectionHealth.reset();

  // 6.1 State transition to 'checking'
  let sawCheckingStatus = false;
  const unsubProbe = connectionHealth.subscribe((s) => {
    if (s.status === 'checking') sawCheckingStatus = true;
  });

  // Mock global fetch for health check tests
  const originalFetch = globalThis.fetch;

  // 6.2 Success probe (200 OK)
  globalThis.fetch = async () => new Response('[]', { status: 200 });
  const aliveResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(aliveResult, true);
  assert.equal(connectionHealth.getState().status, 'healthy');
  assert.equal(sawCheckingStatus, true);
  track('200 OK probe transitions through "checking", restores healthy, and returns true');

  // 6.3 503 Paused probe
  globalThis.fetch = async () =>
    new Response('Project is paused', { status: 503 });
  const pausedResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(pausedResult, false);
  assert.equal(connectionHealth.getState().status, 'paused');
  assert.equal(connectionHealth.getState().isPaused, true);
  track('503 Paused probe trips breaker to paused and returns false');

  // 6.4 504 Gateway timeout probe
  globalThis.fetch = async () =>
    new Response('Gateway Timeout', { status: 504 });
  const exhaustedResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(exhaustedResult, false);
  assert.equal(connectionHealth.getState().status, 'exhausted');
  track('504 Gateway Timeout probe trips breaker to exhausted and returns false');

  // 6.5 Offline / DNS network error probe
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch net::ERR_NAME_NOT_RESOLVED');
  };
  const offlineResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(offlineResult, false);
  assert.equal(connectionHealth.getState().status, 'paused');
  track('DNS failure probe trips breaker to paused and returns false');

  // 6.6 Missing configuration
  const missingResult = await connectionHealth.checkHealth('', '');
  assert.equal(missingResult, false);
  track('Missing credentials probe gracefully returns false without dispatching fetch');

  globalThis.fetch = originalFetch;
  unsubProbe();

  // =========================================================================
  // Group 7: Visibility Sync Throttling (shouldTriggerVisibilitySync)
  // =========================================================================
  console.log('\n▸ Visibility Sync Throttling (shouldTriggerVisibilitySync)');

  connectionHealth.reset();
  connectionHealth.resetSyncThrottle();

  // 7.1 First call allowed
  assert.equal(shouldTriggerVisibilitySync(), true);
  track('Initial sync trigger is permitted when healthy');

  // 7.2 Immediate successive calls within 30s throttled
  assert.equal(shouldTriggerVisibilitySync(), false);
  assert.equal(shouldTriggerVisibilitySync(), false);
  track('Successive triggers within 30s window are throttled');

  // 7.3 Burst simulation: 10 rapid switches
  connectionHealth.resetSyncThrottle();
  let allowedCount = 0;
  for (let i = 0; i < 10; i++) {
    if (shouldTriggerVisibilitySync()) allowedCount++;
  }
  assert.equal(allowedCount, 1, 'Burst of 10 rapid triggers must permit exactly 1 sync');
  track('Burst of 10 rapid tab focus events permits exactly 1 request');

  // 7.4 Hard-gate when paused
  connectionHealth.trip('paused', 'Paused gate test', 30000);
  connectionHealth.resetSyncThrottle(); // force window open
  assert.equal(shouldTriggerVisibilitySync(), false, 'Must be hard-gated when paused');
  track('Visibility sync is hard-gated when database is paused even if throttle elapsed');

  // 7.5 Recovery unblocking
  connectionHealth.reset();
  connectionHealth.resetSyncThrottle();
  assert.equal(shouldTriggerVisibilitySync(), true);
  track('Sync is immediately unblocked after circuit breaker reset');

  // =========================================================================
  // Summary
  // =========================================================================
  console.log(`\nAll connection-circuit-breaker tests passed! (${totalAssertions} assertions verified)`);
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
