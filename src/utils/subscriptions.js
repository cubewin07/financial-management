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
import { isRecurringExpense } from './finance.js';

export const SUBSCRIPTION_STORAGE_KEY = 'finance-subscriptions';
export const MONTHLY_PROJECTION_MULTIPLIER = 4.33;

function createId(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function roundCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const sign = num < 0 ? -1 : 1;
  const rounded = (sign * Math.round((Math.abs(num) + Number.EPSILON) * 100)) / 100;
  return rounded === 0 ? 0 : rounded;
}

// What a subscription costs in the budget currency (see withConvertedAmounts).
export function getBillingAmount(subscription) {
  const num = Number(subscription?.base_amount ?? subscription?.amount ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function projectSubscriptionCost(subscription) {
  const amount = getBillingAmount(subscription);

  if (subscription?.frequency === 'weekly') {
    return roundCurrency(amount * MONTHLY_PROJECTION_MULTIPLIER);
  }

  return roundCurrency(amount);
}

export function getTotalSubscriptionBurden(subscriptions = []) {
  return roundCurrency(
    (subscriptions || []).reduce((sum, subscription) => {
      const isActive = subscription?.active !== false;

      if (!isActive) {
        return sum;
      }

      return sum + projectSubscriptionCost(subscription);
    }, 0),
  );
}

export function getSubscriptionBudgetShare(subscriptions = [], budget = 0) {
  const budgetNum = Number(budget);
  if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
    return 0;
  }

  return (getTotalSubscriptionBurden(subscriptions) / budgetNum) * 100;
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
  } catch {
    return null;
  }
}

export function formatNextBilling(date) {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
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

  return format(getBillingDateAfter(start_date, frequency, currentNext), 'yyyy-MM-dd');
}

// Monthly dates are counted from the anchor, so a bill on the 31st returns to the 31st after a short month.
function getBillingDateAfter(startDate, frequency, billingDate) {
  // Weekly = skip one week (uni break). Anything else defaults to one month.
  if (frequency === 'weekly') return addWeeks(billingDate, 1);

  const anchor = startOfDay(typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate));
  const monthsFromAnchor =
    (billingDate.getFullYear() - anchor.getFullYear()) * 12 + (billingDate.getMonth() - anchor.getMonth());
  return addMonths(anchor, monthsFromAnchor + 1);
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
  const nextAnchor = getBillingDateAfter(start_date, frequency, currentNext);
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
    const daysNum = Number(daysAhead);
    const safeDaysAhead = Number.isFinite(daysNum) ? Math.max(0, daysNum) : 3;
    const alertLimit = addDays(now, safeDaysAhead);

    return (subscriptions || [])
      .filter(sub => {
        if (!sub || sub.active === false || sub.remind_days_before == null) return false;
        const remindDays = Number(sub.remind_days_before);
        return Number.isFinite(remindDays) && remindDays >= 0;
      })
      .map(sub => {
        const nextBilling = getNextBillingDate({ startDate: sub.start_date, frequency: sub.frequency, fromDate: now });
        return { ...sub, nextBilling };
      })
      .filter(sub => {
        if (!sub.nextBilling) return false;
        try {
          // Alert from the reminder date until the bill is due, including reminders that already started.
          const remindDays = Math.min(365, Number(sub.remind_days_before));
          const alertDate = subDays(sub.nextBilling, remindDays);
          return isBefore(alertDate, alertLimit) || isSameDay(alertDate, alertLimit);
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.nextBilling - b.nextBilling);
  } catch {
    return [];
  }
}

export const STATIC_SERVICE_CATALOG = [
  { brand_key: 'netflix', name: 'Netflix', domain: 'netflix.com', default_amount: 15.49, frequency: 'monthly' },
  { brand_key: 'spotify', name: 'Spotify', domain: 'spotify.com', default_amount: 10.99, frequency: 'monthly' },
  { brand_key: 'amazon_prime', name: 'Amazon Prime', domain: 'amazon.com', default_amount: 139.00, frequency: 'monthly' },
  { brand_key: 'disney_plus', name: 'Disney+', domain: 'disneyplus.com', default_amount: 7.99, frequency: 'monthly' },
  { brand_key: 'hulu', name: 'Hulu', domain: 'hulu.com', default_amount: 7.99, frequency: 'monthly' },
  { brand_key: 'apple_tv', name: 'Apple TV+', domain: 'tv.apple.com', default_amount: 9.99, frequency: 'monthly' },
];

