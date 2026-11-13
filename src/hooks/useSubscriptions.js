import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { shouldTriggerVisibilitySync } from '../lib/connectionHealth';
import { buildPriceHistory, computeActivationUpdate, computeRemovalUpdate } from '../utils/subscriptions';
import { roundCurrency } from '../utils/finance';

function normalizeSubscription(subscription) {
  return {
    ...subscription,
    amount: roundCurrency(subscription.amount),
    active: subscription.active !== false,
    remind_days_before: subscription.remind_days_before ?? null,
    service_key: subscription.service_key ?? null,
    currency: subscription.currency ?? 'NZD',
    plan_tier: subscription.plan_tier ?? null,
    category: subscription.category ?? null,
    initial_start_date: subscription.initial_start_date ?? subscription.start_date,
    skipped_dates: Array.isArray(subscription.skipped_dates) ? subscription.skipped_dates : [],
    price_history: Array.isArray(subscription.price_history) ? subscription.price_history : [],
    ended_on: subscription.ended_on ?? null,
    archived_at: subscription.archived_at ?? null,
  };
}

function useSubscriptions({ userId = 'local-owner' } = {}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const activeUserRef = useRef(userId);

  useEffect(() => {
    activeUserRef.current = userId;
    setSubscriptions([]);
    setSubscriptionError('');
    setIsLoaded(false);
  }, [userId]);

  const loadSubscriptions = useCallback(async () => {
    const targetUserId = userId;
    if (!targetUserId) {
      setSubscriptions([]);
      setSubscriptionError('');
      setIsLoaded(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (activeUserRef.current !== targetUserId) return;

      if (error) {
        setSubscriptions([]);
        setSubscriptionError(error.message);
        return;
      }

      setSubscriptions((data || []).map(normalizeSubscription));
      setSubscriptionError('');
      setIsLoaded(true);
    } catch (err) {
      if (activeUserRef.current !== targetUserId) return;
      setSubscriptions([]);
      setSubscriptionError(err.message || 'Failed to load subscriptions');
    }
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
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        shouldTriggerVisibilitySync('subscriptions')
      ) {
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

  const visibleSubscriptions = useMemo(
    () => sortedSubscriptions.filter((subscription) => !subscription.archived_at),
    [sortedSubscriptions],
  );

  const addSubscription = async (input) => {
    if (!userId) {
      setSubscriptionError('Sign in before adding a subscription.');
      return false;
    }

    const label = String(input?.label || '').trim();
    const rawAmount = Number(input?.amount);
    const amount = Number.isFinite(rawAmount) ? roundCurrency(rawAmount) : 0;
    if (!label || amount <= 0) {
      setSubscriptionError('Subscription name and amount greater than 0 are required.');
      return false;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        label,
        amount,
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
      return false;
    }

    setSubscriptions((current) => [normalizeSubscription(data), ...current]);
    setSubscriptionError('');
    return true;
  };

  const toggleSubscription = async (subscriptionId) => {
    if (!userId) {
      setSubscriptionError('Sign in before updating a subscription.');
      return false;
    }

    const targetSubscription = subscriptions.find(
      (subscription) => subscription.id === subscriptionId,
    );

    if (!targetSubscription) {
      return false;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(computeActivationUpdate(targetSubscription))
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      setSubscriptionError(error.message);
      return false;
    }

    const nextSubscription = normalizeSubscription(data);

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === subscriptionId ? nextSubscription : subscription,
      ),
    );
    setSubscriptionError('');
    return true;
  };

  const updateSubscription = async (subscriptionId, updates) => {
    if (!userId) {
      setSubscriptionError('Sign in before updating a subscription.');
      return false;
    }

    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.label !== undefined) {
      const trimmedLabel = String(normalizedUpdates.label).trim();
      if (!trimmedLabel) {
        setSubscriptionError('Subscription name is required.');
        return false;
      }
      normalizedUpdates.label = trimmedLabel;
    }
    if (normalizedUpdates.amount !== undefined) {
      const rawAmount = Number(normalizedUpdates.amount);
      const roundedAmount = Number.isFinite(rawAmount) ? roundCurrency(rawAmount) : 0;
      if (roundedAmount <= 0) {
        setSubscriptionError('Subscription amount must be greater than 0.');
        return false;
      }
      normalizedUpdates.amount = roundedAmount;
    }

    const targetSubscription = subscriptions.find((subscription) => subscription.id === subscriptionId);
    const priceHistory = targetSubscription ? buildPriceHistory(targetSubscription, normalizedUpdates) : undefined;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(priceHistory ? { ...normalizedUpdates, price_history: priceHistory } : normalizedUpdates)
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      setSubscriptionError(error.message);
      return false;
    }

    const nextSubscription = normalizeSubscription(data);

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === subscriptionId ? nextSubscription : subscription,
      ),
    );
    setSubscriptionError('');
    return true;
  };

  const removeSubscription = async (subscriptionId) => {
    if (!userId) {
      setSubscriptionError('Sign in before removing a subscription.');
      return false;
    }

    const targetSubscription = subscriptions.find((subscription) => subscription.id === subscriptionId);
    if (!targetSubscription) return false;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(computeRemovalUpdate(targetSubscription))
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      setSubscriptionError(error.message);
      return false;
    }

    const removedSubscription = normalizeSubscription(data);
    setSubscriptions((current) =>
      current.map((subscription) => (subscription.id === subscriptionId ? removedSubscription : subscription))
    );
    setSubscriptionError('');
    return true;
  };

  return {
    subscriptions: visibleSubscriptions,
    allSubscriptions: sortedSubscriptions,
    isLoaded,
    addSubscription,
    toggleSubscription,
    updateSubscription,
    removeSubscription,
    error: subscriptionError,
    reloadSubscriptions: loadSubscriptions,
  };
}

export default useSubscriptions;
