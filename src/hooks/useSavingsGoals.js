import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { isPersistedGoal, roundCurrency } from '../utils/finance.js';

const INITIAL_GOALS = [
  { id: 'starter-1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: 'starter-2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: 'starter-3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

const normalizeGoalCurrency = (value) => String(value || '').trim().toUpperCase() || 'NZD';

export default function useSavingsGoals({ userId }) {
  const [goals, setGoals] = useState(userId ? [] : INITIAL_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const goalsRef = useRef(goals);
  const depositWritesRef = useRef(Promise.resolve());
  const pendingDepositsRef = useRef(new Map());
  const activeUserRef = useRef(userId);

  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  useEffect(() => {
    activeUserRef.current = userId;
    pendingDepositsRef.current.clear();

    if (!userId) {
      setGoals(INITIAL_GOALS);
      goalsRef.current = INITIAL_GOALS;
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchGoals = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (error) {
          setError(error.message);
          setGoals((prev) => (prev && prev.length > 0 ? prev : []));
          return;
        }

        // No saved goals means an empty list: sample goals would read as real money.
        const normalized = (data || []).map((item) => ({
          ...item,
          target_amount: Number(item.target_amount),
          current_amount: Number(item.current_amount || 0),
          priority: item.priority || 'medium',
        }));
        goalsRef.current = normalized;
        setGoals(normalized);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Failed to fetch savings goals:', err);
        setGoals((prev) => (prev && prev.length > 0 ? prev : []));
        setError(err.message || 'Failed to load savings goals');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGoals();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const addGoal = async (newGoal) => {
    const trimmedName = String(newGoal?.name || '').trim();
    const rawTarget = Number(newGoal?.target_amount);
    const targetAmount = Number.isFinite(rawTarget) ? roundCurrency(rawTarget) : 0;
    const rawCurrent = Number(newGoal?.current_amount || 0);
    const currentAmount = Number.isFinite(rawCurrent) ? Math.max(0, roundCurrency(rawCurrent)) : 0;
    const currency = normalizeGoalCurrency(newGoal?.currency);

    if (!trimmedName || targetAmount <= 0) {
      setError('Goal name and target amount greater than 0 are required.');
      return null;
    }

    if (!userId) {
      const created = {
        id: `mock-${Date.now()}`,
        ...newGoal,
        name: trimmedName,
        target_amount: targetAmount,
        current_amount: currentAmount,
        currency,
      };
      setError(null);
      goalsRef.current = [created, ...goalsRef.current];
      setGoals(goalsRef.current);
      return created;
    }

    const targetUserId = userId;
    const { data, error } = await supabase
      .from('savings_goals')
      .insert([
        {
          user_id: targetUserId,
          name: trimmedName,
          target_amount: targetAmount,
          current_amount: currentAmount,
          currency,
          priority: newGoal.priority || 'medium',
          deadline_date: newGoal.deadline_date || null,
        },
      ])
      .select('*')
      .single();

    if (activeUserRef.current !== targetUserId) return null;

    if (error) {
      setError(error.message);
      return null;
    }

    const created = {
      ...data,
      target_amount: Number(data.target_amount),
      current_amount: Number(data.current_amount || 0),
      currency: normalizeGoalCurrency(data.currency || currency),
      priority: data.priority || 'medium',
    };

    setError(null);
    goalsRef.current = [created, ...goalsRef.current];
    setGoals(goalsRef.current);
    return created;
  };

  const deleteGoal = async (goalId) => {
    const targetUserId = userId;
    const deletedIndex = goalsRef.current.findIndex((g) => String(g.id) === String(goalId));
    const deletedGoal = deletedIndex >= 0 ? goalsRef.current[deletedIndex] : null;
    goalsRef.current = goalsRef.current.filter((g) => String(g.id) !== String(goalId));
    setGoals(goalsRef.current);

    const restoreDeletedGoal = () => {
      if (!deletedGoal || activeUserRef.current !== targetUserId) return;
      if (goalsRef.current.some((g) => String(g.id) === String(goalId))) return;
      const next = [...goalsRef.current];
      const insertAt = Math.min(Math.max(0, deletedIndex), next.length);
      next.splice(insertAt, 0, deletedGoal);
      goalsRef.current = next;
      setGoals(next);
    };

    if (targetUserId && isPersistedGoal(goalId)) {
      try {
        const { error } = await supabase
          .from('savings_goals')
          .delete()
          .eq('id', goalId)
          .eq('user_id', targetUserId);

        if (activeUserRef.current !== targetUserId) return false;

        if (error) {
          console.error('Failed to delete savings goal:', error);
          setError(error.message);
          restoreDeletedGoal();
          return false;
        }
      } catch (err) {
        if (activeUserRef.current !== targetUserId) return false;
        console.error('Failed to delete savings goal:', err);
        setError(err?.message || 'Could not delete this goal. Please try again.');
        restoreDeletedGoal();
        return false;
      }
    }

    if (activeUserRef.current !== targetUserId) return false;
    setError(null);
    return true;
  };

  const addDeposit = async (goalId, amount) => {
    const targetUserId = userId;
    const raw = Number(amount);
    const depositAmount = Number.isFinite(raw) ? roundCurrency(raw) : 0;
    if (depositAmount <= 0) {
      const err = new Error('Deposit amount must be greater than 0.');
      setError(err.message);
      throw err;
    }

    const applyToGoal = (delta) => {
      if (activeUserRef.current !== targetUserId) return;
      goalsRef.current = goalsRef.current.map((g) =>
        String(g.id) === String(goalId)
          ? { ...g, current_amount: Math.max(0, roundCurrency(Number(g.current_amount || 0) + delta)) }
          : g,
      );
      setGoals(goalsRef.current);
    };

    const setGoalAmount = (amountValue) => {
      if (activeUserRef.current !== targetUserId) return;
      const nextAmount = Math.max(0, roundCurrency(amountValue));
      goalsRef.current = goalsRef.current.map((g) =>
        String(g.id) === String(goalId)
          ? { ...g, current_amount: nextAmount }
          : g,
      );
      setGoals(goalsRef.current);
    };

    applyToGoal(depositAmount);

    if (!targetUserId || !isPersistedGoal(goalId)) return;

    const goalKey = String(goalId);
    pendingDepositsRef.current.set(
      goalKey,
      roundCurrency((pendingDepositsRef.current.get(goalKey) || 0) + depositAmount),
    );
    const releasePending = () => {
      const remaining = roundCurrency((pendingDepositsRef.current.get(goalKey) || 0) - depositAmount);
      if (remaining > 0) {
        pendingDepositsRef.current.set(goalKey, remaining);
        return remaining;
      }
      pendingDepositsRef.current.delete(goalKey);
      return 0;
    };

    // The database adds the amount atomically, so other devices cannot overwrite it.
    // Writes also run in order so the fallback for an unmigrated database stays correct.
    const write = depositWritesRef.current.then(async () => {
      try {
        if (activeUserRef.current !== targetUserId) {
          releasePending();
          return;
        }
        const { data: newTotal, error: rpcError } = await supabase.rpc('add_savings_goal_deposit', {
          goal_id: goalId,
          deposit_amount: depositAmount,
        });
        if (activeUserRef.current !== targetUserId) {
          releasePending();
          return;
        }
        if (!rpcError) {
          const remainingPending = releasePending();
          const parsedTotal =
            newTotal === null || newTotal === undefined || newTotal === '' ? NaN : Number(newTotal);
          if (Number.isFinite(parsedTotal)) {
            setGoalAmount(parsedTotal + remainingPending);
          }
          return;
        }
        if (rpcError.code !== 'PGRST202' && rpcError.code !== '42883') throw rpcError;

        const goal = goalsRef.current.find((g) => String(g.id) === goalKey);
        if (!goal) {
          throw new Error('Savings goal not found');
        }
        const remainingAfterThis = Math.max(
          0,
          roundCurrency((pendingDepositsRef.current.get(goalKey) || 0) - depositAmount),
        );
        const amountToPersist = Math.max(0, roundCurrency(goal.current_amount - remainingAfterThis));
        const { data: updatedRows, error: updateError } = await supabase
          .from('savings_goals')
          .update({ current_amount: amountToPersist })
          .eq('id', goalId)
          .eq('user_id', targetUserId)
          .select('id');
        if (updateError) throw updateError;
        if (!updatedRows?.length) {
          throw new Error('Savings goal not found');
        }
        releasePending();
      } catch (err) {
        releasePending();
        applyToGoal(-depositAmount);
        throw err;
      }
    });
    depositWritesRef.current = write.catch(() => {});

    try {
      await write;
      if (activeUserRef.current === targetUserId) {
        setError(null);
      }
    } catch (updateError) {
      console.error('Failed to update savings goal deposit:', updateError);
      if (activeUserRef.current === targetUserId) {
        setError(updateError.message);
      }
      throw updateError;
    }
  };

  return {
    goals,
    loading,
    error,
    addGoal,
    deleteGoal,
    addDeposit,
    setGoals,
  };
}
