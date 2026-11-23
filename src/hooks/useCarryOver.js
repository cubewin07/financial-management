import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { shouldTriggerVisibilitySync } from '../lib/connectionHealth';
import {
  buildReserveSnapshots,
  computeMonthClose,
  computeReserveAllocation,
  getMonthAllocation,
  getMonthKey,
} from '../utils/carryOver';
import { roundCurrency } from '../utils/finance';

/**
 * Custom hook maintaining carry-over as a single unified persistent state
 * in public.user_settings (avoiding stale multi-month snapshot drift).
 * Carry-over is a reserve outside the budget: it only leaves when the owner moves it.
 */
const MAX_SNAPSHOT_MONTHS = 240;

function createSerialQueue() {
  let tail = Promise.resolve();
  return (task) => {
    const next = tail.then(task, task);
    tail = next.catch(() => {});
    return next;
  };
}

function createInitialState(userId = null) {
  return {
    userId,
    loadedUserId: null,
    carryOver: 0,
    allocation: null,
    closedThrough: null,
    categoryLimits: {},
    error: '',
    isLoading: Boolean(userId),
  };
}

/**
 * Persists a month-close transition to user_settings while preserving CAS safety.
 * When no user_settings row exists yet (expectedClosedThrough is null), inserts
 * the row via ignore-duplicates upsert instead of updating 0 rows.
 */
