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

  // 1.6 Business, validation, and SQL errors (MUST NOT trip circuit breaker)
  const safeErrors = [
    { status: 400, message: 'Bad Request: invalid uuid syntax' },
    { status: 401, message: 'Invalid login credentials' },
    { status: 401, message: 'JWT expired' },
    { status: 401, message: 'Secret API key required' },
    { status: 401, message: 'Invalid Refresh Token: Already Used' },
    { status: 403, message: 'Forbidden' },
    { status: 403, message: 'new row violates row-level security policy for table "expenses"' },
    { status: 404, message: 'JSON object requested, multiple (or no) rows returned' },
    { status: 409, message: 'duplicate key value violates unique constraint' },
    { status: 422, message: 'Unprocessable Entity' },
    { status: 429, message: 'Too Many Requests: rate limit exceeded' },
    { message: 'ERROR: 25P02: current transaction is aborted, commands ignored until end of transaction block' },
    { message: 'canceling statement due to statement timeout' },
    new Error('Validation failed: amount must be a positive number'),
  ];
  for (const err of safeErrors) {
    const res = analyzeSupabaseError(err);
    assert.equal(res.status, 'healthy', `Safe error "${err.message || err}" must not trip`);
    assert.equal(res.isPaused, false);
  }
  track(`All ${safeErrors.length} business, validation, and SQL errors safely remain healthy`);

  // 1.7 Client Offline Detection (navigator.onLine === false)
  const originalOnLine = globalThis.navigator?.onLine;
  Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true, writable: true });
  const offlineClientRes = analyzeSupabaseError(new Error('Failed to fetch'));
  assert.equal(offlineClientRes.status, 'offline');
  assert.equal(offlineClientRes.isPaused, false, 'Client offline must not set isPaused to true');
  Object.defineProperty(globalThis.navigator, 'onLine', { value: originalOnLine ?? true, configurable: true, writable: true });
  track('Client offline (navigator.onLine === false) classifies as client offline without isPaused cloud sleep');

  // 1.8 Pathological & edge-case inputs
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

  // 2.2 Trip to paused
  connectionHealth.trip('paused', 'Project paused by admin', 100);
  const pausedState = connectionHealth.getState();
  assert.equal(pausedState.status, 'paused');
  assert.equal(pausedState.isPaused, true);
  assert.equal(pausedState.errorMessage, 'Project paused by admin');
  assert.equal(connectionHealth.shouldBypassQuery(), true);
  track('Tripping to paused activates query bypass and records message');

  // 2.3 Trip to exhausted
  connectionHealth.trip('exhausted', 'Connection slots full', 100);
  const exhaustedState = connectionHealth.getState();
  assert.equal(exhaustedState.status, 'exhausted');
  assert.equal(exhaustedState.isPaused, true);
  assert.equal(connectionHealth.shouldBypassQuery(), true);
  track('Tripping to exhausted updates status and maintains query bypass');

  // 2.4 Cooldown expiration unblocks query bypass
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(
    connectionHealth.shouldBypassQuery(),
    false,
    'Expired cooldown must unblock query bypass for probe'
  );
  track('Cooldown expiration unblocks query bypass after elapsed duration');

  // 2.5 Full reset method
  connectionHealth.reset();
  const resetState = connectionHealth.getState();
  assert.equal(resetState.status, 'healthy');
  assert.equal(resetState.isPaused, false);
  assert.equal(resetState.cooldownUntil, null);
  assert.equal(connectionHealth.shouldBypassQuery(), false);
  track('Reset method fully restores healthy state and clears cooldown');

  // 2.6 handleSuccess recovery
  connectionHealth.trip('paused', 'Transient pause', 5000);
  assert.equal(connectionHealth.getState().status, 'paused');
  connectionHealth.handleSuccess();
  assert.equal(connectionHealth.getState().status, 'healthy');
  assert.equal(connectionHealth.getState().isPaused, false);
  track('handleSuccess method heals tripped state back to healthy');

  // =========================================================================
  // Group 3: Multi-Subscriber Pub/Sub & Fault Isolation
  // =========================================================================
  console.log('\n▸ Multi-Subscriber Pub/Sub & Fault Isolation');

  connectionHealth.reset();
  let sub1Called = 0;
  let sub2Called = 0;
  let sub2ReceivedStatus = '';

  const unsub1 = connectionHealth.subscribe(() => sub1Called++);
  const unsub2 = connectionHealth.subscribe((s) => {
    sub2Called++;
    sub2ReceivedStatus = s.status;
  });

  assert.equal(sub1Called, 1, 'Subscriber 1 must receive initial state on subscribe');
  assert.equal(sub2Called, 1, 'Subscriber 2 must receive initial state on subscribe');
  track('All subscribers immediately receive current state on subscribe()');

  // 3.2 Fault isolation
  const throwingUnsub = connectionHealth.subscribe(() => {
    throw new Error('Exploding UI listener');
  });

  let healthySubscriberSawUpdate = false;
  const resilientUnsub = connectionHealth.subscribe((s) => {
    if (s.status === 'paused') healthySubscriberSawUpdate = true;
  });

  // Trip and verify throwing listener did not prevent resilient listener from firing
  connectionHealth.trip('paused', 'Test isolation', 1000);
  assert.equal(healthySubscriberSawUpdate, true, 'Sibling subscriber must receive event despite throw');
  track('Fault isolation: Throwing subscriber does not prevent sibling subscribers from receiving');

  throwingUnsub();
  resilientUnsub();
  unsub1();
  unsub2();

  // 3.3 Verify unsubscriptions
  sub1Called = 0;
  connectionHealth.trip('exhausted', 'Post-unsub trip', 1000);
  assert.equal(sub1Called, 0, 'Unsubscribed listener must not be called');
  track('Unsubscribe cleans up listeners and is safely idempotent');

  // =========================================================================
  // Group 4: LocalStorage Persistence & Cold Boot Resilience
  // =========================================================================
  console.log('\n▸ LocalStorage Persistence & Cold Boot Resilience');

  const mockStorage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    },
  };

  // 4.1 trip() serializes to localStorage
  connectionHealth.reset();
  connectionHealth.trip('paused', 'Saved across restart', 10000);
  assert.ok(mockStorage.has('sb_connection_health'), 'Storage must contain serialized health state');
  const storedJson = JSON.parse(mockStorage.get('sb_connection_health'));
  assert.equal(storedJson.status, 'paused');
  assert.equal(storedJson.isPaused, true);
  track('trip() serializes and saves paused state to localStorage');

  // 4.2 Cold boot loads active paused state
  const reloadedMgr = new ConnectionHealthManager();
  assert.equal(reloadedMgr.getState().status, 'paused');
  assert.equal(reloadedMgr.getState().isPaused, true);
  track('New ConnectionHealthManager boots with preserved paused state from storage');

  // 4.3 Expired cooldown from localStorage is discarded on boot
  mockStorage.set(
    'sb_connection_health',
    JSON.stringify({
      status: 'paused',
      isPaused: true,
      cooldownUntil: Date.now() - 5000, // Expired 5 seconds ago
    })
  );
  const expiredMgr = new ConnectionHealthManager();
  assert.equal(expiredMgr.getState().isPaused, false, 'Expired cooldown from storage must not lock cold boot');
  track('Expired cooldown in storage is safely discarded on cold boot');

  // 4.4 reset() clears localStorage
  connectionHealth.reset();
  assert.equal(mockStorage.has('sb_connection_health'), false, 'reset() must remove storage item');
  track('reset() removes state item from localStorage');

  // =========================================================================
  // Group 5: Fetch Interceptor (createCircuitBreakerFetch) Invariants
  // =========================================================================
  console.log('\n▸ Fetch Interceptor (createCircuitBreakerFetch) Invariants');

  connectionHealth.trip('paused', 'Testing interceptor', 10000);
  let networkTouched = false;
  const mockBaseFetch = async () => {
    networkTouched = true;
    return new Response('{}', { status: 200 });
  };
  const fastFailFetch = createCircuitBreakerFetch(mockBaseFetch);

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

  // 5.2 Storage requests receive extended timeout (45s)
  connectionHealth.reset();
  const hangingFetch = async (_url, init) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response('{}', { status: 200 })), 100);
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
  // REST query with 30ms timeout times out
  const timeoutRestFetch = createCircuitBreakerFetch(hangingFetch, { timeoutMs: 30, storageTimeoutMs: 200 });
  await assert.rejects(async () => {
    await timeoutRestFetch('https://example.supabase.co/rest/v1/expenses');
  }, /timed out|aborted/);

  // Storage request to /storage/v1/ with 200ms timeout succeeds at 100ms
  connectionHealth.reset();
  const storageRes = await timeoutRestFetch('https://example.supabase.co/storage/v1/object/receipts/doc.pdf');
  assert.equal(storageRes.status, 200);
  track('Storage endpoint receives extended timeout without premature abortion');

  // 5.3 Caller-initiated abort (e.g. React unmount) DOES NOT trip circuit breaker
  connectionHealth.reset();
  const clientAbortController = new AbortController();
  const cancellableFetch = createCircuitBreakerFetch(hangingFetch, { timeoutMs: 5000 });
  const pendingPromise = cancellableFetch('https://example.supabase.co/rest/v1/test', {
    signal: clientAbortController.signal,
  });
  clientAbortController.abort('Component unmounted');

  await assert.rejects(async () => {
    await pendingPromise;
  }, /aborted/);
  assert.equal(connectionHealth.getState().status, 'healthy');
  track('Caller-initiated abort (React component unmount) does NOT trip circuit breaker');

  // =========================================================================
  // Group 6: Proactive Backend Probe (checkHealth)
  // =========================================================================
  console.log('\n▸ Proactive Backend Probe (checkHealth)');

  connectionHealth.reset();
  const originalFetch = globalThis.fetch;

  // 6.1 Success probe (200 OK via /auth/v1/health)
  let probedEndpoint = '';
  globalThis.fetch = async (url) => {
    probedEndpoint = String(url);
    return new Response('{"version":"v2.197.0","name":"GoTrue"}', { status: 200 });
  };
  const aliveResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(aliveResult, true);
  assert.equal(probedEndpoint, 'https://example.supabase.co/auth/v1/health', 'Probe must query Supabase Auth /auth/v1/health');
  assert.equal(connectionHealth.getState().status, 'healthy');
  track('200 OK probe transitions through "checking", restores healthy, and returns true');

  // 6.2 401 Unauthorized probe response verifies server is alive and DOES NOT trip circuit breaker
  globalThis.fetch = async () => new Response('{"message":"Secret API key required"}', { status: 401 });
  const authProbeResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(authProbeResult, true, '401 Unauthorized probe confirms server is alive');
  assert.equal(connectionHealth.getState().isPaused, false, '401 probe must never trip breaker to paused');
  track('401 Unauthorized probe response confirms server liveness without tripping breaker');

  // 6.3 Cloudflare 502 Bad Gateway probe FAILS, does NOT claim healthy, and trips to offline
  globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });
  const badGatewayResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(badGatewayResult, false, '502 Bad Gateway probe must return false');
  assert.notEqual(connectionHealth.getState().status, 'checking', 'Status must not remain stuck in checking');
  assert.equal(connectionHealth.getState().status, 'offline', '502 Bad Gateway must trip to offline');
  track('502 Bad Gateway probe fails, trips to offline, and never remains stuck in checking');

  // 6.4 503 Service Unavailable probe trips to paused
  globalThis.fetch = async () => new Response('{"message":"project is paused"}', { status: 503 });
  const pausedProbeResult = await connectionHealth.checkHealth('https://example.supabase.co', 'anon-key');
  assert.equal(pausedProbeResult, false);
  assert.equal(connectionHealth.getState().status, 'paused');
  track('503 Service Unavailable probe trips circuit breaker to paused');

  // 6.5 Shared in-flight probe promise (coalesces concurrent checks)
  connectionHealth.reset();
  let probeCallCount = 0;
  globalThis.fetch = async () => {
    probeCallCount++;
    await new Promise((r) => setTimeout(r, 40));
    return new Response('[]', { status: 200 });
  };
  const [pA, pB] = await Promise.all([
    connectionHealth.checkHealth('https://example.supabase.co', 'anon-key'),
    connectionHealth.checkHealth('https://example.supabase.co', 'anon-key'),
  ]);
  assert.equal(pA, true);
  assert.equal(pB, true);
  assert.equal(probeCallCount, 1, 'Concurrent checkHealth calls must share a single in-flight probe');
  track('Concurrent health checks share a single in-flight probe Promise');

  globalThis.fetch = originalFetch;

  // =========================================================================
  // Group 7: Visibility Sync Throttling with Hook Namespacing
  // =========================================================================
  console.log('\n▸ Visibility Sync Throttling with Hook Namespacing');

  connectionHealth.reset();
  connectionHealth.resetSyncThrottle();

  // 7.1 Multi-hook independence (Sibling hooks on same tab switch do NOT starve each other)
  assert.equal(shouldTriggerVisibilitySync('receiptQueue'), true, 'receiptQueue must be permitted');
  assert.equal(shouldTriggerVisibilitySync('subscriptions'), true, 'subscriptions must be permitted on same tick');
  assert.equal(shouldTriggerVisibilitySync('userSettings'), true, 'userSettings must be permitted on same tick');
  track('Per-hook visibility sync allows sibling hooks on same tab switch without starvation');

  // 7.2 Repeated calls on the same hook within 30s are throttled
  assert.equal(shouldTriggerVisibilitySync('receiptQueue'), false);
  assert.equal(shouldTriggerVisibilitySync('subscriptions'), false);
  track('Repeated triggers for the same hook within window are throttled');

  // 7.3 Hard-gate when paused
  connectionHealth.trip('paused', 'Paused gate test', 30000);
  connectionHealth.resetSyncThrottle();
  assert.equal(shouldTriggerVisibilitySync('receiptQueue'), false, 'Must be hard-gated when paused');
  track('Visibility sync is hard-gated when database is paused even if throttle elapsed');

  connectionHealth.reset();

  console.log(`\nAll connection-circuit-breaker tests passed! (${totalAssertions} assertions verified)`);
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
