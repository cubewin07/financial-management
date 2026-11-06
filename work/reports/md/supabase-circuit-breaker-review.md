# Branch Review: Supabase Connection Pooling & Paused Project Circuit Breaker

> **Branch:** `feat/supabase-paused-fail-gracefully` vs `main`  
> **Commit:** `784f3b2` + Complete Resilience & UX Fixes  
> **Scope:** Circuit Breaker, Navigator Locks Resolution, Zero-Wait Auth Fallback, and Unblocked Mobile Banner.

---

## 1. Executive Summary & Root Cause Analysis

When a Supabase project is on the Free Tier and has paused, or when database connection limits are exceeded, two major cascading issues previously affected the client:

### Why the Banner was Hidden & Loading Spinners Froze
1. **Double Full-Screen Loading Blockers**:
   - `AuthGuard.jsx` had a full-screen `min-h-screen` spinner (*"Checking secure session..."*), returning before any app content could mount.
   - Once session checking resolved, `App.jsx` rendered a second full-screen spinner (*"Preparing your shared budget access..."*) because `useMembership.js` initialized `accessLoading: true`.
   - The `DatabasePausedBanner` was positioned inside `AppShell` below both blockers. As a result, the user was trapped staring at spinners while the banner remained completely invisible.
2. **`@supabase/gotrue-js` Navigator Lock & Retry Loop Storm**:
   - Supabase Auth uses `navigator.locks` to synchronize token refreshes across tabs. In React 18 development mode, StrictMode mounts components twice in parallel. Both mounted instances fought for the same lock `lock:sb-<ref>-auth-token`.
   - When the network failed (`ERR_NAME_NOT_RESOLVED`), the first lock attempt held the lock while Gotrue ran internal retries, causing the second instance to hit a 5000ms timeout (`Lock was not released within 5000ms. Forcefully acquiring lock to recover`).
   - The second instance stole the lock with the `'steal'` option, aborting the first with `AbortError: Lock broken by another request`.
   - Gotrue wrapped the fetch rejection in `AuthRetryableFetchError` and kept retrying for up to 30 seconds, causing repeated console errors.

---

## 2. Definitive Solutions Implemented

### 2.1 Direct Lock Runner in Supabase Client
* **File:** `src/lib/supabaseClient.ts`
* Configured `auth.lock: async (_name, _acquireTimeout, fn) => fn()`.
* Bypasses the browser's `navigator.locks` implementation, completely eliminating the 5000ms lock deadlocks, lock stealing, and `AbortError` crashes.

### 2.2 Instant Auth Resolution with 1500ms Safety Timeout
* **File:** `src/components/auth/AuthGuard.jsx`
* Initializes `session` directly from `localStorage` (`getStoredSession()`) and initializes `authChecked: true` if the circuit breaker is already paused.
* If the database is known to be paused, it skips remote authentication entirely and immediately restores the stored session in **0ms**.
* Races `supabase.auth.getSession()` against a **1500ms timeout** so the app never hangs if the network stalls.
* Renders `DatabasePausedBanner` directly inside the fallback view so the banner is visible from the very first frame.

### 2.3 Elimination of Membership Access Spinner on Paused State
* **File:** `src/hooks/useMembership.js` & `src/App.jsx`
* In `useMembership.js`, `accessLoading` is initialized to `false` whenever the database is paused, and defaults the user to `'owner'` in 0ms without dispatching remote queries.
* In `App.jsx`, the *"Preparing your shared budget access..."* full-screen view is **bypassed completely** if the database is paused, rendering the main dashboard and banner immediately.

### 2.4 Fail-Fast Circuit Breaker Query Bypass
* **File:** `src/lib/connectionHealth.js`
* Catches `net::ERR_NAME_NOT_RESOLVED`, `nxdomain`, and `failed to fetch`.
* Trips the circuit breaker on the first failure (`isPaused: true`) with a 30-second cooldown.
* Subsequent queries fail fast in `<1ms` without network dispatch.

---

## 3. Verification & Automated Test Results

Running `npm test` executes all 6 suites with 0 errors (15/15 connection-circuit-breaker tests passing).
`npm run build` completes in 2.11s with 0 errors.