export async function persistMonthClose({
  client = supabase,
  userId,
  expectedClosedThrough,
  expectedCarryOver = 0,
  nextClosedThrough,
  nextCarryOver,
  updatedAt = new Date().toISOString(),
}) {
  const payload = {
    carry_over: nextCarryOver,
    carry_over_closed_through: nextClosedThrough,
    updated_at: updatedAt,
  };

  const runConditionalUpdate = () => {
    const baseUpdate = client
      .from('user_settings')
      .update(payload)
      .eq('user_id', userId)
      .eq('carry_over', roundCurrency(expectedCarryOver));
    return (
      expectedClosedThrough
        ? baseUpdate.eq('carry_over_closed_through', expectedClosedThrough)
        : baseUpdate.is('carry_over_closed_through', null)
    ).select('user_id');
  };

  const { data: updatedRows, error: updateError } = await runConditionalUpdate();
  if (updateError) {
    return { status: 'error', error: updateError };
  }
  if (updatedRows?.length) {
    return { status: 'persisted' };
  }

  // An already-set closedThrough that matched 0 rows means another writer advanced it.
  if (expectedClosedThrough) {
    return { status: 'conflict' };
  }

  // No row matched carry_over_closed_through IS NULL: insert if absent without
  // overwriting any concurrent writer that already created/closed the row.
  const { data: insertedRows, error: insertError } = await client
    .from('user_settings')
    .upsert({ user_id: userId, ...payload }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('user_id');

  if (insertError) {
    return { status: 'error', error: insertError };
  }
  if (insertedRows?.length) {
    return { status: 'persisted' };
  }

  // Another writer created the row concurrently (e.g. initial settings save with
  // carry_over_closed_through = null). Retry the conditional null update once.
  const { data: retriedRows, error: retryError } = await runConditionalUpdate();
  if (retryError) {
    return { status: 'error', error: retryError };
  }
  if (retriedRows?.length) {
    return { status: 'persisted' };
  }

  return { status: 'conflict' };
}

/**
 * Persists a carry-over reserve deduction (either to a goal or to a month's budget)
 * using compare-and-swap on carry_over, inserting a missing user_settings row when
 * absent and retrying once against fresh DB state if another writer changed carry_over.
 */
export async function persistReserveAllocation({
  client = supabase,
  userId,
  amount,
  expectedCarryOver,
  expectedAllocation = null,
  expectedClosedThrough = null,
  allocateToMonth = null,
  updatedAt = new Date().toISOString(),
}) {
  const hasUnclosedPriorAllocation = (allocationState, closedThrough) =>
    Boolean(
      allocateToMonth &&
      allocationState?.month &&
      allocationState.month < allocateToMonth &&
      roundCurrency(allocationState.amount || 0) > 0 &&
      (!closedThrough || closedThrough < allocationState.month)
    );

  if (hasUnclosedPriorAllocation(expectedAllocation, expectedClosedThrough)) {
    return {
      status: 'pending_close',
      carryOver: roundCurrency(expectedCarryOver),
      allocation: expectedAllocation,
      closedThrough: expectedClosedThrough,
    };
  }

  const buildPlan = (balance, allocationState) => {
    const result = computeReserveAllocation(balance, amount);
    if (!result.ok) {
      return { ok: false, carryOver: roundCurrency(balance) };
    }
    const nextCarryOver = result.nextBalance;
    const nextAllocation = allocateToMonth
      ? {
          month: allocateToMonth,
          amount: roundCurrency(getMonthAllocation(allocationState, allocateToMonth) + result.moved),
        }
      : allocationState;
    const fields = {
      carry_over: nextCarryOver,
      updated_at: updatedAt,
      ...(allocateToMonth
        ? {
            carry_over_allocated: nextAllocation.amount,
            carry_over_allocated_month: allocateToMonth,
          }
        : {}),
    };
    return { ok: true, nextCarryOver, nextAllocation, fields };
  };

  const initialPlan = buildPlan(expectedCarryOver, expectedAllocation);
  if (!initialPlan.ok) {
    return { status: 'insufficient', carryOver: initialPlan.carryOver, allocation: expectedAllocation };
  }

  const applyAllocationCas = (query, allocationState, exactRawAmount = null) => {
    if (!allocateToMonth) return query;
    if (allocationState?.month) {
      return query
        .eq('carry_over_allocated_month', allocationState.month)
        .eq('carry_over_allocated', roundCurrency(allocationState.amount || 0));
    }
    const base = query.is('carry_over_allocated_month', null);
    if (exactRawAmount === null) return base;
    return base.eq('carry_over_allocated', roundCurrency(exactRawAmount));
  };

  const { data: updatedRows, error: updateError } = await applyAllocationCas(
    client
      .from('user_settings')
      .update(initialPlan.fields)
      .eq('user_id', userId)
      .eq('carry_over', roundCurrency(expectedCarryOver)),
    expectedAllocation
  ).select('user_id');

  if (updateError) {
    return { status: 'error', error: updateError };
  }
  if (updatedRows?.length) {
    return {
      status: 'persisted',
      carryOver: initialPlan.nextCarryOver,
      allocation: initialPlan.nextAllocation,
    };
  }

  const { data: existingRow, error: readError } = await client
    .from('user_settings')
    .select('carry_over, carry_over_allocated, carry_over_allocated_month, carry_over_closed_through')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) {
    return { status: 'error', error: readError };
  }

  if (!existingRow) {
    return {
      status: 'insufficient',
      carryOver: 0,
      allocation: null,
      closedThrough: null,
    };
  }

  const freshCarryOver = roundCurrency(existingRow.carry_over || 0);
  const freshAllocation = {
    month: existingRow.carry_over_allocated_month ?? null,
    amount: roundCurrency(existingRow.carry_over_allocated || 0),
  };
  const freshClosedThrough = existingRow.carry_over_closed_through ?? null;

  if (hasUnclosedPriorAllocation(freshAllocation, freshClosedThrough)) {
    return {
      status: 'pending_close',
      carryOver: freshCarryOver,
      allocation: freshAllocation,
      closedThrough: freshClosedThrough,
    };
  }

  const retryPlan = buildPlan(freshCarryOver, freshAllocation);
  if (!retryPlan.ok) {
    return {
      status: 'insufficient',
      carryOver: freshCarryOver,
      allocation: freshAllocation,
      closedThrough: freshClosedThrough,
    };
  }

  const { data: retriedRows, error: retryError } = await applyAllocationCas(
    client
      .from('user_settings')
      .update(retryPlan.fields)
      .eq('user_id', userId)
      .eq('carry_over', freshCarryOver),
    freshAllocation,
    existingRow.carry_over_allocated ?? 0
  ).select('user_id');

  if (retryError) {
    return { status: 'error', error: retryError };
  }
  if (retriedRows?.length) {
    return {
      status: 'persisted',
      carryOver: retryPlan.nextCarryOver,
      allocation: retryPlan.nextAllocation,
      closedThrough: freshClosedThrough,
    };
  }

  return { status: 'conflict' };
}

/**
 * Refunds an amount back into carry_over using compare-and-swap against the
 * authoritative DB balance so concurrent writes on other devices are never clobbered.
 */
