import { useEffect, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import {
  MONTHLY_SNAPSHOTS_STORAGE_KEY,
  buildMonthlySnapshots,
  getEffectiveBudget,
  getMonthKey,
  getPreviousMonthCarryOver,
} from '../utils/carryOver';

function useCarryOver({ expenses, baseBudget, userId = 'local-owner', useSupabase = false }) {
  const [snapshots, setSnapshots] = useLocalStorage(MONTHLY_SNAPSHOTS_STORAGE_KEY, []);
  const currentMonth = getMonthKey();

  useEffect(() => {
    if (useSupabase) {
      return;
    }

    const nextSnapshots = buildMonthlySnapshots(expenses, snapshots, baseBudget, userId, currentMonth);
    const previousSerialized = JSON.stringify(snapshots);
    const nextSerialized = JSON.stringify(nextSnapshots);

    if (previousSerialized !== nextSerialized) {
      setSnapshots(nextSnapshots);
    }
  }, [baseBudget, currentMonth, expenses, setSnapshots, snapshots, useSupabase, userId]);

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
  };
}

export default useCarryOver;

