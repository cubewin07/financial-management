import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { isPersistedGoal, roundCurrency } from '../utils/finance.js';

const INITIAL_GOALS = [
  { id: 'starter-1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: 'starter-2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: 'starter-3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

export default function useSavingsGoals({ userId }) {
  const [goals, setGoals] = useState(userId ? [] : INITIAL_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const goalsRef = useRef(goals);
  const depositWritesRef = useRef(Promise.resolve());

  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  useEffect(() => {
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
      };
      setError(null);
      goalsRef.current = [created, ...goalsRef.current];
      setGoals(goalsRef.current);
      return created;
    }

    const { data, error } = await supabase
      .from('savings_goals')
      .insert([
        {
          user_id: userId,
          name: trimmedName,
          target_amount: targetAmount,
          current_amount: currentAmount,
          priority: newGoal.priority || 'medium',
          deadline_date: newGoal.deadline_date || null,
        },
      ])
      .select('*')
      .single();

    if (error) {
      setError(error.message);
      return null;
    }

    const created = {
      ...data,
      target_amount: Number(data.target_amount),
      current_amount: Number(data.current_amount || 0),
      priority: data.priority || 'medium',
    };

    setError(null);
    goalsRef.current = [created, ...goalsRef.current];
    setGoals(goalsRef.current);
    return created;
  };

  const deleteGoal = async (goalId) => {
    const previousGoals = goalsRef.current;
    goalsRef.current = goalsRef.current.filter((g) => String(g.id) !== String(goalId));
    setGoals(goalsRef.current);

    if (userId && isPersistedGoal(goalId)) {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        console.error('Failed to delete savings goal:', error);
        setError(error.message);
        goalsRef.current = previousGoals;
        setGoals(previousGoals);
      }
    }
  };

  const addDeposit = async (goalId, amount) => {
    const raw = Number(amount);
    const depositAmount = Number.isFinite(raw) ? roundCurrency(raw) : 0;
    if (depositAmount <= 0) {
      const err = new Error('Deposit amount must be greater than 0.');
      setError(err.message);
      throw err;
    }

    const applyToGoal = (delta) => {
      goalsRef.current = goalsRef.current.map((g) =>
        String(g.id) === String(goalId)
          ? { ...g, current_amount: Math.max(0, roundCurrency(Number(g.current_amount || 0) + delta)) }
          : g,
      );
      setGoals(goalsRef.current);
    };

    applyToGoal(depositAmount);

    if (!userId || !isPersistedGoal(goalId)) return;

    // The database adds the amount atomically, so other devices cannot overwrite it.
    // Writes also run in order so the fallback for an unmigrated database stays correct.
    const write = depositWritesRef.current.then(async () => {
      const { error: rpcError } = await supabase.rpc('add_savings_goal_deposit', {
        goal_id: goalId,
        deposit_amount: depositAmount,
      });
      if (!rpcError) return;
      if (rpcError.code !== 'PGRST202' && rpcError.code !== '42883') throw rpcError;

      const goal = goalsRef.current.find((g) => String(g.id) === String(goalId));
      if (!goal) return;
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: goal.current_amount })
        .eq('id', goalId);
      if (updateError) throw updateError;
    });
    depositWritesRef.current = write.catch(() => {});

    try {
      await write;
    } catch (updateError) {
      console.error('Failed to update savings goal deposit:', updateError);
      setError(updateError.message);
      applyToGoal(-depositAmount);
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
