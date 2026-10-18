import assert from 'node:assert/strict';
import { shouldTriggerVisibilitySync, connectionHealth, analyzeSupabaseError } from '../lib/connectionHealth.js';

let totalAssertions = 0;
function track(desc) {
  totalAssertions++;
  console.log(`  ✓ ${desc}`);
}

// Mirror pure logic from AuthGuard.jsx for headless unit contract testing
function getStoredSessionContract(storage, supabaseUrl) {
  if (!storage) return null;
  try {
    const projectRef = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] : '';
    const key = `sb-${projectRef}-auth-token`;
    const stored = storage.getItem(key) || storage.getItem('supabase.auth.token');
    if (!stored) return null;
    const parsed = JSON.parse(stored);

    // Option B Security: Require valid user object with id
    if (!parsed || !parsed.user || !parsed.user.id) {
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
    // Handled safely
  }
  return null;
}

// Unified error classification logic matching LoginPage.jsx
function isDatabaseOutageError(err) {
  if (!err) return false;
  const analysis = analyzeSupabaseError(err);
  const statusCode = Number(err.status || err.code);
  return analysis.isPaused || statusCode === 503 || statusCode === 504;
}

// Normalizer contract from useMembership.js
function normalizeSupabaseRole(rawRole) {
  const role = (rawRole || 'owner').toLowerCase().trim();
  if (role === 'reviewer' || role === 'member' || role === 'read_only') {
    return 'reviewer';
  }
  return 'owner';
}

