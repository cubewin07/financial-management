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

function useCarryOver({ expenses = [], baseBudget = 0, userId = 'local-owner', canCloseMonths = false } = {}) {
  const [carryOver, setCarryOver] = useState(0);
  const [allocation, setAllocation] = useState(null);
  const [closedThrough, setClosedThrough] = useState(null);
  const loadedUserRef = useRef(null);
  const activeUserRef = useRef(userId);
  const isClosingRef = useRef(false);
  const [categoryLimits, setCategoryLimits] = useState({});
  const carryOverRef = useRef(carryOver);
  const categoryLimitsRef = useRef(categoryLimits);
  const [carryOverError, setCarryOverError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const currentMonth = getMonthKey();

  useEffect(() => {
    carryOverRef.current = carryOver;
  }, [carryOver]);

  useEffect(() => {
    categoryLimitsRef.current = categoryLimits;
  }, [categoryLimits]);

  useEffect(() => {
    activeUserRef.current = userId;
    loadedUserRef.current = null;
    setCarryOver(0);
    setAllocation(null);
    setClosedThrough(null);
    setCategoryLimits({});
    setCarryOverError('');
  }, [userId]);

  // Load single-state carry_over and category_limits from user_settings (with monthly_snapshots fallback)
  const loadCarryOverState = useCallback(
    async (silent = false) => {
      const targetUserId = userId;
      if (!targetUserId) {
        setCarryOver(0);
        setAllocation(null);
        setClosedThrough(null);
        setCategoryLimits({});
        loadedUserRef.current = null;
        setCarryOverError('');
        setIsLoading(false);
        return;
      }

      if (!silent) {
        setIsLoading(true);
      }

      try {
        // 1. Primary: load from user_settings
        const { data: userSettingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('carry_over, category_limits, carry_over_allocated, carry_over_allocated_month, carry_over_closed_through')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (activeUserRef.current !== targetUserId) return;

        // A failed read must not fall through to the backfill below, which would overwrite saved values.
        if (settingsError) throw settingsError;

        if (
          userSettingsData &&
          (userSettingsData.carry_over !== null || userSettingsData.category_limits !== null)
        ) {
          const nextCarry = roundCurrency(userSettingsData.carry_over || 0);
          const nextLimits = userSettingsData.category_limits || {};
          setCarryOver(nextCarry);
          carryOverRef.current = nextCarry;
          setCategoryLimits(nextLimits);
          categoryLimitsRef.current = nextLimits;
          setAllocation({
            month: userSettingsData.carry_over_allocated_month,
            amount: roundCurrency(userSettingsData.carry_over_allocated || 0),
          });
          setClosedThrough(userSettingsData.carry_over_closed_through);
          loadedUserRef.current = targetUserId;
          setCarryOverError('');
          return;
        }

        // 2. Fallback: if user_settings has no carry_over yet, check latest monthly_snapshots
        const { data: snapshotData, error: snapError } = await supabase
          .from('monthly_snapshots')
          .select('carry_over, category_limits')
          .eq('user_id', targetUserId)
          .order('month', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeUserRef.current !== targetUserId) return;
        if (snapError) throw snapError;

        if (snapshotData) {
          const fallbackCarryOver = roundCurrency(snapshotData.carry_over || 0);
          const fallbackLimits = snapshotData.category_limits || {};
          setCarryOver(fallbackCarryOver);
          carryOverRef.current = fallbackCarryOver;
          setCategoryLimits(fallbackLimits);
          categoryLimitsRef.current = fallbackLimits;

          // Backfill to user_settings so it becomes the single persistent source of truth
          const { error: backfillError } = await supabase.from('user_settings').upsert(
            {
              user_id: targetUserId,
              carry_over: fallbackCarryOver,
              category_limits: fallbackLimits,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          if (activeUserRef.current !== targetUserId) return;
          if (backfillError) throw backfillError;
        } else {
          setCarryOver(0);
          carryOverRef.current = 0;
          setCategoryLimits({});
          categoryLimitsRef.current = {};
        }

        setAllocation(null);
        setClosedThrough(null);
        loadedUserRef.current = targetUserId;
        setCarryOverError('');
      } catch (err) {
        if (activeUserRef.current !== targetUserId) return;
        console.error('Error loading carry-over state:', err);
        setCarryOverError(err.message || 'Failed to load carry-over');
      } finally {
        if (activeUserRef.current === targetUserId) {
          setIsLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    loadCarryOverState(false);

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
          loadCarryOverState(true);
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
        loadCarryOverState(true);
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [userId, loadCarryOverState]);

  // Update category limits
  const updateCategoryLimits = useCallback(
    async (newLimits) => {
      if (!userId) return false;
      const previousLimits = categoryLimitsRef.current;
      const nextLimits = newLimits && typeof newLimits === 'object' ? newLimits : {};
      try {
        setCategoryLimits(nextLimits);
        categoryLimitsRef.current = nextLimits;
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: userId,
            category_limits: nextLimits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) throw error;
        setCarryOverError('');
        return true;
      } catch (err) {
        console.error('Error updating category limits:', err);
        setCategoryLimits(previousLimits);
        categoryLimitsRef.current = previousLimits;
        setCarryOverError(err.message);
        return false;
      }
    },
    [userId]
  );

  // Update single carry-over balance
  const updateCarryOver = useCallback(
    async (newCarryOver) => {
      if (!userId) return false;
      const raw = Number(newCarryOver);
      if (!Number.isFinite(raw) || raw < 0) return false;
      const num = roundCurrency(raw);
      const previousBalance = carryOverRef.current;
      try {
        setCarryOver(num);
        carryOverRef.current = num;
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: userId,
            carry_over: num,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) throw error;
        setCarryOverError('');
        return true;
      } catch (err) {
        console.error('Error updating carry-over:', err);
        setCarryOver(previousBalance);
        carryOverRef.current = previousBalance;
        setCarryOverError(err.message);
        return false;
      }
    },
    [userId]
  );

  // Allocate carry-over (e.g. into a savings goal)
  const allocateCarryOver = useCallback(
    async (amount) => {
      if (!userId) return false;
      const result = computeReserveAllocation(carryOverRef.current, amount);
      if (!result.ok) return false;
      return updateCarryOver(result.nextBalance);
    },
    [userId, updateCarryOver]
  );

  // Move carry-over into this month's budget, only ever at the owner's request.
  const allocateCarryOverToBudget = useCallback(
    async (amount) => {
      if (!userId) return false;
      const result = computeReserveAllocation(carryOver, amount);
      if (!result.ok) return false;

      const nextCarryOver = result.nextBalance;
      const nextAllocation = {
        month: currentMonth,
        amount: roundCurrency(getMonthAllocation(allocation, currentMonth) + result.moved),
      };
      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: userId,
          carry_over: nextCarryOver,
          carry_over_allocated: nextAllocation.amount,
          carry_over_allocated_month: currentMonth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        console.error('Error allocating carry-over to budget:', error);
        setCarryOverError(error.message);
        return false;
      }

      setCarryOver(nextCarryOver);
      carryOverRef.current = nextCarryOver;
      setAllocation(nextAllocation);
      setCarryOverError('');
      return true;
    },
    [userId, carryOver, allocation, currentMonth]
  );

  // Bank unused budget from finished months. Waits for complete data, because a partial
  // expense list would look like unspent money. The filter stops another tab counting a month twice.
  useEffect(() => {
    if (!canCloseMonths || !userId || isLoading || carryOverError || loadedUserRef.current !== userId || isClosingRef.current) return;

    const monthClose = computeMonthClose({ closedThrough, currentMonth, expenses, baseBudget, allocation });
    if (!monthClose) return;

    isClosingRef.current = true;
    const nextCarryOver = roundCurrency(carryOver + monthClose.carryAddition);
    const update = supabase
      .from('user_settings')
      .update({
        carry_over: nextCarryOver,
        carry_over_closed_through: monthClose.closedThrough,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    (closedThrough ? update.eq('carry_over_closed_through', closedThrough) : update.is('carry_over_closed_through', null))
      .select('user_id')
      .then(({ data, error }) => {
        if (error) {
          console.warn('Could not close finished months:', error);
          setCarryOverError(error.message);
        } else if (data?.length) {
          setCarryOver(nextCarryOver);
          carryOverRef.current = nextCarryOver;
          setClosedThrough(monthClose.closedThrough);
        } else {
          loadCarryOverState(true);
        }
      })
      .finally(() => {
        isClosingRef.current = false;
      });
  }, [canCloseMonths, userId, isLoading, carryOverError, closedThrough, currentMonth, expenses, baseBudget, allocation, carryOver, loadCarryOverState]);

  const budgetTopUp = getMonthAllocation(allocation, currentMonth);
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
        carryOver,
        categoryLimits,
        expenses,
        maxMonths: MAX_SNAPSHOT_MONTHS,
      }),
    [userId, currentMonth, baseBudget, carryOver, categoryLimits, expenses],
  );

  return {
    carryOver,
    previousCarryOver: carryOver,
    budgetTopUp,
    allocateCarryOverToBudget,
    effectiveBudget,
    categoryLimits,
    snapshots,
    currentMonth,
    updateCategoryLimits,
    updateCarryOver,
    allocateCarryOver,
    isLoading,
    error: carryOverError,
    reloadCarryOver: () => loadCarryOverState(true),
  };
}

export default useCarryOver;
