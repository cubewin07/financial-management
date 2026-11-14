import assert from 'node:assert/strict';
import { format, subDays } from 'date-fns';
import {
  buildMonthlySnapshots,
  buildReserveSnapshots,
  computeMonthClose,
  computeReserveAllocation,
  getMonthAllocation,
  getNextMonthKey,
  isValidMonthKey,
} from '../utils/carryOver.js';
import { convertCurrency, withConvertedAmounts } from '../utils/exchangeRates.js';
import { readCachedRates } from '../lib/exchangeRates.js';
import {
  buildPriceHistory,
  computeActivationUpdate,
  computeRemovalUpdate,
  generateSubscriptionExpenseOccurrences,
  getServicePresentation,
  getTotalSubscriptionBurden,
} from '../utils/subscriptions.js';

const iso = (d) => format(d, 'yyyy-MM-dd');
const now = new Date(2026, 10, 7);

console.log('--- Running Money Rules Tests ---');

// Carry-over is a reserve: it fills from unused budget and is never spent automatically.
{
  const expenses = [
    { date: '2026-09-10', amount: 700 },
    { date: '2026-10-10', amount: 1400 },
  ];
  const close = (closedThrough, allocation = null) =>
    computeMonthClose({ closedThrough, currentMonth: '2026-11', expenses, baseBudget: 1000, allocation });

  assert.deepEqual(close(null), { carryAddition: 0, closedThrough: '2026-10' }, 'first run adds nothing');
  assert.equal(close('2026-10'), null, 'a closed month is not counted twice');
  assert.deepEqual(close('2026-09'), { carryAddition: 0, closedThrough: '2026-10' }, 'overspending takes nothing');
  assert.deepEqual(close('2026-08'), { carryAddition: 300, closedThrough: '2026-10' }, 'only unused budget is added');

  const toppedUp = close('2026-09', { month: '2026-10', amount: 600 });
  assert.equal(toppedUp.carryAddition, 200, 'an unused top-up returns to the reserve');

  assert.equal(getMonthAllocation({ month: '2026-11', amount: 50 }, '2026-11'), 50);
  assert.equal(getMonthAllocation({ month: '2026-10', amount: 50 }, '2026-11'), 0, 'a top-up lasts one month');
  console.log('✓ carry-over only fills from unused budget');
}

// Everything that adds up subscriptions works in the budget currency.
{
  const rates = { NZD: 1, USD: 0.5, VND: 15000 };
  assert.equal(convertCurrency(10, 'USD', 'NZD', rates), 20);
  assert.equal(convertCurrency(15000, 'VND', 'USD', rates), 0.5);
  assert.equal(convertCurrency(10, 'XXX', 'NZD', rates), null);
  assert.equal(convertCurrency(10, 'XXX', 'XXX', rates), 10);

  const subs = withConvertedAmounts(
    [
      { id: 'a', label: 'US', amount: 10, currency: 'USD', frequency: 'monthly', start_date: '2026-11-01' },
      { id: 'b', label: 'VN', amount: 150000, currency: 'VND', frequency: 'monthly', start_date: '2026-11-01' },
      { id: 'c', label: 'Odd', amount: 5, currency: 'XXX', frequency: 'monthly', start_date: '2026-11-01' },
    ],
    'NZD',
    rates,
  );
  assert.equal(subs[0].amount, 10, 'the billed amount is kept');
  assert.equal(getTotalSubscriptionBurden(subs), 30, 'VND 150,000 is NZ$10, not NZ$150,000');
  assert.equal(subs[2].conversion_missing, true);
  const charges = generateSubscriptionExpenseOccurrences(subs, '2026-11-07');
  assert.equal(charges.find((c) => c.subscription_id === 'b').amount, 10);
  console.log('✓ subscriptions convert to the default currency');
}

