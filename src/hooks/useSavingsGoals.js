import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const INITIAL_GOALS = [
  { id: '1', name: 'Emergency Fund', target_amount: 5000, current_amount: 3200, priority: 'high', deadline_date: '2026-12-31' },
  { id: '2', name: 'Car Replacement', target_amount: 12000, current_amount: 4500, priority: 'medium', deadline_date: '2027-06-30' },
  { id: '3', name: 'Vacation Trip', target_amount: 2500, current_amount: 1800, priority: 'low', deadline_date: '2026-09-15' },
];

export default function useSavingsGoals({ userId }) {
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setGoals(INITIAL_GOALS);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchGoals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error || !data || data.length === 0) {
        setGoals(INITIAL_GOALS);
      } else {
        const normalized = data.map((item) => ({
          ...item,
          target_amount: Number(item.target_amount),
          current_amount: Number(item.current_amount || 0),
          priority: item.priority || 'medium',
        }));
        setGoals(normalized);
      }
      setLoading(false);
    };

    fetchGoals();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const addGoal = async (newGoal) => {
    if (!userId) {
      const created = { id: String(Date.now()), ...newGoal };
      setGoals((prev) => [created, ...prev]);
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

    setGoals((prev) => [created, ...prev]);
    return created;
  };

  const allocateCarryOver = async (goalId, amount) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, current_amount: g.current_amount + amount } : g,
      ),
    );

    if (userId) {
      const targetGoal = goals.find((g) => g.id === goalId);
      if (targetGoal && targetGoal.id.length > 5) {
        await supabase
          .from('savings_goals')
          .update({ current_amount: targetGoal.current_amount + amount })
          .eq('id', goalId);
      }
    }
  };

  const deleteGoal = async (goalId) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    if (userId && goalId && String(goalId).length > 5) {
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

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, current_amount: g.current_amount + depositAmount } : g,
      ),
    );

    if (userId && goalId && String(goalId).length > 5) {
      const targetGoal = goals.find((g) => g.id === goalId);
      if (targetGoal) {
        const newTotal = Number(targetGoal.current_amount || 0) + depositAmount;
        await supabase
          .from('savings_goals')
          .update({ current_amount: newTotal })
          .eq('id', goalId);
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
    allocateCarryOver,
    setGoals,
  };
}

