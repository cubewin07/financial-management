import { roundCurrency } from './finance.js';
import { convertCurrency, FALLBACK_RATES } from './exchangeRates.js';

export const INVESTMENT_CATEGORIES = [
  'Cash',
  'Equities',
  'Retirement',
  'Crypto',
  'Property',
  'Other',
];

export const INVESTMENT_CATEGORY_COLORS = {
  Cash: '#00eefc',
  Equities: '#d0bcff',
  Retirement: '#f15999',
  Crypto: '#ffb0ca',
  Property: '#9f78ff',
  Other: '#d3fbff',
};

export const INVESTMENT_CURRENCY_OPTIONS = [
  { label: 'NZD ($)', value: 'NZD' },
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'CAD ($)', value: 'CAD' },
  { label: 'AUD ($)', value: 'AUD' },
  { label: 'VND (₫)', value: 'VND' },
];

// Old sample rows may still be saved on this device. Any row the user edited is kept.
const OLD_SAMPLE_ASSETS = {
  1: { name: 'Emergency Cash Fund', value: 12500 },
  2: { name: 'Global Index ETF (US/World)', value: 34000 },
  3: { name: 'KiwiSaver / Retirement', value: 48500 },
  4: { name: 'Crypto (BTC / ETH)', value: 6800 },
  5: { name: 'Property Equity / Real Estate', value: 120000 },
};

/** Normalizes a 3-letter currency code (trimming Postgres char(3) padding). */
export function normalizeInvestmentCurrency(code, fallback = 'NZD') {
  const cleaned = String(code || '').trim().toUpperCase();
  if (cleaned) return cleaned;
  const cleanedFallback = String(fallback || 'NZD').trim().toUpperCase();
  return cleanedFallback || 'NZD';
}

/** Normalizes a Supabase investment row or legacy local object into the canonical app shape. */
export function normalizeInvestmentRow(row = {}, fallbackCurrency = 'NZD') {
  const rawCategory = String(row?.category ?? '').trim();
  const rawValue = row?.market_value ?? row?.value ?? 0;
  const parsedValue = Math.max(0, roundCurrency(rawValue));
  const rawLiquid =
    row?.is_liquid !== undefined
      ? row.is_liquid
      : row?.isLiquid !== undefined
        ? row.isLiquid
        : true;

  return {
    id: row?.id ?? null,
    user_id: row?.user_id ?? null,
    name: String(row?.name ?? '').trim() || 'Untitled Asset',
    category: rawCategory || 'Other',
    market_value: parsedValue,
    currency: normalizeInvestmentCurrency(row?.currency, fallbackCurrency),
    is_liquid: Boolean(rawLiquid),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

/** Converts each investment holding's `market_value` into `baseCurrency` (`base_value`). */
export function withConvertedInvestments(
  investments = [],
  baseCurrency = 'NZD',
  rates = FALLBACK_RATES,
) {
  const normalizedBase = normalizeInvestmentCurrency(baseCurrency, 'NZD');

  return (investments || []).map((item) => {
    const normalized = normalizeInvestmentRow(item, normalizedBase);
    const converted = convertCurrency(
      normalized.market_value,
      normalized.currency,
      normalizedBase,
      rates,
    );

    return {
      ...normalized,
      base_value: converted ?? 0,
      conversion_missing: converted === null,
    };
  });
}

/** Computes net worth, liquidity split, and category allocation from converted holdings. */
export function summarizeInvestments(convertedInvestments = []) {
  const list = Array.isArray(convertedInvestments) ? convertedInvestments : [];
  const converted = list.filter((a) => !a?.conversion_missing);
  const missingConversionCount = list.length - converted.length;

  const totalNetWorth = roundCurrency(
    converted.reduce((sum, a) => sum + Math.max(0, Number(a?.base_value) || 0), 0),
  );
  const liquidTotal = roundCurrency(
    converted
      .filter((a) => Boolean(a?.is_liquid))
      .reduce((sum, a) => sum + Math.max(0, Number(a?.base_value) || 0), 0),
  );
  const illiquidTotal = roundCurrency(Math.max(0, totalNetWorth - liquidTotal));
  const liquidPercent = totalNetWorth > 0 ? Math.round((liquidTotal / totalNetWorth) * 100) : 0;
  const illiquidPercent = totalNetWorth > 0 ? 100 - liquidPercent : 0;

  const map = {};
  for (const a of converted) {
    const cat = String(a?.category || '').trim() || 'Other';
    map[cat] = roundCurrency((map[cat] || 0) + Math.max(0, Number(a?.base_value) || 0));
  }

  const categoryTotals = Object.entries(map)
    .map(([name, total]) => {
      const rawPercent = totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0;
      const displayPercent =
        rawPercent > 0 && rawPercent < 1 ? '<1' : String(Math.round(rawPercent));
      return {
        name,
        total,
        rawPercent,
        displayPercent,
        color: INVESTMENT_CATEGORY_COLORS[name] || '#d0bcff',
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    totalNetWorth,
    liquidTotal,
    illiquidTotal,
    liquidPercent,
    illiquidPercent,
    categoryTotals,
    convertedCount: converted.length,
    missingConversionCount,
  };
}

/** Sanitizes user-scoped legacy localStorage assets and drops untouched sample rows. */
export function sanitizeScopedLegacyAssets(raw, fallbackCurrency = 'NZD') {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((asset) => {
      if (!asset || typeof asset !== 'object') return false;
      const sample = OLD_SAMPLE_ASSETS[asset.id];
      return !(sample && sample.name === asset.name && sample.value === asset.value);
    })
    .map((asset) => ({
      name: String(asset.name ?? '').trim() || 'Untitled Asset',
      category: String(asset.category || '').trim() || 'Other',
      market_value: Math.max(0, roundCurrency(asset.market_value ?? asset.value ?? 0)),
      currency: normalizeInvestmentCurrency(asset.currency, fallbackCurrency),
      is_liquid: Boolean(
        asset.is_liquid !== undefined ? asset.is_liquid : asset.isLiquid ?? true,
      ),
    }));
}

/** Returns true when Postgres/PostgREST reports missing migration 021 metadata columns. */
export function isMissingInvestmentMetadataColumn(error) {
  return (
    Boolean(error) &&
    (error.code === '42703' ||
      error.code === 'PGRST204' ||
      /(category|is_liquid)/.test(error.message || ''))
  );
}