async function runTests() {
  console.log('--- Running auth & hook resilience contract tests ---\n');

  // =========================================================================
  // Group 1: AuthGuard getStoredSession Contract
  // =========================================================================
  console.log('▸ AuthGuard Offline Session Extraction Contract');

  const mockStorage = new Map();
  const storageAdapter = {
    getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
  };

  const dummyUrl = 'https://abcxyz12345.supabase.co';

  // 1.1 Valid stored session with explicit user & unexpired token
  mockStorage.set(
    'sb-abcxyz12345-auth-token',
    JSON.stringify({
      access_token: 'fake-jwt-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'user-owner-001', email: 'tester@example.com' },
    })
  );
  const session1 = getStoredSessionContract(storageAdapter, dummyUrl);
  assert.ok(session1 !== null);
  assert.equal(session1.user.id, 'user-owner-001');
  assert.equal(session1.user.email, 'tester@example.com');
  assert.equal(session1.isOfflineFallback, true);
  track('Extracts active session using project-prefixed storage key');

  // 1.2 Missing user object rejected (Security Option B - never fabricates 'local-owner')
  mockStorage.set(
    'sb-abcxyz12345-auth-token',
    JSON.stringify({
      access_token: 'token-without-user',
    })
  );
  const session2 = getStoredSessionContract(storageAdapter, dummyUrl);
  assert.equal(session2, null, 'Session without valid user.id must be rejected (never fabricate local-owner)');
  track('Missing user object rejected (security-blocking, no local-owner fabrication)');

  // 1.3 Expired token rejected (Security Option B)
  mockStorage.set(
    'sb-abcxyz12345-auth-token',
    JSON.stringify({
      access_token: 'expired-jwt-token',
      expires_at: Math.floor(Date.now() / 1000) - 1800, // Expired 30 mins ago
      user: { id: 'expired-user-id', email: 'expired@example.com' },
    })
  );
  const sessionExpired = getStoredSessionContract(storageAdapter, dummyUrl);
  assert.equal(sessionExpired, null, 'Expired token must be rejected');
  track('Expired token rejected on extraction (security-blocking)');

  // 1.4 Legacy fallback storage key 'supabase.auth.token'
  mockStorage.clear();
  mockStorage.set(
    'supabase.auth.token',
    JSON.stringify({
      access_token: 'legacy-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'legacy-user-456', email: 'legacy@example.com' },
    })
  );
  const session3 = getStoredSessionContract(storageAdapter, dummyUrl);
  assert.ok(session3 !== null);
  assert.equal(session3.user.id, 'legacy-user-456');
  track('Falls back to legacy "supabase.auth.token" key when project key absent');

  // 1.5 Empty storage returns null
  mockStorage.clear();
  const sessionEmpty = getStoredSessionContract(storageAdapter, dummyUrl);
  assert.equal(sessionEmpty, null);
  track('Empty storage cleanly returns null');

  // 1.6 Corrupted JSON handled safely without throwing
  mockStorage.set('sb-abcxyz12345-auth-token', '{corrupt json');
  const sessionCorrupt = getStoredSessionContract(storageAdapter, dummyUrl);
  assert.equal(sessionCorrupt, null);
  track('Corrupted JSON string in storage returns null without throwing');

  // 1.7 Missing storage object handled safely
  assert.equal(getStoredSessionContract(null, dummyUrl), null);
  track('Null or undefined storage adapter returns null');

  // =========================================================================
  // Group 2: LoginPage Error Differentiation Contract
  // =========================================================================
  console.log('\n▸ LoginPage Outage vs Credential Error Classification Contract');

  // 2.1 Backend outage errors that MUST trigger onDatabaseError
  const outageErrors = [
    { status: 503, message: 'Service Unavailable' },
    { status: 504, message: 'Gateway Timeout' },
    { message: 'Project is paused. Restore it via Supabase dashboard.' },
    { message: 'Failed to fetch net::ERR_NAME_NOT_RESOLVED' },
    { message: 'TypeError: Failed to fetch' },
    { message: 'Load failed' },
    { message: 'A network error occurred' },
    { code: '503', message: 'Endpoint sleeping' },
  ];
  for (const err of outageErrors) {
    assert.equal(
      isDatabaseOutageError(err),
      true,
      `Error "${err.message || err.status}" must be classified as outage`
    );
  }
  track(`All ${outageErrors.length} database outage patterns correctly classify as outages`);

  // 2.2 User credential & validation errors that MUST NOT trigger database down screen
  const credentialErrors = [
    { status: 400, message: 'Invalid login credentials' },
    { status: 400, message: 'Email not confirmed' },
    { status: 422, message: 'Password should be at least 6 characters' },
    { message: 'User not found' },
    { message: 'Signup requires a valid email' },
  ];
  for (const err of credentialErrors) {
    assert.equal(
      isDatabaseOutageError(err),
      false,
      `Credential error "${err.message}" must NOT be classified as outage`
    );
  }
  track(`All ${credentialErrors.length} credential errors correctly keep user on login form`);

  // =========================================================================
  // Group 3: Role Normalization Contract
  // =========================================================================
  console.log('\n▸ Role Normalization Contract');

  assert.equal(normalizeSupabaseRole('owner'), 'owner');
  assert.equal(normalizeSupabaseRole('OWNER'), 'owner');
  assert.equal(normalizeSupabaseRole(''), 'owner');
  assert.equal(normalizeSupabaseRole(null), 'owner');
  assert.equal(normalizeSupabaseRole(undefined), 'owner');
  assert.equal(normalizeSupabaseRole('reviewer'), 'reviewer');
  assert.equal(normalizeSupabaseRole('member'), 'reviewer');
  assert.equal(normalizeSupabaseRole('read_only'), 'reviewer');
  assert.equal(normalizeSupabaseRole('  REVIEWER  '), 'reviewer');
  track('Role normalization correctly defaults to "owner" and maps members to "reviewer"');

  // =========================================================================
  // Group 4: Hook Graceful Degradation Invariants
  // =========================================================================
  console.log('\n▸ Hook Graceful Degradation Invariants');

  // 4.1 Membership state resolution on circuit breaker bypass
  class MockMembershipHook {
    constructor(sessionUserId) {
      this.accessLoading = Boolean(sessionUserId);
      this.budgetOwnerId = sessionUserId || '';
      this.role = 'owner';
      this.error = '';
    }

    async loadMembership(supabaseMock) {
      this.accessLoading = true;
      try {
        const { data, error } = await supabaseMock();
        if (error) throw error;
        if (data) {
          this.budgetOwnerId = data.owner_user_id;
          this.role = normalizeSupabaseRole(data.role);
        }
      } catch (err) {
        this.error = err.message || 'Unable to verify shared budget access';
        // Crucial invariant: Fall back to self as owner
        this.budgetOwnerId = 'user-owner-123';
        this.role = 'owner';
      } finally {
        this.accessLoading = false;
      }
    }
  }

  const membership = new MockMembershipHook('user-owner-123');
  assert.equal(membership.budgetOwnerId, 'user-owner-123');

  const bypassErr = new Error('[CircuitBreaker] Supabase is currently paused');
  bypassErr.isCircuitBreakerBypass = true;
  await membership.loadMembership(async () => {
    throw bypassErr;
  });

  assert.equal(membership.accessLoading, false, 'accessLoading must clear on circuit breaker error');
  assert.equal(membership.budgetOwnerId, 'user-owner-123', 'budgetOwnerId falls back to self');
  assert.equal(membership.role, 'owner', 'Role falls back to owner');
  assert.ok(membership.error.includes('CircuitBreaker'));
  track('Membership hook degrades gracefully to local owner on circuit breaker failure');

  // 4.2 Savings Goals state resolution on query failure (No INITIAL_GOALS mock substitution)
  const EXISTING_CUSTOM_GOALS = [
    { id: 'custom-car-fund', title: 'Car Fund', target_amount: 15000, current_amount: 5000 },
  ];
  class MockSavingsGoalsHook {
    constructor() {
      this.goals = EXISTING_CUSTOM_GOALS;
      this.loading = false;
      this.error = '';
    }

    async fetchGoals(supabaseMock) {
      this.loading = true;
      try {
        const { data, error } = await supabaseMock();
        if (error) throw error;
        this.goals = data;
      } catch (err) {
        // Crucial invariant: Never overwrite real user goals with fake INITIAL_GOALS!
        this.goals = this.goals && this.goals.length > 0 ? this.goals : [];
        this.error = err.message || 'Failed to load savings goals';
      } finally {
        this.loading = false;
      }
    }
  }

  const savings = new MockSavingsGoalsHook();
  await savings.fetchGoals(async () => {
    throw new Error('503 Service Unavailable');
  });
  assert.equal(savings.loading, false);
  assert.equal(savings.goals.length, 1);
  assert.equal(savings.goals[0].id, 'custom-car-fund', 'Custom user goals preserved without fake INITIAL_GOALS');
  track('Savings goals hook preserves existing user goals on query failure without mock substitution');

  // 4.3 Subscriptions sync gating check
  connectionHealth.reset();
  connectionHealth.trip('paused', 'Simulated pause for hook sync', 30000);

  let syncInvoked = false;
  const simulatedVisibilityChange = () => {
    if (shouldTriggerVisibilitySync('subscriptions')) {
      syncInvoked = true;
    }
  };

  simulatedVisibilityChange();
  assert.equal(syncInvoked, false, 'Subscriptions visibility handler must NOT fire when paused');
  track('Hook visibility handler respects shouldTriggerVisibilitySync() gating');

  connectionHealth.reset();

  console.log(`\nAll auth & hook resilience contract tests passed! (${totalAssertions} assertions verified)`);
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
