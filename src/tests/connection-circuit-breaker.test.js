import assert from 'node:assert/strict';
import {
  connectionHealth,
  analyzeSupabaseError,
  shouldTriggerVisibilitySync,
  createCircuitBreakerFetch,
} from '../lib/connectionHealth.js';

async function runTests() {
  console.log('--- Running connection-circuit-breaker tests ---');

  // Reset state before tests
  connectionHealth.reset();

  // Test 1: Initial state is healthy
  const initial = connectionHealth.getState();
  assert.equal(initial.status, 'healthy');
  assert.equal(initial.isPaused, false);
  assert.equal(connectionHealth.shouldBypassQuery(), false);

  // Test 2: Error analysis for paused project
  const pausedAnalysis1 = analyzeSupabaseError({ status: 503, message: 'Project is paused' });
  assert.equal(pausedAnalysis1.status, 'paused');
  assert.equal(pausedAnalysis1.isPaused, true);

  const pausedAnalysis2 = analyzeSupabaseError(new Error('Failed to fetch: Project is paused. Restore it via Supabase dashboard.'));
  assert.equal(pausedAnalysis2.status, 'paused');

  // Test 3: Error analysis for connection pool exhaustion
  const poolAnalysis1 = analyzeSupabaseError({
    status: 500,
    message: 'remaining connection slots are reserved for non-replication superuser connections',
  });
  assert.equal(poolAnalysis1.status, 'exhausted');
  assert.equal(poolAnalysis1.isPaused, true);

  const poolAnalysis2 = analyzeSupabaseError(new Error('connection pool exhausted - max client connections reached'));
  assert.equal(poolAnalysis2.status, 'exhausted');

  // Test 4: Normal application errors do not trigger paused state
  const normalError = analyzeSupabaseError({ status: 404, message: 'Row not found' });
  assert.equal(normalError.status, 'healthy');
  assert.equal(normalError.isPaused, false);

  // Test 5: Tripping the circuit breaker
  connectionHealth.handleHttpError(503, '{"message":"Project is paused. Restore it via the Supabase dashboard."}');
  const trippedState = connectionHealth.getState();
  assert.equal(trippedState.status, 'paused');
  assert.equal(trippedState.isPaused, true);
  assert.equal(connectionHealth.shouldBypassQuery(), true);

  // Test 6: Listener subscription receives updates
  let listenerCalled = false;
  let receivedStatus = '';
  const unsubscribe = connectionHealth.subscribe((state) => {
    listenerCalled = true;
    receivedStatus = state.status;
  });

  connectionHealth.handleHttpError(500, 'remaining connection slots are reserved');
  assert.equal(listenerCalled, true);
  assert.equal(receivedStatus, 'exhausted');
  unsubscribe();

  // Test 7: Resetting circuit breaker
  connectionHealth.reset();
  assert.equal(connectionHealth.getState().status, 'healthy');
  assert.equal(connectionHealth.shouldBypassQuery(), false);

  // Test 8: Cooldown expiration
  connectionHealth.trip('paused', 'Simulated pause', 50); // 50ms cooldown
  assert.equal(connectionHealth.shouldBypassQuery(), true);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(connectionHealth.shouldBypassQuery(), false);

  // Test 9: shouldTriggerVisibilitySync throttling & pause gating
  connectionHealth.reset();
  connectionHealth.resetSyncThrottle();

  // First call succeeds
  assert.equal(shouldTriggerVisibilitySync(), true, 'First visibility sync should be allowed');
  // Immediate second call is throttled
  assert.equal(shouldTriggerVisibilitySync(), false, 'Immediate second call should be throttled');

  // When paused, sync is blocked even if throttle timer has elapsed
  connectionHealth.trip('paused', 'Project paused', 30000);
  connectionHealth.resetSyncThrottle(); // force throttle window open
  assert.equal(shouldTriggerVisibilitySync(), false, 'Visibility sync must be blocked while paused');

  connectionHealth.reset();

  // Test 10: Fetch interceptor fast-fails when circuit breaker is active
  connectionHealth.trip('paused', 'Database paused', 30000);
  let mockFetchCalled = false;
  const mockFetch = async () => {
    mockFetchCalled = true;
    return new Response('{}', { status: 200 });
  };

  const protectedFetch = createCircuitBreakerFetch(mockFetch, { timeoutMs: 1000 });

  let caughtError = null;
  try {
    await protectedFetch('https://example.supabase.co/rest/v1/expenses');
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError !== null, 'Should have thrown circuit breaker error');
  assert.equal(caughtError.isCircuitBreakerBypass, true, 'Error should be tagged as circuit breaker bypass');
  assert.equal(mockFetchCalled, false, 'Doomed network request should NOT have been dispatched');

  // Test 11: Fetch interceptor aborts on timeout
  connectionHealth.reset();
  const hangingFetch = async (_url, init) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response('{}', { status: 200 })), 500);
      if (init?.signal) {
        init.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          const abortErr = new Error('The operation was aborted');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      }
    });
  };

  const timeoutFetch = createCircuitBreakerFetch(hangingFetch, { timeoutMs: 50 });
  let timeoutCaught = null;
  try {
    await timeoutFetch('https://example.supabase.co/rest/v1/test');
  } catch (err) {
    timeoutCaught = err;
  }
  assert.ok(timeoutCaught !== null, 'Hanging request must be aborted');

  // Test 12: Successful response restores health
  connectionHealth.trip('paused', 'Recovering test', 30000);
  const recoveringFetch = createCircuitBreakerFetch(async () => new Response('[]', { status: 200 }));
  // Force bypass to test success recovery
  connectionHealth.reset();
  await recoveringFetch('https://example.supabase.co/rest/v1/test');
  assert.equal(connectionHealth.getState().status, 'healthy');

  console.log('All connection-circuit-breaker tests passed!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
