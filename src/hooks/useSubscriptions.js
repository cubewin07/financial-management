import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getTotalSubscriptionBurden } from '../utils/subscriptions';

function normalizeSubscription(subscription) {
  return {
    ...subscription,
    amount: Number(subscription.amount),
    active: subscription.active !== false,
    remind_days_before: subscription.remind_days_before ?? null,
    service_key: subscription.service_key ?? null,
    currency: subscription.currency ?? 'USD',
    plan_tier: subscription.plan_tier ?? null,
    category: subscription.category ?? null,
  };
}

function useSubscriptions({ userId = 'local-owner' } = {}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState('');

  useEffect(() => {
    if (!userId) {
      setSubscriptions([]);
      setSubscriptionError('');
      return;
    }

    let isMounted = true;

    const loadSubscriptions = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setSubscriptions([]);
        setSubscriptionError(error.message);
        return;
      }

      setSubscriptions((data || []).map(normalizeSubscription));
      setSubscriptionError('');
    };

    loadSubscriptions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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
        active: input.active ?? true,
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
  };
}

export default useSubscriptions;