export async function persistCarryOverRefund({
  client = supabase,
  userId,
  amount,
  expectedCarryOver = 0,
  updatedAt = new Date().toISOString(),
}) {
  const refund = roundCurrency(Number(amount));
  if (!Number.isFinite(refund) || refund <= 0) {
    return { status: 'error', error: new Error('Refund amount must be greater than zero.') };
  }

  const expectedBalance = roundCurrency(expectedCarryOver);
  const nextExpected = roundCurrency(expectedBalance + refund);

  const { data: updatedRows, error: updateError } = await client
    .from('user_settings')
    .update({ carry_over: nextExpected, updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('carry_over', expectedBalance)
    .select('user_id');

  if (updateError) {
    return { status: 'error', error: updateError };
  }
  if (updatedRows?.length) {
    return { status: 'persisted', carryOver: nextExpected };
  }

  const { data: existingRow, error: readError } = await client
    .from('user_settings')
    .select('carry_over')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) {
    return { status: 'error', error: readError };
  }

  if (!existingRow) {
    const { data: insertedRows, error: insertError } = await client
      .from('user_settings')
      .upsert(
        { user_id: userId, carry_over: refund, updated_at: updatedAt },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )
      .select('user_id');

    if (insertError) {
      return { status: 'error', error: insertError };
    }
    if (insertedRows?.length) {
      return { status: 'persisted', carryOver: refund };
    }
    return { status: 'conflict' };
  }

  const freshBalance = roundCurrency(existingRow.carry_over || 0);
  const nextFresh = roundCurrency(freshBalance + refund);
  const { data: retriedRows, error: retryError } = await client
    .from('user_settings')
    .update({ carry_over: nextFresh, updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('carry_over', freshBalance)
    .select('user_id');

  if (retryError) {
    return { status: 'error', error: retryError };
  }
  if (retriedRows?.length) {
    return { status: 'persisted', carryOver: nextFresh };
  }

  return { status: 'conflict' };
}

/**
 * Creates a serialized carry-over state controller backed by authoritative state
 * rather than React render closures, preventing concurrent mutation races.
 */
export function createCarryOverController({ client = supabase, initialUserId = null } = {}) {
  let state = createInitialState(initialUserId);
  let epoch = 0;
  let pendingMutations = 0;
  const runQueued = createSerialQueue();
  const listeners = new Set();

  const getSnapshot = () => ({ ...state });

  const emit = () => {
    const snap = getSnapshot();
    for (const listener of listeners) {
      listener(snap);
    }
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(getSnapshot());
    return () => listeners.delete(listener);
  };

  const setUser = (nextUserId) => {
    if (state.userId === nextUserId) return;
    epoch += 1;
    state = createInitialState(nextUserId);
    emit();
  };

  const loadState = async (silent = false, { bypassPendingCheck = false } = {}) => {
    const targetUserId = state.userId;
    const startEpoch = epoch;
    if (!targetUserId) {
      state = createInitialState(null);
      state.isLoading = false;
      emit();
      return;
    }

    if (!silent) {
      state = { ...state, isLoading: true };
      emit();
    }

    try {
      // 1. Primary: load from user_settings
      const { data: userSettingsData, error: settingsError } = await client
        .from('user_settings')
        .select('carry_over, category_limits, carry_over_allocated, carry_over_allocated_month, carry_over_closed_through')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (state.userId !== targetUserId || epoch !== startEpoch) return;
      if (!bypassPendingCheck && pendingMutations > 0) return;

      // A failed read must not fall through to the backfill below, which would overwrite saved values.
      if (settingsError) throw settingsError;

      if (
        userSettingsData &&
        (userSettingsData.carry_over !== null || userSettingsData.category_limits !== null)
      ) {
        state = {
          ...state,
          carryOver: roundCurrency(userSettingsData.carry_over || 0),
          categoryLimits: userSettingsData.category_limits || {},
          allocation: {
            month: userSettingsData.carry_over_allocated_month ?? null,
            amount: roundCurrency(userSettingsData.carry_over_allocated || 0),
          },
          closedThrough: userSettingsData.carry_over_closed_through ?? null,
          loadedUserId: targetUserId,
          error: '',
        };
        emit();
        return;
      }

      // 2. Fallback: if user_settings has no carry_over yet, check latest monthly_snapshots
      const { data: snapshotData, error: snapError } = await client
        .from('monthly_snapshots')
        .select('carry_over, category_limits')
        .eq('user_id', targetUserId)
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (state.userId !== targetUserId || epoch !== startEpoch) return;
      if (!bypassPendingCheck && pendingMutations > 0) return;
      if (snapError) throw snapError;

      let nextCarry = 0;
      let nextLimits = {};
      if (snapshotData) {
        nextCarry = roundCurrency(snapshotData.carry_over || 0);
        nextLimits = snapshotData.category_limits || {};

        // Backfill to user_settings so it becomes the single persistent source of truth
        const { error: backfillError } = await client.from('user_settings').upsert(
          {
            user_id: targetUserId,
            carry_over: nextCarry,
            category_limits: nextLimits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (state.userId !== targetUserId || epoch !== startEpoch) return;
        if (backfillError) throw backfillError;
      }

      state = {
        ...state,
        carryOver: nextCarry,
        categoryLimits: nextLimits,
        allocation: null,
        closedThrough: null,
        loadedUserId: targetUserId,
        error: '',
      };
      emit();
    } catch (err) {
      if (state.userId !== targetUserId || epoch !== startEpoch) return;
      console.error('Error loading carry-over state:', err);
      state = { ...state, error: err.message || 'Failed to load carry-over' };
      emit();
    } finally {
      if (state.userId === targetUserId && epoch === startEpoch && state.isLoading) {
        state = { ...state, isLoading: false };
        emit();
      }
    }
  };

  const enqueueMutation = (targetUserId, task) => {
    if (!targetUserId) return Promise.resolve(false);
    pendingMutations += 1;
    return runQueued(async () => {
      try {
        if (state.userId !== targetUserId) return false;
        return await task();
      } finally {
        pendingMutations = Math.max(0, pendingMutations - 1);
        if (pendingMutations === 0 && state.userId === targetUserId && state.loadedUserId !== targetUserId) {
          void loadState(true);
        }
      }
    });
  };

  const updateCategoryLimits = (targetUserId, newLimits) =>
    enqueueMutation(targetUserId, async () => {
      const previousLimits = state.categoryLimits;
      const nextLimits = newLimits && typeof newLimits === 'object' ? newLimits : {};
      try {
        epoch += 1;
        state = { ...state, categoryLimits: nextLimits };
        emit();
        const { error } = await client.from('user_settings').upsert(
          {
            user_id: targetUserId,
            category_limits: nextLimits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) throw error;
        if (state.userId !== targetUserId) return false;
        if (state.error) {
          state = { ...state, error: '' };
          emit();
        }
        return true;
      } catch (err) {
        console.error('Error updating category limits:', err);
        if (state.userId !== targetUserId) return false;
        epoch += 1;
        state = { ...state, categoryLimits: previousLimits, error: err.message };
        emit();
        return false;
      }
    });

  const updateCarryOver = (targetUserId, newCarryOver) => {
    if (!targetUserId) return Promise.resolve(false);
    const raw = Number(newCarryOver);
    if (!Number.isFinite(raw) || raw < 0) return Promise.resolve(false);
    const num = roundCurrency(raw);

    return enqueueMutation(targetUserId, async () => {
      const previousBalance = state.carryOver;
      try {
        epoch += 1;
        state = { ...state, carryOver: num };
        emit();
        const { error } = await client.from('user_settings').upsert(
          {
            user_id: targetUserId,
            carry_over: num,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) throw error;
        if (state.userId !== targetUserId) return false;
        if (state.error) {
          state = { ...state, error: '' };
          emit();
        }
        return true;
      } catch (err) {
        console.error('Error updating carry-over:', err);
        if (state.userId !== targetUserId) return false;
        epoch += 1;
        state = { ...state, carryOver: previousBalance, error: err.message };
        emit();
        return false;
      }
    });
  };

  const runReserveAllocation = (targetUserId, amount, allocateToMonth = null) =>
    enqueueMutation(targetUserId, async () => {
      const res = await persistReserveAllocation({
        client,
        userId: targetUserId,
        amount,
        expectedCarryOver: state.carryOver,
        expectedAllocation: state.allocation,
        expectedClosedThrough: state.closedThrough,
        allocateToMonth,
      });

      if (state.userId !== targetUserId) return false;

      if (res.status === 'persisted') {
        epoch += 1;
        state = {
          ...state,
          carryOver: res.carryOver,
          ...(allocateToMonth ? { allocation: res.allocation } : {}),
          ...(res.closedThrough !== undefined ? { closedThrough: res.closedThrough } : {}),
          error: '',
        };
        emit();
        return true;
      }

      if (res.status === 'pending_close') {
        epoch += 1;
        state = {
          ...state,
          carryOver: res.carryOver,
          ...(res.allocation !== undefined ? { allocation: res.allocation } : {}),
          ...(res.closedThrough !== undefined ? { closedThrough: res.closedThrough } : {}),
          error: 'Previous month carry-over is still finalizing. Please try again in a moment.',
        };
        emit();
        return false;
      }

      if (res.status === 'insufficient') {
        const synced =
          res.carryOver !== state.carryOver ||
          res.closedThrough !== undefined ||
          (res.allocation && res.allocation !== state.allocation);
        if (synced) {
          epoch += 1;
          state = {
            ...state,
            carryOver: res.carryOver,
            ...(res.allocation !== undefined ? { allocation: res.allocation } : {}),
            ...(res.closedThrough !== undefined ? { closedThrough: res.closedThrough } : {}),
          };
          emit();
        }
        return false;
      }

      if (res.status === 'error') {
        console.error(
          allocateToMonth ? 'Error allocating carry-over to budget:' : 'Error updating carry-over:',
          res.error
        );
        state = { ...state, error: res.error.message };
        emit();
        return false;
      }

      await loadState(true, { bypassPendingCheck: true });
      return false;
    });

  const allocateCarryOver = (targetUserId, amount) =>
    runReserveAllocation(targetUserId, amount, null);

  const allocateCarryOverToBudget = (targetUserId, amount, currentMonth) =>
    runReserveAllocation(targetUserId, amount, currentMonth);

  const refundCarryOver = (targetUserId, amount) =>
    enqueueMutation(targetUserId, async () => {
      const res = await persistCarryOverRefund({
        client,
        userId: targetUserId,
        amount,
        expectedCarryOver: state.carryOver,
      });

      if (state.userId !== targetUserId) return false;

      if (res.status === 'persisted') {
        epoch += 1;
        state = {
          ...state,
          carryOver: res.carryOver,
          error: '',
        };
        emit();
        return true;
      }

      if (res.status === 'error') {
        console.error('Error refunding carry-over:', res.error);
        state = { ...state, error: res.error.message };
        emit();
        return false;
      }

      await loadState(true, { bypassPendingCheck: true });
      return false;
    });

  const closeFinishedMonths = ({ userId: targetUserId, currentMonth, expenses = [], baseBudget = 0 }) =>
    enqueueMutation(targetUserId, async () => {
      const monthClose = computeMonthClose({
        closedThrough: state.closedThrough,
        currentMonth,
        expenses,
        baseBudget,
        allocation: state.allocation,
      });
      if (!monthClose) return false;

      const nextCarryOver = roundCurrency(state.carryOver + monthClose.carryAddition);
      const res = await persistMonthClose({
        client,
        userId: targetUserId,
        expectedClosedThrough: state.closedThrough,
        expectedCarryOver: state.carryOver,
        nextClosedThrough: monthClose.closedThrough,
        nextCarryOver,
      });

      if (state.userId !== targetUserId) return false;

      if (res.status === 'error') {
        console.warn('Could not close finished months:', res.error);
        state = { ...state, error: res.error.message };
        emit();
        return false;
      }

      if (res.status === 'persisted') {
        epoch += 1;
        state = {
          ...state,
          carryOver: nextCarryOver,
          closedThrough: monthClose.closedThrough,
          error: '',
        };
        emit();
        return true;
      }

      await loadState(true, { bypassPendingCheck: true });
      return false;
    });

  return {
    getSnapshot,
    subscribe,
    setUser,
    loadState,
    updateCategoryLimits,
    updateCarryOver,
    allocateCarryOver,
    allocateCarryOverToBudget,
    refundCarryOver,
    closeFinishedMonths,
  };
}

function useCarryOver({ expenses = [], baseBudget = 0, userId = 'local-owner', canCloseMonths = false } = {}) {
  const currentMonth = getMonthKey();
  const controllerRef = useRef(null);
  if (!controllerRef.current) {
    controllerRef.current = createCarryOverController({ initialUserId: userId });
  }

  const [snapshot, setSnapshot] = useState(() => controllerRef.current.getSnapshot());
  const isClosingRef = useRef(false);
  const closingRunIdRef = useRef(0);

  useEffect(() => {
    return controllerRef.current.subscribe(setSnapshot);
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;
    closingRunIdRef.current += 1;
    isClosingRef.current = false;
    controller.setUser(userId);
    controller.loadState(false);

    if (!userId) return;

    // Supabase Realtime channel subscription for user_settings changes
    const channel = supabase
      .channel(`carry_over:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          controller.loadState(true);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Realtime] carry_over channel warning:', err);
        }
      });

    // Window focus and visibility listener for instant cross-tab / mobile resume sync
    const handleSync = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        shouldTriggerVisibilitySync('carryOver')
      ) {
        controller.loadState(true);
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [userId]);

  const updateCategoryLimits = useCallback(
    (newLimits) => controllerRef.current.updateCategoryLimits(userId, newLimits),
    [userId]
  );

  const updateCarryOver = useCallback(
    (newCarryOver) => controllerRef.current.updateCarryOver(userId, newCarryOver),
    [userId]
  );

  const allocateCarryOver = useCallback(
    (amount) => controllerRef.current.allocateCarryOver(userId, amount),
    [userId]
  );

  const refundCarryOver = useCallback(
    (amount) => controllerRef.current.refundCarryOver(userId, amount),
    [userId]
  );

  // Move carry-over into this month's budget, only ever at the owner's request.
  const allocateCarryOverToBudget = useCallback(
    (amount) => controllerRef.current.allocateCarryOverToBudget(userId, amount, currentMonth),
    [userId, currentMonth]
  );

  const reloadCarryOver = useCallback(() => controllerRef.current.loadState(true), []);

  // Bank unused budget from finished months. Waits for complete data, because a partial
  // expense list would look like unspent money. The filter stops another tab counting a month twice.
  useEffect(() => {
    if (
      !canCloseMonths ||
      !userId ||
      snapshot.isLoading ||
      snapshot.error ||
      snapshot.loadedUserId !== userId ||
      isClosingRef.current
    ) {
      return;
    }

    const monthClose = computeMonthClose({
      closedThrough: snapshot.closedThrough,
      currentMonth,
      expenses,
      baseBudget,
      allocation: snapshot.allocation,
    });
    if (!monthClose) return;

    isClosingRef.current = true;
    const runId = ++closingRunIdRef.current;
    controllerRef.current
      .closeFinishedMonths({ userId, currentMonth, expenses, baseBudget })
      .finally(() => {
        if (closingRunIdRef.current === runId) {
          isClosingRef.current = false;
        }
      });
  }, [
    canCloseMonths,
    userId,
    snapshot.isLoading,
    snapshot.error,
    snapshot.loadedUserId,
    snapshot.closedThrough,
    snapshot.allocation,
    currentMonth,
    expenses,
    baseBudget,
  ]);

  const budgetTopUp = getMonthAllocation(snapshot.allocation, currentMonth);
  const effectiveBudget = useMemo(
    () => roundCurrency(Number(baseBudget || 0) + budgetTopUp),
    [baseBudget, budgetTopUp]
  );

  // Synthesized snapshot representation for all active months in expenses + current month
  const snapshots = useMemo(
    () =>
      buildReserveSnapshots({
        userId,
        currentMonth,
        baseBudget,
        carryOver: snapshot.carryOver,
        categoryLimits: snapshot.categoryLimits,
        expenses,
        maxMonths: MAX_SNAPSHOT_MONTHS,
      }),
    [userId, currentMonth, baseBudget, snapshot.carryOver, snapshot.categoryLimits, expenses]
  );

  return {
    carryOver: snapshot.carryOver,
    previousCarryOver: snapshot.carryOver,
    budgetTopUp,
    allocateCarryOverToBudget,
    effectiveBudget,
    categoryLimits: snapshot.categoryLimits,
    snapshots,
    currentMonth,
    updateCategoryLimits,
    updateCarryOver,
    allocateCarryOver,
    refundCarryOver,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    reloadCarryOver,
  };
}

export default useCarryOver;
