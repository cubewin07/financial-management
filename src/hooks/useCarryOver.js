import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { shouldTriggerVisibilitySync } from '../lib/connectionHealth';
import { getMonthKey } from '../utils/carryOver';

/**
 * Custom hook maintaining carry-over as a single unified persistent state
 * in public.user_settings (avoiding stale multi-month snapshot drift).
 */
const MAX_SNAPSHOT_MONTHS = 240;

function useCarryOver({ expenses = [], baseBudget = 0, userId = 'local-owner' } = {}) {
  const [carryOver, setCarryOver] = useState(0);
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
          .select('carry_over, category_limits')
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

  const effectiveBudget = useMemo(
    () => Math.round((Number(baseBudget || 0) + Number(carryOver || 0)) * 100) / 100,
    [baseBudget, carryOver]
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
