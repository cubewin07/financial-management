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
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const sign = num < 0 ? -1 : 1;
  const rounded = (sign * Math.round(Math.abs(num) * 100 + 1e-9)) / 100;
  return rounded === 0 ? 0 : rounded;
}

function normalizeCurrency(code) {
  return String(code || '').trim().toUpperCase();
}

/** Returns the converted amount, or null when either currency has no rate. */
export function convertCurrency(amount, from, to, rates = FALLBACK_RATES) {
  const num = Number(amount);
  const value = Number.isFinite(num) ? num : 0;
  const fromCode = normalizeCurrency(from);
  const toCode = normalizeCurrency(to);
  if (!fromCode || !toCode) return null;
  if (fromCode === toCode) return roundCurrency(value);
  const fromRate = Number(rates?.[fromCode]);
  const toRate = Number(rates?.[toCode]);
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    return null;
  }
  return roundCurrency((value / fromRate) * toRate);
}

/**
 * Adds `base_amount` (in the budget currency) to each subscription and its past prices.
 * `amount` and `currency` stay as billed. A currency with no rate counts as 0, never as 1:1.
 */
export function withConvertedAmounts(subscriptions = [], baseCurrency = 'NZD', rates = FALLBACK_RATES) {
  const normalizedBase = normalizeCurrency(baseCurrency) || 'NZD';
  const toBase = (amount, currency) =>
    convertCurrency(amount, normalizeCurrency(currency) || normalizedBase, normalizedBase, rates);

  return (subscriptions || []).map((sub) => {
    const baseAmount = toBase(sub?.amount, sub?.currency);
    return {
      ...sub,
      base_amount: baseAmount ?? 0,
      conversion_missing: baseAmount === null,
      price_history: (sub?.price_history || []).map((price) => ({
        ...price,
        base_amount: toBase(price?.amount, price?.currency || sub?.currency) ?? 0,
      })),
    };
  });
}
