export const FALLBACK_RATES_DATE = '2026-11-06';

// Units of each currency per 1 NZD. Used only until live rates load, or when they cannot.
export const FALLBACK_RATES = {
  NZD: 1,
  USD: 0.560697,
  EUR: 0.49966,
  GBP: 0.416519,
  CAD: 0.784835,
  AUD: 0.805778,
  VND: 14334.866674,
};

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** Returns the converted amount, or null when either currency has no rate. */
export function convertCurrency(amount, from, to, rates = FALLBACK_RATES) {
  const value = Number(amount) || 0;
  if (from === to) return roundCurrency(value);
  const fromRate = rates?.[from];
  const toRate = rates?.[to];
  if (!fromRate || !toRate) return null;
  return roundCurrency((value / fromRate) * toRate);
}

/**
 * Adds `base_amount` (in the budget currency) to each subscription and its past prices.
 * `amount` and `currency` stay as billed. A currency with no rate counts as 0, never as 1:1.
 */
export function withConvertedAmounts(subscriptions = [], baseCurrency = 'NZD', rates = FALLBACK_RATES) {
  const toBase = (amount, currency) => convertCurrency(amount, currency || baseCurrency, baseCurrency, rates);

  return subscriptions.map((sub) => {
    const baseAmount = toBase(sub.amount, sub.currency);
    return {
      ...sub,
      base_amount: baseAmount ?? 0,
      conversion_missing: baseAmount === null,
      price_history: (sub.price_history || []).map((price) => ({
        ...price,
        base_amount: toBase(price.amount, price.currency) ?? 0,
      })),
    };
  });
}
