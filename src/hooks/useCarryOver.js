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
      const { data, error } = await supabase
        .from('monthly_snapshots')
        .select('id,user_id,month,budget,total_spent,carry_over,created_at')
        .eq('user_id', userId)
        .order('month', { ascending: false });

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
        }));

      const monthsToDelete = snapshots
        .filter((snapshot) => !nextSnapshotByMonth.has(snapshot.month))
        .map((snapshot) => snapshot.month);

      if (upsertPayload.length === 0 && monthsToDelete.length === 0) {
        return;
      }

      if (upsertPayload.length > 0) {
        const { error } = await supabase
          .from('monthly_snapshots')
          .upsert(upsertPayload, { onConflict: 'user_id,month' });

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

      const { data, error } = await supabase
        .from('monthly_snapshots')
        .select('id,user_id,month,budget,total_spent,carry_over,created_at')
        .eq('user_id', userId)
        .order('month', { ascending: false });

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
    error: carryOverError,
  };
}

export default useCarryOver;