// Unknown sites return a 404 here, which lets the card fall back to its initials.
function getLogoUrl(domain) {
  const host = String(domain || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0];
  return host ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico` : null;
}

export function getServicePresentation(subscription) {
  const brandKey = subscription?.brand_key;
  const label = subscription?.label || 'Unknown';
  const normalizedLabel = label.trim().toLowerCase();
  const service = STATIC_SERVICE_CATALOG.find(
    (s) => s.brand_key === brandKey || s.name.toLowerCase() === normalizedLabel,
  );
  const domain = subscription?.domain || subscription?.brand_domain || service?.domain || null;
  const logoUrl = getLogoUrl(domain);

  if (service) {
    return {
      ...service,
      icon: service.brand_key,
      domain,
      logoUrl,
    };
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

export const ENDED_SUBSCRIPTION_RETENTION_DAYS = 90;

// Past charges keep the price that applied at the time.
function getAmountOnDate(subscription, dateStr) {
  const pastPrice = (subscription.price_history || [])
    .filter((price) => dateStr <= price.until)
    .sort((a, b) => a.until.localeCompare(b.until))[0];
  return pastPrice ? getBillingAmount(pastPrice) : getBillingAmount(subscription);
}

/**
 * Returns the new price_history when an edit changes the price, or undefined when it should stay as is.
 * The old price covers everything up to yesterday; a second edit on one day just replaces today's price.
 */
export function buildPriceHistory(subscription, updates, now = new Date()) {
  const amountChanged = updates.amount !== undefined && Number(updates.amount) !== Number(subscription.amount);
  const currencyChanged = updates.currency !== undefined && updates.currency !== subscription.currency;
  if (!amountChanged && !currencyChanged) return undefined;

  const firstBilled = subscription.initial_start_date || subscription.start_date;
  const until = format(subDays(now, 1), 'yyyy-MM-dd');
  const history = (subscription.price_history || []).map(({ amount, currency, until: end }) => ({ amount, currency, until: end }));
  if (!firstBilled || firstBilled > until || history.some((price) => price.until === until)) {
    return history.length > 0 ? history : undefined;
  }

  return [...history, { amount: Number(subscription.amount), currency: subscription.currency, until }];
}

/** Switching off records the end date; switching back on skips the charges missed in between. */
export function computeActivationUpdate(subscription, now = new Date()) {
  const todayStr = format(now, 'yyyy-MM-dd');
  if (subscription.active !== false) {
    return { active: false, ended_on: todayStr };
  }
  if (!subscription.ended_on) {
    return { active: true, ended_on: null };
  }

  const running = { ...subscription, active: true, ended_on: null, skipped_dates: [] };
  const missedDates = generateSubscriptionExpenseOccurrences([running], subDays(now, 1), { today: now })
    .map((occurrence) => occurrence.date)
    .filter((date) => date > subscription.ended_on);

  return {
    active: true,
    ended_on: null,
    skipped_dates: [...new Set([...(subscription.skipped_dates || []), ...missedDates])],
  };
}

/** Removing hides a subscription from lists but keeps it, so its recent charges stay in history. */
export function computeRemovalUpdate(subscription, now = new Date()) {
  return {
    active: false,
    ended_on: subscription.active !== false ? format(now, 'yyyy-MM-dd') : subscription.ended_on ?? null,
    archived_at: now.toISOString(),
  };
}

/**
 * Generate recurring subscription expense occurrences from each subscription's start_date
 * up to the cutoff date (defaulting to today).
 *
 * @param {Array} subscriptions - array of subscription objects
 * @param {Date|string} [cutoffDate=new Date()] - upper bound cutoff date
 * @param {{today?: Date}} [options] - `today` anchors the retention window for ended subscriptions
 * @returns {Array} array of expense objects generated for subscription billing dates
 */
export function generateSubscriptionExpenseOccurrences(subscriptions = [], cutoffDate = new Date(), { today = new Date() } = {}) {
  const occurrences = [];
  try {
    const cutoff = startOfDay(typeof cutoffDate === 'string' ? parseISO(cutoffDate) : cutoffDate);
    if (Number.isNaN(cutoff.getTime())) return occurrences;

    const parsedToday = typeof today === 'string' ? parseISO(today) : new Date(today);
    const anchorToday = Number.isNaN(parsedToday.getTime()) ? startOfDay(new Date()) : startOfDay(parsedToday);
    const retentionStart = subDays(anchorToday, ENDED_SUBSCRIPTION_RETENTION_DAYS - 1);

    (subscriptions || []).forEach((sub) => {
      if (!sub || (!sub.start_date && !sub.initial_start_date)) return;
      // Switched off before end dates were recorded: there is no way to know which charges happened.
      if (sub.active === false && !sub.ended_on) return;
      const endDate = sub.active === false ? startOfDay(parseISO(sub.ended_on)) : null;
      if (endDate && Number.isNaN(endDate.getTime())) return;

      const effectiveStart = sub.initial_start_date || sub.start_date;
      const anchor = startOfDay(typeof effectiveStart === 'string' ? parseISO(effectiveStart) : effectiveStart);
      let cursor = anchor;
      if (Number.isNaN(cursor.getTime()) || isAfter(cursor, cutoff)) return;

      const skippedSet = new Set(Array.isArray(sub.skipped_dates) ? sub.skipped_dates : []);

      let safetyCounter = 0;
      while ((isBefore(cursor, cutoff) || isSameDay(cursor, cutoff)) && safetyCounter < 500) {
        const dateStr = format(cursor, 'yyyy-MM-dd');
        if (endDate && isAfter(cursor, endDate)) break;
        const isExpired = endDate && isBefore(cursor, retentionStart);

        // Only emit occurrence if this date was not explicitly skipped
        if (!skippedSet.has(dateStr) && !isExpired) {
          occurrences.push({
            id: `sub-exp-${sub.id}-${dateStr}`,
            subscription_id: sub.id,
            isSubscription: true,
            item: sub.label,
            category: sub.category || 'Bills',
            amount: getAmountOnDate(sub, dateStr),
            date: dateStr,
            created_at: cursor.toISOString(),
          });
        }

        safetyCounter++;
        cursor = sub.frequency === 'weekly' ? addWeeks(anchor, safetyCounter) : addMonths(anchor, safetyCounter);
      }
    });
  } catch (e) {
    console.error('Error generating subscription occurrences:', e);
  }

  return occurrences;
}

/**
 * Splits this month's recurring bills into those already charged and those still due after today.
 *
 * @param {Array} monthExpenses - this month's expenses, including virtual subscription rows
 * @param {Array} subscriptions
 * @param {Date} [now]
 * @returns {{recurringSpent: number, upcomingRecurring: number}}
 */
export function getMonthRecurringBreakdown(monthExpenses = [], subscriptions = [], now = new Date()) {
  const validNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const recurringSpent = (monthExpenses || []).reduce((sum, expense) => {
    if (!isRecurringExpense(expense)) return sum;
    const amt = Number(expense?.amount);
    return Number.isFinite(amt) ? sum + amt : sum;
  }, 0);

  const todayStr = format(validNow, 'yyyy-MM-dd');
  const monthEnd = new Date(validNow.getFullYear(), validNow.getMonth() + 1, 0);
  const upcomingRecurring = generateSubscriptionExpenseOccurrences(subscriptions, monthEnd, { today: validNow }).reduce(
    (sum, occurrence) => (occurrence.date > todayStr ? sum + occurrence.amount : sum),
    0,
  );

  return {
    recurringSpent: roundCurrency(recurringSpent),
    upcomingRecurring: roundCurrency(upcomingRecurring),
  };
}

/**
 * Merges saved expenses with virtual subscription occurrences up to the cutoff,
 * dropping an occurrence when a saved expense already records the same label on the same date.
 */
export function mergeSubscriptionOccurrences(expenses = [], subscriptions = [], cutoffDate = new Date()) {
  const manualKeys = new Set();
  const manualSubIdKeys = new Set();
  for (const e of expenses || []) {
    const dateKey = e?.date ? String(e.date).slice(0, 10) : '';
    if (!dateKey) continue;
    const label = (e?.note || e?.item || '').toLowerCase().trim();
    if (label) manualKeys.add(`${label}_${dateKey}`);
    if (e?.subscription_id !== null && e?.subscription_id !== undefined && e?.subscription_id !== '') {
      manualSubIdKeys.add(`${String(e.subscription_id)}_${dateKey}`);
    }
  }

  const occurrences = generateSubscriptionExpenseOccurrences(subscriptions, cutoffDate, { today: cutoffDate }).filter((occurrence) => {
    const label = (occurrence.item || '').toLowerCase().trim();
    const matchesLabel = Boolean(label) && manualKeys.has(`${label}_${occurrence.date}`);
    const matchesSubId =
      occurrence.subscription_id !== null &&
      occurrence.subscription_id !== undefined &&
      occurrence.subscription_id !== '' &&
      manualSubIdKeys.has(`${String(occurrence.subscription_id)}_${occurrence.date}`);
    return !matchesLabel && !matchesSubId;
  });

  return [...(expenses || []), ...occurrences];
}
