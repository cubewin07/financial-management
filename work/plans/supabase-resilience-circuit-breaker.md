# Graceful Supabase Paused & Connection Exhaustion Resilience Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the application from hanging, freezing, or continuously spamming Supabase when the project is paused or when PostgreSQL connection pool limits are exceeded, failing gracefully with informative user feedback and self-healing controls.

**Architecture:** 4-layer defense-in-depth architecture:
1. Transport Layer: Global fetch interceptor with 8-second request timeout (`AbortSignal.timeout`) and HTTP 503/504/paused inspection.
2. Coordination Layer: Centralized Connection Health & Circuit Breaker manager (`connectionHealth.ts`) with fail-fast query bypass and 30-second cooldown.
3. Sync Layer: Throttled visibility and focus listeners across hooks, gating sync requests when the database is unhealthy.
4. Presentation Layer: Unblocked initial loaders in `useMembership` / `App`, paired with a touch-friendly, mobile-first `DatabasePausedBanner` with manual retry and dashboard deep link.

**Tech Stack:** React 18, TypeScript, Supabase JS v2, Tailwind CSS, Lucide icons, Framer Motion.

## Global Constraints
- Do not introduce heavy third-party state libraries; use lightweight custom subscription state.
- Preserve 100% compatibility with existing test suites (`npm test`).
- Prioritize iPhone mobile UX: high density, no infinite screen blockers, touch-friendly buttons.
- Surgical changes only: touch only connection handling, sync listeners, and error fallbacks.

---

## User Review Required

> [!IMPORTANT]
> **Default Behavior on Paused Backend**:
> When Supabase is paused, queries will fail fast in <10ms (rather than hanging for 60 seconds).
> The app will allow the user to view previously cached/in-memory data in read-only mode, and `useMembership` will default to `'owner'` rather than locking the user out on a full-screen loading spinner.

> [!NOTE]
> **Dashboard Link**:
> The banner will extract your Supabase project ref from `import.meta.env.VITE_SUPABASE_URL` to create a direct 1-tap link to your Supabase Project Dashboard (`https://supabase.com/dashboard/project/<project-ref>`), allowing you to unpause the project with one tap from your phone.

---

## Proposed Changes

### Layer 1 & 2: Transport & Central Circuit Breaker

#### [NEW] `src/lib/connectionHealth.ts`
- Tracks status: `'healthy' | 'paused' | 'exhausted' | 'offline' | 'checking'`.
- Detects error patterns:
  - 503 Service Unavailable, `"project is paused"`, `"database is paused"`
  - 504 Gateway Timeout, `"remaining connection slots are reserved"`, `"too many clients"`, `"connection pool exhausted"`
  - Network timeouts and fetch failures.
- Exports:
  - `connectionHealth`: Singleton manager with `shouldBypassQuery()`, `tripCircuitBreaker()`, `handleHttpError()`, `handleNetworkError()`, `resetCircuitBreaker()`, `checkConnectionHealth()`.
  - `useConnectionHealth()`: React hook for reactive UI updates.
  - `shouldTriggerVisibilitySync()`: Throttle helper enforcing 30-second cooldown and health checks before background sync.

#### [MODIFY] `src/lib/supabaseClient.ts`
- Configure `createClient` with `global: { fetch: customFetch }`:
  - Wraps native `fetch` with an 8-second timeout (`AbortSignal.timeout(8000)`).
  - Checks `connectionHealth.shouldBypassQuery()`: immediately throws a fail-fast circuit breaker error if backend is already known to be paused/exhausted.
  - Inspects 503/504 responses to trip circuit breaker on first detection.
  - Recovers to healthy on successful response.

---

### Layer 3: Sync & Hook Throttling

#### [MODIFY] `src/hooks/useMembership.js`
- Wrap membership query with safety timeout and graceful degradation:
  - If Supabase is paused or query times out, do NOT hold `accessLoading: true` indefinitely.
  - Default `role: 'owner'`, `setAccessLoading(false)`, and record connection error cleanly.

#### [MODIFY] `src/hooks/useSubscriptions.js`
- Use `shouldTriggerVisibilitySync()` on `visibilitychange` and `focus` events so mobile app wake-up does not blast paused endpoints.
- If circuit breaker is open, skip query and Realtime channel churn.

#### [MODIFY] `src/hooks/useUserSettings.js`
- Apply `shouldTriggerVisibilitySync()` to background visibility sync.
- Fail gracefully without clearing local defaults.

#### [MODIFY] `src/hooks/useCarryOver.js`
- Apply `shouldTriggerVisibilitySync()` to visibility listener.

#### [MODIFY] `src/hooks/useReceiptQueue.js`
- Apply `shouldTriggerVisibilitySync()` to visibility listener.

---

### Layer 4: Mobile-First UI & Fallback

#### [NEW] `src/components/shell/DatabasePausedBanner.jsx`
- Sleek, compact banner displayed when `isPaused` or `isExhausted` is true.
- Amber/purple glowing badge with Database and AlertTriangle icons.
- Displays clear diagnosis: *"Supabase project is paused or connection pool is full"*.
- **"Retry Connection"** button: Triggers `checkConnectionHealth()` with micro-spinner.
- **"Open Dashboard"** button: Direct link to project dashboard.
- Mobile optimized: dense row layout, high contrast, touch targets >= 44px.

#### [MODIFY] `src/App.jsx`
- Import and render `DatabasePausedBanner`.
- Update `loadExpenses` to ensure `expensesLoading` always clears even on network timeout or circuit breaker bypass.
- Display `DatabasePausedBanner` smoothly via Framer Motion.

---

## Verification Plan

### Automated Tests
- Create unit test suite: `src/tests/connection-circuit-breaker.test.js`:
  1. Test error pattern detection (paused project vs connection pool limit vs normal error).
  2. Test circuit breaker tripping and `shouldBypassQuery()` fast-fail behavior.
  3. Test cooldown expiration and recovery.
  4. Test `shouldTriggerVisibilitySync()` 30-second throttling.
  5. Test request timeout aborting.
- Run complete test suite:
  ```bash
  npm test
  ```

### Manual Verification
1. Verify Vite dev server boots cleanly (`npm run dev` or `npm run build`).
2. Simulate a 503 paused project: verify the app instantly surfaces the `DatabasePausedBanner` within 8 seconds instead of hanging.
3. Switch browser tabs / mobile orientation: verify hooks do not send requests when the circuit breaker is active.
4. Click "Retry Connection" button: verify smooth checking state transition.
5. Verify regular dashboard interaction remains 100% normal and fast when backend is healthy.