// Ended subscriptions keep charges up to the end date, for the last 90 days only.
{
  const sub = {
    id: 's', label: 'Gym', amount: 10, frequency: 'monthly', start_date: '2026-01-05',
    active: false, ended_on: '2026-10-10',
  };
  const dates = generateSubscriptionExpenseOccurrences([sub], now, { today: now }).map((c) => c.date);
  assert.deepEqual(dates, ['2026-09-05', '2026-10-05'], '90-day window, nothing after the end date');

  const edge = { ...sub, start_date: iso(subDays(now, 89)), ended_on: iso(now) };
  assert.equal(generateSubscriptionExpenseOccurrences([edge], now, { today: now })[0].date, iso(subDays(now, 89)));
  const past = { ...sub, start_date: iso(subDays(now, 90)), ended_on: iso(subDays(now, 90)) };
  assert.equal(generateSubscriptionExpenseOccurrences([past], now, { today: now }).length, 0);

  const legacy = { ...sub, ended_on: null };
  assert.equal(generateSubscriptionExpenseOccurrences([legacy], now, { today: now }).length, 0, 'no known end date');

  const running = { ...sub, active: true, ended_on: null, start_date: '2026-01-05' };
  assert.equal(generateSubscriptionExpenseOccurrences([running], now, { today: now }).length, 11, 'active keeps full history');

  assert.deepEqual(computeActivationUpdate(running, now), { active: false, ended_on: '2026-11-07' });

  const resumed = computeActivationUpdate({ ...sub, skipped_dates: [] }, new Date(2026, 11, 20));
  assert.equal(resumed.active, true);
  assert.equal(resumed.ended_on, null);
  assert.deepEqual(resumed.skipped_dates, ['2026-11-05', '2026-12-05'], 'no charges for the months it was off');

  const removed = computeRemovalUpdate(running, now);
  assert.equal(removed.active, false);
  assert.equal(removed.ended_on, '2026-11-07');
  assert.ok(removed.archived_at);
  assert.equal(computeRemovalUpdate(legacy, now).ended_on, null, 'removing does not invent old charges');
  console.log('✓ ended subscriptions keep 90 days of history');
}

// A price change applies from today on; earlier charges keep the old price.
{
  const sub = {
    id: 'p', label: 'Music', amount: 10, currency: 'NZD', frequency: 'monthly',
    start_date: '2026-09-01', price_history: [],
  };
  const history = buildPriceHistory(sub, { amount: 15 }, now);
  assert.deepEqual(history, [{ amount: 10, currency: 'NZD', until: '2026-11-06' }]);
  assert.equal(buildPriceHistory(sub, { amount: 10, label: 'New name' }, now), undefined, 'no price change');

  const changed = withConvertedAmounts([{ ...sub, amount: 15, price_history: history }], 'NZD', { NZD: 1 });
  const amounts = generateSubscriptionExpenseOccurrences(changed, '2026-12-01').map((c) => c.amount);
  assert.deepEqual(amounts, [10, 10, 10, 15]);

  const sameDay = buildPriceHistory({ ...sub, amount: 15, price_history: history }, { amount: 20 }, now);
  assert.equal(sameDay.length, 1, 'two edits on one day do not create a second old price');
  assert.equal(buildPriceHistory({ ...sub, start_date: '2026-11-07' }, { amount: 20 }, now), undefined, 'not billed yet');
  console.log('✓ price changes do not rewrite history');
}

// Logos.
{
  const netflix = getServicePresentation({ label: 'Netflix' });
  assert.equal(netflix.logoUrl, 'https://icons.duckduckgo.com/ip3/netflix.com.ico');
  const prime = getServicePresentation({ label: 'Prime', brand_key: 'amazon_prime' });
  assert.equal(prime.logoUrl, 'https://icons.duckduckgo.com/ip3/amazon.com.ico');
  assert.equal(
    getServicePresentation({ label: 'Gym', domain: 'https://www.mygym.co.nz/join' }).logoUrl,
    'https://icons.duckduckgo.com/ip3/www.mygym.co.nz.ico',
  );
  const unknown = getServicePresentation({ label: 'Bus pass' });
  assert.equal(unknown.logoUrl, null);
  assert.equal(unknown.initials, 'BU');
  console.log('✓ logos come from a working service');
}

