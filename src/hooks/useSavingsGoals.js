import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { isPersistedGoal } from '../utils/finance.js';

const INITIAL_GOALS = [
  { id: 'starter-1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: 'starter-2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: 'starter-3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

export default function useSavingsGoals({ userId }) {
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const goalsRef = useRef(goals);

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

        if (!data || data.length === 0) {
          setGoals(INITIAL_GOALS);
          goalsRef.current = INITIAL_GOALS;
        } else {
          const normalized = data.map((item) => ({
            ...item,
            target_amount: Number(item.target_amount),
            current_amount: Number(item.current_amount || 0),
            priority: item.priority || 'medium',
          }));
          goalsRef.current = normalized;
          setGoals(normalized);
        }
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
    if (!userId) {
      const created = { id: `mock-${Date.now()}`, ...newGoal };
      goalsRef.current = [created, ...goalsRef.current];
      setGoals(goalsRef.current);
      return created;
    }

    const { data, error } = await supabase
      .from('savings_goals')
      .insert([
        {
          user_id: userId,
          name: newGoal.name,
          target_amount: Number(newGoal.target_amount),
          current_amount: Number(newGoal.current_amount || 0),
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
    };

    goalsRef.current = [created, ...goalsRef.current];
    setGoals(goalsRef.current);
    return created;
  };

  const deleteGoal = async (goalId) => {
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
      }
    }
  };

  const addDeposit = async (goalId, amount) => {
    const depositAmount = Number(amount) || 0;
    if (depositAmount <= 0) return;

    let targetTotal = null;
    const nextGoals = goalsRef.current.map((g) => {
      if (String(g.id) === String(goalId)) {
        const updated = Number(g.current_amount || 0) + depositAmount;
        targetTotal = updated;
        return { ...g, current_amount: updated };
      }
      return g;
    });

    // Optimistically update ref and state immediately
    goalsRef.current = nextGoals;
    setGoals(nextGoals);

    if (userId && isPersistedGoal(goalId) && targetTotal !== null) {
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: targetTotal })
        .eq('id', goalId);

      if (updateError) {
        console.error('Failed to update savings goal deposit:', updateError);
        setError(updateError.message);
        goalsRef.current = goalsRef.current.map((g) =>
          String(g.id) === String(goalId)
            ? { ...g, current_amount: Number(g.current_amount || 0) - depositAmount }
            : g,
        );
        setGoals(goalsRef.current);
      }
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
