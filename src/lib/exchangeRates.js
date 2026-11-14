import { FALLBACK_RATES } from '../utils/exchangeRates.js';

const CACHE_KEY = 'finance-exchange-rates';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const RATES_URL = 'https://open.er-api.com/v6/latest/NZD';

let inFlight = null;

export function readCachedRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    const hasRates =
      cached?.rates &&
      typeof cached.rates === 'object' &&
      !Array.isArray(cached.rates) &&
      Object.keys(cached.rates).length > 0;
    const hasValidTimestamp =
      typeof cached?.fetchedAt === 'number' &&
      Number.isFinite(cached.fetchedAt) &&
      cached.fetchedAt > 0;
    return hasRates && hasValidTimestamp ? cached : null;
  } catch {
    return null;
  }
}

/** Live rates cached for 12 hours, then the last saved rates, then the bundled ones. */
export function loadExchangeRates() {
  const cached = readCachedRates();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return Promise.resolve(cached.rates);
  if (inFlight) return inFlight;

  inFlight = fetch(RATES_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Rates request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (data?.result !== 'success' || !data.rates) throw new Error('Rates response was not usable');
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, fetchedAt: Date.now() }));
      } catch { /* Rates still work for this session. */ }
      return data.rates;
    })
    .catch((err) => {
      console.warn('Using saved exchange rates:', err);
      return cached?.rates || FALLBACK_RATES;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
