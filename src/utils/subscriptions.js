import {
  addMonths,
  addWeeks,
  differenceInMonths,
  differenceInWeeks,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  endOfMonth,
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

  try {
    if (!startDate) return null;
    const parsedStart = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) return null;

    const anchor = startOfDay(parsedStart);

    const parsedFrom = fromDate ? (typeof fromDate === 'string' ? parseISO(fromDate) : new Date(fromDate)) : new Date();
    if (Number.isNaN(parsedFrom.getTime())) return null;

    const now = startOfDay(parsedFrom);

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
  } catch (e) {
    return null;
  }
}

export function formatNextBilling(date) {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return '—';
  }
}

/**
 * Advance a subscription past its next billing cycle.
 * Used by UI "Skip Week" / "Skip Next Billing Period" actions:
 * result is persisted as the new `start_date`.
 *
 * @param {object} subscription - must include start_date and frequency ('weekly' | 'monthly')
 * @param {Date|string} [fromDate] - optional "today" for deterministic behavior/tests
 * @returns {string|null} new start_date as yyyy-MM-dd, or null if skip is not possible
 */
export function skipNextBillingCycle(subscription, fromDate) {
  if (!subscription || !subscription.start_date) return null;
  const { start_date, frequency } = subscription;
  const currentNext = getNextBillingDate({ startDate: start_date, frequency, fromDate });
  if (!currentNext) return null;

  // Weekly = skip one week (uni break). Anything else defaults to one month.
  const nextAnchor = frequency === 'weekly' ? addWeeks(currentNext, 1) : addMonths(currentNext, 1);
  return format(nextAnchor, 'yyyy-MM-dd');
}

/**
 * Computes payload for skipping a billing cycle while preserving historical start date
 * and recording the skipped date in skipped_dates array.
 */
export function computeSkipPayload(subscription, fromDate) {
  if (!subscription || !subscription.start_date) return null;
  const { start_date, frequency, initial_start_date, skipped_dates = [] } = subscription;
  const currentNext = getNextBillingDate({ startDate: start_date, frequency, fromDate });
  if (!currentNext) return null;

  const skippedDateStr = format(currentNext, 'yyyy-MM-dd');
  const nextAnchor = frequency === 'weekly' ? addWeeks(currentNext, 1) : addMonths(currentNext, 1);
  const nextDateStr = format(nextAnchor, 'yyyy-MM-dd');

  const existingSkipped = Array.isArray(skipped_dates) ? skipped_dates : [];
  const updatedSkipped = existingSkipped.includes(skippedDateStr)
    ? existingSkipped
    : [...existingSkipped, skippedDateStr];

  return {
    start_date: nextDateStr,
    initial_start_date: initial_start_date || start_date,
    skipped_dates: updatedSkipped,
    skippedDate: skippedDateStr,
    nextDate: nextDateStr,
  };
}

export function getUpcomingBillingAlerts(subscriptions = [], { today = new Date(), daysAhead = 3 } = {}) {
  try {
    const parsedToday = typeof today === 'string' ? parseISO(today) : new Date(today);
    if (Number.isNaN(parsedToday.getTime())) return [];

    const now = startOfDay(parsedToday);
    const alertLimit = addDays(now, daysAhead);

    return subscriptions
      .filter(sub => sub.active !== false && sub.remind_days_before != null)
      .map(sub => {
        const nextBilling = getNextBillingDate({ startDate: sub.start_date, frequency: sub.frequency, fromDate: now });
        return { ...sub, nextBilling };
      })
      .filter(sub => {
        if (!sub.nextBilling) return false;
        try {
          const alertDate = subDays(sub.nextBilling, sub.remind_days_before);
          return (isAfter(alertDate, now) || isSameDay(alertDate, now)) &&
                 (isBefore(alertDate, alertLimit) || isSameDay(alertDate, alertLimit));
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.nextBilling - b.nextBilling);
  } catch (e) {
    return [];
  }
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
  const domain = subscription?.domain || subscription?.brand_domain || (brandKey ? `${brandKey}.com` : null);
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

  if (brandKey) {
    const service = STATIC_SERVICE_CATALOG.find((s) => s.brand_key === brandKey);
    if (service) {
      return {
        ...service,
        icon: service.brand_key,
        domain: domain || `${service.brand_key}.com`,
        logoUrl: logoUrl || `https://logo.clearbit.com/${service.brand_key}.com`,
      };
    }
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
    domain,
    logoUrl,
  };
}

/**
 * Generate recurring subscription expense occurrences from each subscription's start_date
 * up to the cutoff date (defaulting to today).
 *
 * @param {Array} subscriptions - array of subscription objects
 * @param {Date|string} [cutoffDate=new Date()] - upper bound cutoff date
 * @returns {Array} array of expense objects generated for subscription billing dates
 */
export function generateSubscriptionExpenseOccurrences(subscriptions = [], cutoffDate = endOfMonth(new Date())) {
  const occurrences = [];
  try {
    const cutoff = startOfDay(typeof cutoffDate === 'string' ? parseISO(cutoffDate) : cutoffDate);
    if (Number.isNaN(cutoff.getTime())) return occurrences;

    subscriptions.forEach((sub) => {
      if (sub.active === false || (!sub.start_date && !sub.initial_start_date)) return;

      const effectiveStart = sub.initial_start_date || sub.start_date;
      let cursor = startOfDay(typeof effectiveStart === 'string' ? parseISO(effectiveStart) : effectiveStart);
      if (Number.isNaN(cursor.getTime()) || isAfter(cursor, cutoff)) return;

      const skippedSet = new Set(Array.isArray(sub.skipped_dates) ? sub.skipped_dates : []);

      let safetyCounter = 0;
      while ((isBefore(cursor, cutoff) || isSameDay(cursor, cutoff)) && safetyCounter < 500) {
        const dateStr = format(cursor, 'yyyy-MM-dd');

        // Only emit occurrence if this date was not explicitly skipped
        if (!skippedSet.has(dateStr)) {
          occurrences.push({
            id: `sub-exp-${sub.id}-${dateStr}`,
            subscription_id: sub.id,
            isSubscription: true,
            item: sub.label,
            category: sub.category || 'Subscriptions',
            amount: Number(sub.amount || 0),
            date: dateStr,
            created_at: cursor.toISOString(),
          });
        }

        if (sub.frequency === 'weekly') {
          cursor = addWeeks(cursor, 1);
        } else {
          cursor = addMonths(cursor, 1);
        }
        safetyCounter++;
      }
    });
  } catch (e) {
    console.error('Error generating subscription occurrences:', e);
  }

  return occurrences;
}
