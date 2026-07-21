import {
  addMonths,
  addWeeks,
  differenceInMonths,
  differenceInWeeks,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  addDays,
  subDays,
  parseISO,
  format
} from 'date-fns';

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
  const today = format(new Date(), 'yyyy-MM-dd');

  return [
    createSubscription(
      {
        label: 'Bus pass',
        amount: 15,
        frequency: 'weekly',
        start_date: today,
        active: true,
        remind_days_before: 3,
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
        remind_days_before: 3,
      },
      userId,
    ),
  ];
}

export function getNextBillingDate(arg1, arg2, arg3) {
  let startDate, frequency, fromDate;
  if (typeof arg1 === 'object' && arg1 !== null && !arg1.getTime) {
    ({ startDate, frequency, fromDate } = arg1);
  } else {
    startDate = arg1;
    frequency = arg2;
    fromDate = arg3;
  }

  if (!startDate) return startOfDay(fromDate ? (typeof fromDate === 'string' ? parseISO(fromDate) : new Date(fromDate)) : new Date());
  const anchor = startOfDay(typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate));
  const now = startOfDay(fromDate ? (typeof fromDate === 'string' ? parseISO(fromDate) : new Date(fromDate)) : new Date());

  if (isBefore(now, anchor) || isSameDay(now, anchor)) {
    return anchor;
  }

  if (frequency === 'monthly') {
    const elapsed = differenceInMonths(now, anchor);
    const candidate = addMonths(anchor, elapsed);
    if (isBefore(candidate, now)) {
      return addMonths(anchor, elapsed + 1);
    }
    return candidate;
  } else if (frequency === 'weekly') {
    const elapsed = differenceInWeeks(now, anchor);
    const candidate = addWeeks(anchor, elapsed);
    if (isBefore(candidate, now)) {
      return addWeeks(anchor, elapsed + 1);
    }
    return candidate;
  }

  return anchor;
}

export function formatNextBilling(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getUpcomingBillingAlerts(subscriptions = [], { today = new Date(), daysAhead = 3 } = {}) {
  const now = startOfDay(typeof today === 'string' ? parseISO(today) : new Date(today));
  const alertLimit = addDays(now, daysAhead);

  return subscriptions
    .filter(sub => sub.active !== false && sub.remind_days_before != null)
    .map(sub => {
      const nextBilling = getNextBillingDate({ startDate: sub.start_date, frequency: sub.frequency, fromDate: now });
      return { ...sub, nextBilling };
    })
    .filter(sub => {
      const alertDate = subDays(sub.nextBilling, sub.remind_days_before);
      return (isAfter(alertDate, now) || isSameDay(alertDate, now)) &&
             (isBefore(alertDate, alertLimit) || isSameDay(alertDate, alertLimit));
    })
    .sort((a, b) => a.nextBilling - b.nextBilling);
}

export const STATIC_SERVICE_CATALOG = [
  { brand_key: 'netflix', name: 'Netflix', default_amount: 15.49, frequency: 'monthly' },
  { brand_key: 'spotify', name: 'Spotify', default_amount: 10.99, frequency: 'monthly' },
  { brand_key: 'amazon_prime', name: 'Amazon Prime', default_amount: 139.00, frequency: 'monthly' },
  { brand_key: 'disney_plus', name: 'Disney+', default_amount: 7.99, frequency: 'monthly' },
  { brand_key: 'hulu', name: 'Hulu', default_amount: 7.99, frequency: 'monthly' },
  { brand_key: 'apple_tv', name: 'Apple TV+', default_amount: 9.99, frequency: 'monthly' },
];

export function getServicePresentation(subscription) {
  const brandKey = subscription?.brand_key;
  const label = subscription?.label || 'Unknown';

  if (brandKey) {
    const service = STATIC_SERVICE_CATALOG.find((s) => s.brand_key === brandKey);
    if (service) return { ...service, icon: service.brand_key };
  }

  const initials = label.slice(0, 2).toUpperCase();
  const colors = ['#d0bcff', '#00eefc', '#f15999', '#9f78ff', '#d3fbff', '#ffb0ca'];
  const hash = [...label].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hash % colors.length];

  return {
    name: label,
    initials,
    color,
    icon: null,
  };
}
