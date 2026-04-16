import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import useLocalStorage from './useLocalStorage';
import {
  SUBSCRIPTION_STORAGE_KEY,
  createSeedSubscriptions,
  createSubscription,
  getTotalSubscriptionBurden,
} from '../utils/subscriptions';

function normalizeSubscription(subscription) {
  return {
    ...subscription,
    amount: Number(subscription.amount),
    active: subscription.active !== false,
  };
}

function useSubscriptions({ useSupabase = false, userId = 'local-owner' } = {}) {
  const seedSubscriptions = useMemo(() => createSeedSubscriptions(userId), [userId]);
  const [localSubscriptions, setLocalSubscriptions] = useLocalStorage(
    SUBSCRIPTION_STORAGE_KEY,
    seedSubscriptions,
  );
  const [supabaseSubscriptions, setSupabaseSubscriptions] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState('');

  useEffect(() => {
    if (!useSupabase) {
      setSubscriptionError('');
      return;
    }

    if (!userId) {
      setSupabaseSubscriptions([]);
      setSubscriptionError('');
      return;
    }

    let isMounted = true;

    const loadSubscriptions = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id,user_id,label,amount,frequency,start_date,active,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setSupabaseSubscriptions([]);
        setSubscriptionError(error.message);
        return;
      }

      setSupabaseSubscriptions((data || []).map(normalizeSubscription));
      setSubscriptionError('');
    };

    loadSubscriptions();

    return () => {
      isMounted = false;
    };
  }, [useSupabase, userId]);

  const subscriptions = useSupabase ? supabaseSubscriptions : localSubscriptions;

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
    if (useSupabase) {
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
        .select('id,user_id,label,amount,frequency,start_date,active,created_at')
        .single();

      if (error) {
        setSubscriptionError(error.message);
        return;
      }

      setSupabaseSubscriptions((current) => [normalizeSubscription(data), ...current]);
      setSubscriptionError('');
      return;
    }

    setLocalSubscriptions((current) => [createSubscription(input, userId), ...current]);
  };

  const toggleSubscription = async (subscriptionId) => {
    if (useSupabase) {
      if (!userId) {
        setSubscriptionError('Sign in before updating a subscription.');
        return;
      }

      const targetSubscription = supabaseSubscriptions.find(
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
        .select('id,user_id,label,amount,frequency,start_date,active,created_at')
        .single();

      if (error) {
        setSubscriptionError(error.message);
        return;
      }

      const nextSubscription = normalizeSubscription(data);

      setSupabaseSubscriptions((current) =>
        current.map((subscription) =>
          subscription.id === subscriptionId ? nextSubscription : subscription,
        ),
      );
      setSubscriptionError('');
      return;
    }

    setLocalSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === subscriptionId
          ? { ...subscription, active: !subscription.active }
          : subscription,
      ),
    );
  };

  return {
    subscriptions: sortedSubscriptions,
    totalMonthlyBurden,
    addSubscription,
    toggleSubscription,
    error: subscriptionError,
  };
}

export default useSubscriptions;

