import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTotalSubscriptionBurden } from '../utils/subscriptions';

function normalizeSubscription(subscription) {
  return {
    ...subscription,
    amount: Number(subscription.amount),
    active: subscription.active !== false,
    remind_days_before: subscription.remind_days_before ?? null,
    service_key: subscription.service_key ?? null,
    currency: subscription.currency ?? 'NZD',
    plan_tier: subscription.plan_tier ?? null,
    category: subscription.category ?? null,
    initial_start_date: subscription.initial_start_date ?? subscription.start_date,
    skipped_dates: Array.isArray(subscription.skipped_dates) ? subscription.skipped_dates : [],
  };
}

function useSubscriptions({ userId = 'local-owner' } = {}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState('');

  const loadSubscriptions = useCallback(async () => {
    if (!userId) {
      setSubscriptions([]);
      setSubscriptionError('');
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setSubscriptions([]);
      setSubscriptionError(error.message);
      return;
    }

    setSubscriptions((data || []).map(normalizeSubscription));
    setSubscriptionError('');
  }, [userId]);

  useEffect(() => {
    loadSubscriptions();

    if (!userId) return;

    // Supabase Realtime channel subscription for subscriptions changes
    const channel = supabase
      .channel(`subscriptions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadSubscriptions();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Realtime] subscriptions channel warning:', err);
        }
      });

    // Window focus and visibility listener for instant cross-tab / mobile resume sync
    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadSubscriptions();
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [userId, loadSubscriptions]);

  const sortedSubscriptions = useMemo(
    () =>
      [...subscriptions].sort((left, right) => {
        if (left.active !== right.active) {
          return left.active ? -1 : 1;
        }

        return left.label.localeCompare(right.label);
      }),
    [subscriptions],
  );

  const totalMonthlyBurden = useMemo(
    () => getTotalSubscriptionBurden(sortedSubscriptions),
    [sortedSubscriptions],
  );

  const addSubscription = async (input) => {
    if (!userId) {
      setSubscriptionError('Sign in before adding a subscription.');
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        label: input.label.trim(),
        amount: Number(input.amount),
        frequency: input.frequency,
        start_date: input.start_date,
        initial_start_date: input.initial_start_date || input.start_date,
        skipped_dates: input.skipped_dates || [],
        active: input.active ?? true,
        domain: input.domain ?? null,
        currency: input.currency ?? 'NZD',
        plan_tier: input.plan_tier ?? null,
        remind_days_before: input.remind_days_before ?? null,
      })
      .select('*')
      .single();

    if (error) {
      setSubscriptionError(error.message);
      return;
    }

    setSubscriptions((current) => [normalizeSubscription(data), ...current]);
    setSubscriptionError('');
  };

  const toggleSubscription = async (subscriptionId) => {
    if (!userId) {
      setSubscriptionError('Sign in before updating a subscription.');
      return;
    }

    const targetSubscription = subscriptions.find(
      (subscription) => subscription.id === subscriptionId,
    );

    if (!targetSubscription) {
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ active: !targetSubscription.active })
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      setSubscriptionError(error.message);
      return;
    }

    const nextSubscription = normalizeSubscription(data);

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === subscriptionId ? nextSubscription : subscription,
      ),
    );
    setSubscriptionError('');
  };

  const updateSubscription = async (subscriptionId, updates) => {
    if (!userId) {
      setSubscriptionError('Sign in before updating a subscription.');
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      setSubscriptionError(error.message);
      return;
    }

    const nextSubscription = normalizeSubscription(data);

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === subscriptionId ? nextSubscription : subscription,
      ),
    );
    setSubscriptionError('');
  };

  const removeSubscription = async (subscriptionId) => {
    if (!userId) {
      setSubscriptionError('Sign in before removing a subscription.');
      return;
    }

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (error) {
      setSubscriptionError(error.message);
      return;
    }

    setSubscriptions((current) =>
      current.filter((subscription) => subscription.id !== subscriptionId)
    );
    setSubscriptionError('');
  };

  return {
    subscriptions: sortedSubscriptions,
    totalMonthlyBurden,
    addSubscription,
    toggleSubscription,
    updateSubscription,
    removeSubscription,
    error: subscriptionError,
    reloadSubscriptions: loadSubscriptions,
  };
}

export default useSubscriptions;
