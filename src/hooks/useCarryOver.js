import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  buildMonthlySnapshots,
  getEffectiveBudget,
  getMonthKey,
  getPreviousMonthCarryOver,
} from '../utils/carryOver';

function normalizeSnapshot(snapshot) {
  return {
    ...snapshot,
    budget: Number(snapshot.budget),
    total_spent: Number(snapshot.total_spent),
    carry_over: Number(snapshot.carry_over),
    category_limits: snapshot.category_limits || {},
  };
}

function hasSnapshotChanged(currentSnapshot, nextSnapshot) {
  if (!currentSnapshot) {
    return true;
  }

  return (
    Number(currentSnapshot.budget) !== Number(nextSnapshot.budget) ||
    Number(currentSnapshot.total_spent) !== Number(nextSnapshot.total_spent) ||
    Number(currentSnapshot.carry_over) !== Number(nextSnapshot.carry_over)
  );
}

async function fetchSnapshotsWithFallback(userId) {
  let { data, error } = await supabase
    .from('monthly_snapshots')
    .select('id,user_id,month,budget,total_spent,carry_over,category_limits,created_at')
    .eq('user_id', userId)
    .order('month', { ascending: false });

  if (error && (error.message?.includes('category_limits') || error.code === 'PGRST204')) {
    const fallbackRes = await supabase
      .from('monthly_snapshots')
      .select('id,user_id,month,budget,total_spent,carry_over,created_at')
      .eq('user_id', userId)
      .order('month', { ascending: false });

    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  return { data, error };
}

async function upsertSnapshotsWithFallback(payload) {
  let { error } = await supabase
    .from('monthly_snapshots')
    .upsert(payload, { onConflict: 'user_id,month' });

  if (error && (error.message?.includes('category_limits') || error.code === 'PGRST204')) {
    const strippedPayload = payload.map(({ category_limits, ...rest }) => rest);
    const retryRes = await supabase
      .from('monthly_snapshots')
      .upsert(strippedPayload, { onConflict: 'user_id,month' });

    error = retryRes.error;
  }

  return { error };
}

function useCarryOver({ expenses, baseBudget, userId = 'local-owner' }) {
  const [snapshots, setSnapshots] = useState([]);
  const [carryOverError, setCarryOverError] = useState('');
  const currentMonth = getMonthKey();

  useEffect(() => {
    if (!userId) {
      setSnapshots([]);
      setCarryOverError('');
      return;
    }

    let isMounted = true;

    const loadSnapshots = async () => {
      const { data, error } = await fetchSnapshotsWithFallback(userId);

      if (!isMounted) {
        return;
      }

      if (error) {
        setSnapshots([]);
        setCarryOverError(error.message);
        return;
      }

      setSnapshots((data || []).map(normalizeSnapshot));
      setCarryOverError('');
    };

    loadSnapshots();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    const syncSnapshots = async () => {
      const nextSnapshots = buildMonthlySnapshots(
        expenses,
        snapshots,
        baseBudget,
        userId,
        currentMonth,
      );

      const nextSnapshotByMonth = new Map(nextSnapshots.map((snapshot) => [snapshot.month, snapshot]));
      const currentSnapshotByMonth = new Map(
        snapshots.map((snapshot) => [snapshot.month, snapshot]),
      );

      const upsertPayload = nextSnapshots
        .filter((snapshot) => hasSnapshotChanged(currentSnapshotByMonth.get(snapshot.month), snapshot))
        .map((snapshot) => ({
          user_id: userId,
          month: snapshot.month,
          budget: Number(snapshot.budget),
          total_spent: Number(snapshot.total_spent),
          carry_over: Number(snapshot.carry_over),
          category_limits: currentSnapshotByMonth.get(snapshot.month)?.category_limits || snapshot.category_limits || {},
        }));

      const monthsToDelete = snapshots
        .filter((snapshot) => !nextSnapshotByMonth.has(snapshot.month))
        .map((snapshot) => snapshot.month);

      if (upsertPayload.length === 0 && monthsToDelete.length === 0) {
        return;
      }

      if (upsertPayload.length > 0) {
        const { error } = await upsertSnapshotsWithFallback(upsertPayload);

        if (!isMounted) {
          return;
        }

        if (error) {
          setCarryOverError(error.message);
          return;
        }
      }

      if (monthsToDelete.length > 0) {
        const { error } = await supabase
          .from('monthly_snapshots')
          .delete()
          .eq('user_id', userId)
          .in('month', monthsToDelete);

        if (!isMounted) {
          return;
        }

        if (error) {
          setCarryOverError(error.message);
          return;
        }
      }

      const { data, error } = await fetchSnapshotsWithFallback(userId);

      if (!isMounted) {
        return;
      }

      if (error) {
        setCarryOverError(error.message);
        return;
      }

      setSnapshots((data || []).map(normalizeSnapshot));
      setCarryOverError('');
    };

    syncSnapshots();

    return () => {
      isMounted = false;
    };
  }, [baseBudget, currentMonth, expenses, snapshots, userId]);

  const updateCategoryLimits = async (newLimits, targetMonth = currentMonth) => {
    if (!userId) return;

    const existingSnapshot = snapshots.find((s) => s.month === targetMonth);
    const updatedPayload = {
      user_id: userId,
      month: targetMonth,
      budget: existingSnapshot ? Number(existingSnapshot.budget) : Number(baseBudget),
      total_spent: existingSnapshot ? Number(existingSnapshot.total_spent) : 0,
      carry_over: existingSnapshot ? Number(existingSnapshot.carry_over) : Number(baseBudget),
      category_limits: newLimits,
    };

    const { error } = await upsertSnapshotsWithFallback([updatedPayload]);

    if (error) {
      setCarryOverError(error.message);
      return false;
    }

    setSnapshots((prev) => {
      const exists = prev.some((s) => s.month === targetMonth);
      if (exists) {
        return prev.map((s) => (s.month === targetMonth ? { ...s, category_limits: newLimits } : s));
      }
      return [{ ...updatedPayload, created_at: new Date().toISOString() }, ...prev];
    });

    setCarryOverError('');
    return true;
  };

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((left, right) => right.month.localeCompare(left.month)),
    [snapshots],
  );

  const effectiveBudget = useMemo(
    () => getEffectiveBudget(baseBudget, sortedSnapshots, currentMonth),
    [baseBudget, currentMonth, sortedSnapshots],
  );

  const previousCarryOver = useMemo(
    () => getPreviousMonthCarryOver(sortedSnapshots, currentMonth),
    [currentMonth, sortedSnapshots],
  );

  return {
    snapshots: sortedSnapshots,
    effectiveBudget,
    previousCarryOver,
    currentMonth,
    updateCategoryLimits,
    error: carryOverError,
  };
}

export default useCarryOver;
