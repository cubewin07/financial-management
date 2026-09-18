import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_SETTINGS = {
  is_pro_member: false,
  default_currency: 'NZD',
  budget_impact_target: 35,
  monthly_budget: 0,
  fixed_budget: 0,
  salary_allocation: 0,
  part_time_hours: 0,
  part_time_rate: 0,
  carry_over: 0,
  category_limits: {},
};

function useUserSettings({ userId = 'local-owner' } = {}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSettings = useCallback(
    async (silent = false) => {
      if (!userId) {
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
        setError('');
        return;
      }

      if (!silent) {
        setIsLoading(true);
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setSettings({
          is_pro_member: data?.is_pro_member ?? DEFAULT_SETTINGS.is_pro_member,
          default_currency: data?.default_currency ?? DEFAULT_SETTINGS.default_currency,
          budget_impact_target: data?.budget_impact_target ?? DEFAULT_SETTINGS.budget_impact_target,
          monthly_budget: data?.monthly_budget ?? DEFAULT_SETTINGS.monthly_budget,
          fixed_budget: data?.fixed_budget ?? DEFAULT_SETTINGS.fixed_budget,
          salary_allocation: data?.salary_allocation ?? DEFAULT_SETTINGS.salary_allocation,
          part_time_hours: data?.part_time_hours ?? DEFAULT_SETTINGS.part_time_hours,
          part_time_rate: data?.part_time_rate ?? DEFAULT_SETTINGS.part_time_rate,
          carry_over: Number(data?.carry_over ?? DEFAULT_SETTINGS.carry_over),
          category_limits: data?.category_limits ?? DEFAULT_SETTINGS.category_limits,
        });
        setError('');
      } catch (err) {
        console.error('Error loading user settings:', err);
        setError(err.message || 'Failed to load user settings');
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadSettings(false);

    if (!userId) return;

    // Supabase Realtime channel subscription for user_settings changes
    const channel = supabase
      .channel(`user_settings:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadSettings(true);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Realtime] user_settings channel warning:', err);
        }
      });

    // Window focus and visibility listener for instant cross-tab / mobile resume sync
    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadSettings(true);
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [userId, loadSettings]);

  const updateUserSettings = async (updatedFields) => {
    if (!userId) return { error: 'No user specified' };

    const payload = {
      user_id: userId,
      ...updatedFields,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return { error };
    }

    setSettings((prev) => ({
      ...prev,
      ...data,
      carry_over: data?.carry_over !== undefined ? Number(data.carry_over) : prev.carry_over,
      monthly_budget: data?.monthly_budget !== undefined ? Number(data.monthly_budget) : prev.monthly_budget,
      fixed_budget: data?.fixed_budget !== undefined ? Number(data.fixed_budget) : prev.fixed_budget,
      salary_allocation: data?.salary_allocation !== undefined ? Number(data.salary_allocation) : prev.salary_allocation,
      part_time_hours: data?.part_time_hours !== undefined ? Number(data.part_time_hours) : prev.part_time_hours,
      part_time_rate: data?.part_time_rate !== undefined ? Number(data.part_time_rate) : prev.part_time_rate,
    }));

    return { data };
  };

  return { settings, isLoading, error, updateUserSettings, reloadSettings: () => loadSettings(true) };
}

export default useUserSettings;
