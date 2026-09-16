import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!userId) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      setError('');
      return;
    }

    let isMounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setSettings(DEFAULT_SETTINGS);
        setError(error.message);
        setIsLoading(false);
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
      setIsLoading(false);
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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
    }));

    return { data };
  };

  return { settings, isLoading, error, updateUserSettings };
}

export default useUserSettings;
