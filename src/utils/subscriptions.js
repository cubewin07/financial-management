export const SUBSCRIPTION_STORAGE_KEY = 'finance-subscriptions';
export const MONTHLY_PROJECTION_MULTIPLIER = 4.33;

function createId(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function projectSubscriptionCost(subscription) {
  const amount = Number(subscription?.amount || 0);

  if (subscription?.frequency === 'weekly') {
    return roundCurrency(amount * MONTHLY_PROJECTION_MULTIPLIER);
  }

  return roundCurrency(amount);
}

export function getTotalSubscriptionBurden(subscriptions = []) {
  return roundCurrency(
    subscriptions.reduce((sum, subscription) => {
      const isActive = subscription?.active !== false;

      if (!isActive) {
        return sum;
      }

      return sum + projectSubscriptionCost(subscription);
    }, 0),
  );
}

export function getSubscriptionBudgetShare(subscriptions = [], budget = 0) {
  if (budget <= 0) {
    return 0;
  }

  return (getTotalSubscriptionBurden(subscriptions) / budget) * 100;
}

export function createSubscription(input, userId = 'local-owner') {
  return {
    id: createId('subscription'),
    user_id: userId,
    label: input.label.trim(),
    amount: roundCurrency(input.amount),
    frequency: input.frequency,
    start_date: input.start_date,
    active: input.active ?? true,
    created_at: new Date().toISOString(),
  };
}

export function createSeedSubscriptions(userId = 'local-owner') {
  const today = new Date().toISOString().slice(0, 10);

  return [
    createSubscription(
      {
        label: 'Bus pass',
        amount: 15,
        frequency: 'weekly',
        start_date: today,
        active: true,
      },
      userId,
    ),
    createSubscription(
      {
        label: 'Cellular data',
        amount: 20,
        frequency: 'monthly',
        start_date: today,
        active: true,
      },
      userId,
    ),
  ];
}
