import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { shouldTriggerVisibilitySync } from '../lib/connectionHealth';
import { computeMonthClose, getMonthAllocation, getMonthKey } from '../utils/carryOver';

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
  const isClosingRef = useRef(false);
  const [categoryLimits, setCategoryLimits] = useState({});
  const [carryOverError, setCarryOverError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const currentMonth = getMonthKey();

  // Load single-state carry_over and category_limits from user_settings (with monthly_snapshots fallback)
  const loadCarryOverState = useCallback(
    async (silent = false) => {
      if (!userId) {
        setCarryOver(0);
        setCategoryLimits({});
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
          .eq('user_id', userId)
          .maybeSingle();

        // A failed read must not fall through to the backfill below, which would overwrite saved values.
        if (settingsError) throw settingsError;

        if (
          userSettingsData &&
          (userSettingsData.carry_over !== null || userSettingsData.category_limits !== null)
        ) {
          setCarryOver(Number(userSettingsData.carry_over || 0));
          setCategoryLimits(userSettingsData.category_limits || {});
          setAllocation({
            month: userSettingsData.carry_over_allocated_month,
            amount: Number(userSettingsData.carry_over_allocated || 0),
          });
          setClosedThrough(userSettingsData.carry_over_closed_through);
          loadedUserRef.current = userId;
          setCarryOverError('');
          return;
        }

        // 2. Fallback: if user_settings has no carry_over yet, check latest monthly_snapshots
        const { data: snapshotData, error: snapError } = await supabase
          .from('monthly_snapshots')
          .select('carry_over, category_limits')
          .eq('user_id', userId)
          .order('month', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (snapError) throw snapError;

        if (snapshotData) {
          const fallbackCarryOver = Number(snapshotData.carry_over || 0);
          const fallbackLimits = snapshotData.category_limits || {};
          setCarryOver(fallbackCarryOver);
          setCategoryLimits(fallbackLimits);

          // Backfill to user_settings so it becomes the single persistent source of truth
          const { error: backfillError } = await supabase.from('user_settings').upsert(
            {
              user_id: userId,
              carry_over: fallbackCarryOver,
              category_limits: fallbackLimits,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          if (backfillError) throw backfillError;
        } else {
          setCarryOver(0);
          setCategoryLimits({});
        }

        setCarryOverError('');
      } catch (err) {
        console.error('Error loading carry-over state:', err);
        setCarryOverError(err.message || 'Failed to load carry-over');
      } finally {
        setIsLoading(false);
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
      try {
        setCategoryLimits(newLimits);
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: userId,
            category_limits: newLimits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) throw error;
        setCarryOverError('');
        return true;
      } catch (err) {
        console.error('Error updating category limits:', err);
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
      const num = Math.round(Number(newCarryOver) * 100) / 100;
      try {
        setCarryOver(num);
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
        setCarryOverError(err.message);
        return false;
      }
    },
    [userId]
  );

  // Allocate carry-over (e.g. into a savings goal)
  const allocateCarryOver = useCallback(
    async (amount) => {
      const allocateNum = Number(amount) || 0;
      if (allocateNum <= 0) return true;
      const newBalance = Math.max(0, Math.round((carryOver - allocateNum) * 100) / 100);
      return updateCarryOver(newBalance);
    },
    [carryOver, updateCarryOver]
  );

  // Move carry-over into this month's budget, only ever at the owner's request.
  const allocateCarryOverToBudget = useCallback(
    async (amount) => {
      const moved = Math.round((Number(amount) || 0) * 100) / 100;
      if (!userId || moved <= 0 || moved > carryOver) return false;

      const nextCarryOver = Math.round((carryOver - moved) * 100) / 100;
      const nextAllocation = { month: currentMonth, amount: getMonthAllocation(allocation, currentMonth) + moved };
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
    const nextCarryOver = Math.round((carryOver + monthClose.carryAddition) * 100) / 100;
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
    () => Math.round((Number(baseBudget || 0) + budgetTopUp) * 100) / 100,
    [baseBudget, budgetTopUp]
  );

  // Synthesized snapshot representation for all active months in expenses + current month
  const snapshots = useMemo(() => {
    const spentByMonth = new Map();
    for (const e of expenses || []) {
      const month = e.date?.slice(0, 7);
      if (month) spentByMonth.set(month, (spentByMonth.get(month) || 0) + (Number(e.amount) || 0));
    }

    // Every calendar month from the earliest expense to now, so quiet months count and future-dated ones do not.
    const earliest = [...spentByMonth.keys()].sort()[0] || currentMonth;
    const months = [];
    let cursor = parseISO(`${currentMonth}-01`);
    while (format(cursor, 'yyyy-MM') >= earliest && months.length < MAX_SNAPSHOT_MONTHS) {
      months.push(format(cursor, 'yyyy-MM'));
      cursor = subMonths(cursor, 1);
    }

    return months.map((month) => {
      const totalSpent = spentByMonth.get(month) || 0;
      const isCurrent = month === currentMonth;

      return {
        id: `snapshot-${userId}-${month}`,
        user_id: userId,
        month,
        budget: Number(baseBudget || 0),
        carry_over: isCurrent ? carryOver : Math.max(0, Number(baseBudget || 0) - totalSpent),
        category_limits: isCurrent ? categoryLimits : {},
        total_spent: totalSpent,
      };
    });
  }, [userId, currentMonth, baseBudget, carryOver, categoryLimits, expenses]);

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
