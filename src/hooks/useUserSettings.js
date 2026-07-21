import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_SETTINGS = {
  is_pro_member: false,
  default_currency: 'USD',
  budget_impact_target: 35,
  monthly_budget: 150,
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
      });
      setError('');
      setIsLoading(false);
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { settings, isLoading, error };
}

export default useUserSettings;