// Carry-over month validation, reserve allocation bounds, and future-expense clamping
{
  assert.equal(isValidMonthKey('2026-11'), true);
  assert.equal(isValidMonthKey('2026-13'), false);
  assert.equal(isValidMonthKey('2026-00'), false);
  assert.equal(isValidMonthKey('bad'), false);
  assert.equal(getNextMonthKey('2026-12'), '2027-01');
  assert.equal(getNextMonthKey('bad'), null);

  assert.deepEqual(computeReserveAllocation(100.1, 40.05), {
    ok: true,
    moved: 40.05,
    nextBalance: 60.05,
  });
  assert.equal(computeReserveAllocation(100, 0).ok, false, 'rejects zero transfer');
  assert.equal(computeReserveAllocation(100, -10).ok, false, 'rejects negative transfer');
  assert.equal(computeReserveAllocation(100, NaN).ok, false, 'rejects NaN transfer');
  assert.equal(computeReserveAllocation(100, 150).ok, false, 'rejects over-reserve transfer instead of clamping');

  // Invalid closedThrough self-heals like null; invalid currentMonth fails safely
  assert.deepEqual(
    computeMonthClose({ closedThrough: 'invalid', currentMonth: '2026-11', expenses: [], baseBudget: 1000 }),
    { carryAddition: 0, closedThrough: '2026-10' }
  );
  assert.equal(
    computeMonthClose({ closedThrough: '2026-10', currentMonth: 'invalid', expenses: [], baseBudget: 1000 }),
    null
  );
  const safeSnaps = buildMonthlySnapshots(
    [
      { date: 'invalid-date', amount: 999 },
      { date: '2026-09-12', amount: 250.25 },
      { date: '2026-10-05', amount: NaN },
    ],
    [],
    1000,
    'u1',
    '2026-11'
  );
  assert.equal(safeSnaps.length, 2);
  assert.equal(safeSnaps.find((s) => s.month === '2026-09')?.total_spent, 250.25);
  assert.equal(safeSnaps.find((s) => s.month === '2026-10')?.total_spent, 0);

  const reserveSnaps = buildReserveSnapshots({
    userId: 'u1',
    currentMonth: '2026-11',
    baseBudget: 1000,
    carryOver: 300,
    categoryLimits: { Food: 400 },
    expenses: [
      { date: '2026-09-10', amount: 100 },
      { date: '2099-05-01', amount: 500 },
    ],
  });
  assert.deepEqual(
    reserveSnaps.map((s) => s.month),
    ['2026-11', '2026-10', '2026-09'],
    'clamps future expenses at currentMonth and backfills quiet intermediate month'
  );
  assert.equal(reserveSnaps[0].carry_over, 300);
  console.log('✓ carryOver bounds, month validation, and reserve snapshot clamping hold');
}

// Exchange rate validation & localStorage cache validation
{
  assert.equal(convertCurrency(100, ' nzd ', ' usd ', { NZD: 1, USD: 0.6 }), 60);
  assert.equal(convertCurrency(NaN, 'NZD', 'USD', { NZD: 1, USD: 0.6 }), 0);
  assert.equal(convertCurrency(Infinity, 'NZD', 'USD', { NZD: 1, USD: 0.6 }), 0);
  assert.equal(convertCurrency(100, 'NZD', 'USD', { NZD: 1, USD: 0 }), null);
  assert.equal(convertCurrency(100, 'NZD', 'USD', { NZD: -1, USD: 0.6 }), null);
  assert.equal(convertCurrency(100, 'NZD', 'USD', { NZD: 1, USD: NaN }), null);

  const converted = withConvertedAmounts(
    [{ id: 'sub-1', amount: 50, currency: 'usd' }],
    ' nzd ',
    { NZD: 1, USD: 0.5 }
  );
  assert.equal(converted[0].base_amount, 100);
  assert.equal(converted[0].conversion_missing, false);

  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  const prevStorage = globalThis.localStorage;
  let storeValue = null;
  globalThis.localStorage = {
    getItem: () => storeValue,
  };
  try {
    storeValue = JSON.stringify({ rates: {}, fetchedAt: Date.now() });
    assert.equal(readCachedRates(), null, 'rejects empty cached rates object');

    storeValue = JSON.stringify({ rates: { NZD: 1 }, fetchedAt: NaN });
    assert.equal(readCachedRates(), null, 'rejects non-finite fetchedAt');

    const validTs = Date.now();
    storeValue = JSON.stringify({ rates: { NZD: 1, USD: 0.6 }, fetchedAt: validTs });
    assert.deepEqual(readCachedRates(), { rates: { NZD: 1, USD: 0.6 }, fetchedAt: validTs });
  } finally {
    if (hadStorage) {
      globalThis.localStorage = prevStorage;
    } else {
      delete globalThis.localStorage;
    }
  }
  console.log('✓ exchangeRates rejects invalid rates/amounts and malformed cache payloads');
}

console.log('\nAll money rules tests passed!');
