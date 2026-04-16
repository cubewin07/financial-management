import { useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import {
  SUBSCRIPTION_STORAGE_KEY,
  createSeedSubscriptions,
  createSubscription,
  getTotalSubscriptionBurden,
} from '../utils/subscriptions';

function useSubscriptions({ useSupabase = false, userId = 'local-owner' } = {}) {
  const seedSubscriptions = useMemo(() => createSeedSubscriptions(userId), [userId]);
  const [subscriptions, setSubscriptions] = useLocalStorage(
    SUBSCRIPTION_STORAGE_KEY,
    seedSubscriptions,
  );

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

  const addSubscription = (input) => {
    if (useSupabase) {
      return;
    }

    setSubscriptions((current) => [createSubscription(input, userId), ...current]);
  };

  const toggleSubscription = (subscriptionId) => {
    if (useSupabase) {
      return;
    }

    setSubscriptions((current) =>
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
  };
}

export default useSubscriptions;

