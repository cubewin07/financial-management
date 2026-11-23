import assert from 'node:assert/strict';
import { register } from 'node:module';
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
  computeSkipPayload,
  generateSubscriptionExpenseOccurrences,
  getNextBillingDate,
  getServicePresentation,
  getTotalSubscriptionBurden,
  getUpcomingBillingAlerts,
} from '../utils/subscriptions.js';
import { loadExchangeRates } from '../lib/exchangeRates.js';

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

// ---------------------------------------------------------------------------
// Issue #18: Month-close persistence when user_settings row is absent &
// concurrent reserve allocation safety
// ---------------------------------------------------------------------------
{
  const loaderSource = `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier.endsWith('supabaseClient')) {
        return { url: 'mock:supabaseClient', shortCircuit: true };
      }
      try {
        return await nextResolve(specifier, context);
      } catch (err) {
        if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.endsWith('.js')) {
          return nextResolve(specifier + '.js', context);
        }
        throw err;
      }
    }
    export async function load(url, context, nextLoad) {
      if (url === 'mock:supabaseClient') {
        return {
          format: 'module',
          source: 'export const supabase = globalThis.__TEST_SUPABASE_MOCK__;',
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    }
  `;
  register(`data:text/javascript,${encodeURIComponent(loaderSource)}`);

  function createMockSupabase({ initialSettings = [], initialSnapshots = [] } = {}) {
    const settingsByUser = new Map();
    for (const row of initialSettings) {
      settingsByUser.set(row.user_id, {
        monthly_budget: 0,
        carry_over: 0,
        category_limits: {},
        carry_over_allocated: 0,
        carry_over_allocated_month: null,
        carry_over_closed_through: null,
        ...row,
      });
    }
    const snapshots = [...initialSnapshots];
    let pendingError = null;
    let writeHook = null;

    const matchFilters = (row, filters) =>
      filters.every(({ op, col, val }) => {
        if (op === 'eq') return row[col] === val;
        if (op === 'is') return val === null ? (row[col] === null || row[col] === undefined) : row[col] === val;
        return true;
      });

    const projectRow = (row, cols) => {
      if (!cols || cols === '*') return { ...row };
      const fields = cols.split(',').map((s) => s.trim()).filter(Boolean);
      const out = {};
      for (const f of fields) out[f] = row[f] ?? null;
      return out;
    };

    const makeQuery = (table) => {
      let mode = 'select';
      let selectCols = '*';
      let returnSelected = false;
      let payload = null;
      let upsertOpts = {};
      let orderSpec = null;
      let limitCount = null;
      let singleMode = null;
      const filters = [];

      const execute = async () => {
        if (mode !== 'select' && pendingError) {
          const err = pendingError;
          pendingError = null;
          return { data: null, error: err };
        }
        if (mode !== 'select' && writeHook) {
          const hook = writeHook;
          await hook({ mode, table, payload, filters: [...filters] });
        }

        if (table === 'monthly_snapshots') {
          let list = snapshots.filter((row) => matchFilters(row, filters));
          if (orderSpec) {
            list = [...list].sort((a, b) =>
              orderSpec.ascending
                ? String(a[orderSpec.col]).localeCompare(String(b[orderSpec.col]))
                : String(b[orderSpec.col]).localeCompare(String(a[orderSpec.col]))
            );
          }
          if (typeof limitCount === 'number') list = list.slice(0, limitCount);
          const projected = list.map((r) => projectRow(r, selectCols));
          if (singleMode === 'maybeSingle') {
            return { data: projected[0] ?? null, error: null };
          }
          return { data: projected, error: null };
        }

        if (table !== 'user_settings') {
          throw new Error(`Unexpected table in mock: ${table}`);
        }

        if (mode === 'select') {
          const matched = [...settingsByUser.values()]
            .filter((row) => matchFilters(row, filters))
            .map((r) => projectRow(r, selectCols));
          if (singleMode === 'maybeSingle') {
            return { data: matched[0] ?? null, error: null };
          }
          return { data: matched, error: null };
        }

        if (mode === 'update') {
          const updated = [];
          for (const [uid, row] of settingsByUser.entries()) {
            if (matchFilters(row, filters)) {
              const next = { ...row, ...payload };
              settingsByUser.set(uid, next);
              updated.push(projectRow(next, selectCols));
            }
          }
          return { data: returnSelected ? updated : null, error: null };
        }

        if (mode === 'upsert') {
          const uid = payload.user_id;
          const exists = settingsByUser.has(uid);
          if (exists && upsertOpts.ignoreDuplicates) {
            return { data: returnSelected ? [] : null, error: null };
          }
          const base = exists
            ? settingsByUser.get(uid)
            : {
                monthly_budget: 0,
                carry_over: 0,
                category_limits: {},
                carry_over_allocated: 0,
                carry_over_allocated_month: null,
                carry_over_closed_through: null,
              };
          const next = { ...base, ...payload };
          settingsByUser.set(uid, next);
          return { data: returnSelected ? [projectRow(next, selectCols)] : null, error: null };
        }

        throw new Error(`Unsupported query mode: ${mode}`);
      };

      const builder = {
        select(cols = '*') {
          if (mode === 'update' || mode === 'upsert') {
            returnSelected = true;
            selectCols = cols;
          } else {
            mode = 'select';
            selectCols = cols;
          }
          return builder;
        },
        update(values) {
          mode = 'update';
          payload = { ...values };
          return builder;
        },
        upsert(values, opts = {}) {
          mode = 'upsert';
          payload = { ...values };
          upsertOpts = opts;
          return builder;
        },
        eq(col, val) {
          filters.push({ op: 'eq', col, val });
          return builder;
        },
        is(col, val) {
          filters.push({ op: 'is', col, val });
          return builder;
        },
        order(col, opts = {}) {
          orderSpec = { col, ascending: opts.ascending !== false };
          return builder;
        },
        limit(n) {
          limitCount = n;
          return builder;
        },
        maybeSingle() {
          singleMode = 'maybeSingle';
          return builder;
        },
        then(onFulfilled, onRejected) {
          return execute().then(onFulfilled, onRejected);
        },
      };
      return builder;
    };

    return {
      from: (table) => makeQuery(table),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => {},
      _rows: settingsByUser,
      _failNextWrite: (err) => {
        pendingError = err;
      },
      _setWriteHook: (fn) => {
        writeHook = fn;
      },
    };
  }

  globalThis.__TEST_SUPABASE_MOCK__ = createMockSupabase();
  const { createCarryOverController } = await import('../hooks/useCarryOver.js');

  // 1. Missing user_settings row: initial month-close must insert row and persist carry_over_closed_through
  {
    const mockDb = createMockSupabase();
    const ctrl = createCarryOverController({ client: mockDb });
    ctrl.setUser('user-new');
    await ctrl.loadState(false);
    assert.equal(ctrl.getSnapshot().closedThrough, null);
    assert.equal(mockDb._rows.has('user-new'), false);

    const closed = await ctrl.closeFinishedMonths({
      userId: 'user-new',
      currentMonth: '2026-11',
      expenses: [{ date: '2026-10-12', amount: 400 }],
      baseBudget: 1000,
    });
    assert.equal(closed, true);
    assert.equal(ctrl.getSnapshot().closedThrough, '2026-10');
    assert.equal(ctrl.getSnapshot().carryOver, 0);
    assert.equal(mockDb._rows.get('user-new')?.carry_over_closed_through, '2026-10');
    assert.equal(mockDb._rows.get('user-new')?.carry_over, 0);

    // Subsequent month close advances carry_over and carry_over_closed_through cleanly
    const closedNext = await ctrl.closeFinishedMonths({
      userId: 'user-new',
      currentMonth: '2026-12',
      expenses: [{ date: '2026-11-15', amount: 700 }],
      baseBudget: 1000,
    });
    assert.equal(closedNext, true);
    assert.equal(ctrl.getSnapshot().closedThrough, '2026-11');
    assert.equal(ctrl.getSnapshot().carryOver, 300);
    assert.equal(mockDb._rows.get('user-new')?.carry_over, 300);
    assert.equal(mockDb._rows.get('user-new')?.carry_over_closed_through, '2026-11');
  }

  // 2. CAS safety on month-close: never overwrite when another tab already closed a month
  {
    // 2a. Local tab started with no row (closedThrough: null), while another tab created & closed '2026-10' with 250
    const mockDb = createMockSupabase();
    const ctrl = createCarryOverController({ client: mockDb });
    ctrl.setUser('user-race');
    await ctrl.loadState(false);

    mockDb._rows.set('user-race', {
      user_id: 'user-race',
      monthly_budget: 1000,
      carry_over: 250,
      category_limits: {},
      carry_over_allocated: 0,
      carry_over_allocated_month: null,
      carry_over_closed_through: '2026-10',
    });

    const closed = await ctrl.closeFinishedMonths({
      userId: 'user-race',
      currentMonth: '2026-11',
      expenses: [],
      baseBudget: 1000,
    });
    assert.equal(closed, false);
    assert.equal(mockDb._rows.get('user-race')?.carry_over, 250, 'must not overwrite other tab carry_over');
    assert.equal(mockDb._rows.get('user-race')?.carry_over_closed_through, '2026-10');
    assert.equal(ctrl.getSnapshot().carryOver, 250);
    assert.equal(ctrl.getSnapshot().closedThrough, '2026-10');

    // 2b. Local tab has closedThrough: '2026-09', while another tab closed '2026-10' with 500
    mockDb._rows.set('user-race', {
      user_id: 'user-race',
      monthly_budget: 1000,
      carry_over: 100,
      category_limits: {},
      carry_over_allocated: 0,
      carry_over_allocated_month: null,
      carry_over_closed_through: '2026-09',
    });
    await ctrl.loadState(false);
    mockDb._rows.set('user-race', {
      ...mockDb._rows.get('user-race'),
      carry_over: 500,
      carry_over_closed_through: '2026-10',
    });

    const closedSecond = await ctrl.closeFinishedMonths({
      userId: 'user-race',
      currentMonth: '2026-11',
      expenses: [{ date: '2026-10-05', amount: 800 }],
      baseBudget: 1000,
    });
    assert.equal(closedSecond, false);
    assert.equal(mockDb._rows.get('user-race')?.carry_over, 500);
    assert.equal(ctrl.getSnapshot().carryOver, 500);

    // 2c. Concurrent row creation by settings save (carry_over_closed_through: null) preserves monthly_budget
    const mockDb2 = createMockSupabase();
    const ctrl2 = createCarryOverController({ client: mockDb2 });
    ctrl2.setUser('user-settings-race');
    await ctrl2.loadState(false);
    // Inject row creation right before ignore-duplicates upsert runs
    mockDb2._setWriteHook(async ({ mode }) => {
      if (mode === 'upsert') {
        mockDb2._rows.set('user-settings-race', {
          user_id: 'user-settings-race',
          monthly_budget: 1800,
          carry_over: 0,
          category_limits: {},
          carry_over_allocated: 0,
          carry_over_allocated_month: null,
          carry_over_closed_through: null,
        });
        mockDb2._setWriteHook(null);
      }
    });
    const closedWithSettings = await ctrl2.closeFinishedMonths({
      userId: 'user-settings-race',
      currentMonth: '2026-11',
      expenses: [],
      baseBudget: 1800,
    });
    assert.equal(closedWithSettings, true);
    assert.equal(mockDb2._rows.get('user-settings-race')?.monthly_budget, 1800);
    assert.equal(mockDb2._rows.get('user-settings-race')?.carry_over_closed_through, '2026-10');
  }

  // 3. updateCarryOver / updateCategoryLimits / allocateCarryOverToBudget persist when row does not exist yet
  {
    const mockDb = createMockSupabase();
    const ctrl = createCarryOverController({ client: mockDb });
    ctrl.setUser('user-fresh');
    await ctrl.loadState(false);

    assert.equal(await ctrl.updateCategoryLimits('user-fresh', { Food: 350 }), true);
    assert.deepEqual(mockDb._rows.get('user-fresh')?.category_limits, { Food: 350 });

    const mockDbAlloc = createMockSupabase();
    const ctrlAlloc = createCarryOverController({ client: mockDbAlloc });
    ctrlAlloc.setUser('user-fresh-2');
    await ctrlAlloc.loadState(false);
    assert.equal(await ctrlAlloc.updateCarryOver('user-fresh-2', 120), true);
    assert.equal(mockDbAlloc._rows.get('user-fresh-2')?.carry_over, 120);

    // Also verify allocateCarryOverToBudget fails closed & syncs to 0 when DB row was deleted
    mockDbAlloc._rows.delete('user-fresh-2');
    assert.equal(await ctrlAlloc.allocateCarryOverToBudget('user-fresh-2', 45, '2026-11'), false);
    assert.equal(mockDbAlloc._rows.has('user-fresh-2'), false);
    assert.equal(ctrlAlloc.getSnapshot().carryOver, 0);
  }

  // 4. Concurrent / rapid allocateCarryOverToBudget & allocateCarryOver calls never compute from stale state
  {
    const mockDb = createMockSupabase({
      initialSettings: [{ user_id: 'user-conc', carry_over: 100, carry_over_closed_through: '2026-10' }],
    });
    mockDb._setWriteHook(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    const ctrl = createCarryOverController({ client: mockDb });
    ctrl.setUser('user-conc');
    await ctrl.loadState(false);

    const results = await Promise.all([
      ctrl.allocateCarryOverToBudget('user-conc', 30, '2026-11'),
      ctrl.allocateCarryOverToBudget('user-conc', 20, '2026-11'),
      ctrl.allocateCarryOverToBudget('user-conc', 15, '2026-11'),
    ]);
    assert.deepEqual(results, [true, true, true]);
    assert.equal(ctrl.getSnapshot().carryOver, 35);
    assert.deepEqual(ctrl.getSnapshot().allocation, { month: '2026-11', amount: 65 });
    assert.equal(mockDb._rows.get('user-conc')?.carry_over, 35);
    assert.equal(mockDb._rows.get('user-conc')?.carry_over_allocated, 65);

    // Concurrent over-allocation guard: second 25 exceeds remaining 35? No, test 25 + 25 against 35:
    const overResults = await Promise.all([
      ctrl.allocateCarryOverToBudget('user-conc', 25, '2026-11'),
      ctrl.allocateCarryOverToBudget('user-conc', 25, '2026-11'),
    ]);
    assert.deepEqual(overResults, [true, false]);
    assert.equal(ctrl.getSnapshot().carryOver, 10);
    assert.equal(ctrl.getSnapshot().allocation.amount, 90);

    // Concurrent allocateCarryOver (savings transfer) calls also serialize cleanly
    await ctrl.updateCarryOver('user-conc', 100);
    const goalResults = await Promise.all([
      ctrl.allocateCarryOver('user-conc', 40),
      ctrl.allocateCarryOver('user-conc', 35),
      ctrl.allocateCarryOver('user-conc', 35),
    ]);
    assert.deepEqual(goalResults, [true, true, false]);
    assert.equal(ctrl.getSnapshot().carryOver, 25);
    assert.equal(mockDb._rows.get('user-conc')?.carry_over, 25);
  }

  // 5. Failed allocation does not corrupt subsequent queued allocation, and cross-tab CAS retries cleanly
  {
    const mockDb = createMockSupabase({
      initialSettings: [{ user_id: 'user-err', carry_over: 100, carry_over_closed_through: '2026-10' }],
    });
    const ctrl = createCarryOverController({ client: mockDb });
    ctrl.setUser('user-err');
    await ctrl.loadState(false);

    mockDb._failNextWrite({ message: 'temporary failure' });
    const [r1, r2] = await Promise.all([
      ctrl.allocateCarryOverToBudget('user-err', 30, '2026-11'),
      ctrl.allocateCarryOverToBudget('user-err', 20, '2026-11'),
    ]);
    assert.deepEqual([r1, r2], [false, true]);
    assert.equal(ctrl.getSnapshot().carryOver, 80);
    assert.equal(ctrl.getSnapshot().allocation.amount, 20);

    // Cross-tab update before allocateCarryOverToBudget: DB changed 80 -> 60 (with 40 already allocated)
    mockDb._rows.set('user-err', {
      ...mockDb._rows.get('user-err'),
      carry_over: 60,
      carry_over_allocated: 40,
      carry_over_allocated_month: '2026-11',
    });
    assert.equal(await ctrl.allocateCarryOverToBudget('user-err', 25, '2026-11'), true);
    assert.equal(ctrl.getSnapshot().carryOver, 35);
    assert.equal(ctrl.getSnapshot().allocation.amount, 65);
    assert.equal(mockDb._rows.get('user-err')?.carry_over, 35);
    assert.equal(mockDb._rows.get('user-err')?.carry_over_allocated, 65);

    // Month boundary: prior month allocation does not carry into next month's allocated total
    mockDb._rows.set('user-err', {
      ...mockDb._rows.get('user-err'),
      carry_over: 100,
      carry_over_allocated: 50,
      carry_over_allocated_month: '2026-10',
    });
    await ctrl.loadState(false);
    assert.equal(await ctrl.allocateCarryOverToBudget('user-err', 30, '2026-11'), true);
    assert.equal(ctrl.getSnapshot().carryOver, 70);
    assert.deepEqual(ctrl.getSnapshot().allocation, { month: '2026-11', amount: 30 });
    assert.equal(mockDb._rows.get('user-err')?.carry_over_allocated, 30);
    assert.equal(mockDb._rows.get('user-err')?.carry_over_allocated_month, '2026-11');

    // User switch during an in-flight allocation does not leak user-a state into user-b
    let releaseSlowWrite;
    const slowWriteGate = new Promise((resolve) => {
      releaseSlowWrite = resolve;
    });
    mockDb._setWriteHook(async () => {
      mockDb._setWriteHook(null);
      await slowWriteGate;
    });
    const inFlight = ctrl.allocateCarryOverToBudget('user-err', 10, '2026-11');
    ctrl.setUser('user-other');
    releaseSlowWrite();
    assert.equal(await inFlight, false);
    assert.equal(ctrl.getSnapshot().userId, 'user-other');
    assert.equal(ctrl.getSnapshot().carryOver, 0);
  }

  console.log('✓ Issue #18 carry-over persistence, CAS safety, and concurrent allocation tests passed');

  // 6. refundCarryOver atomic refund, CAS conflict on carry_over_allocated, FX validation, 31st-anchor & alert cap
  {
    const mockDb = createMockSupabase({
      initialSettings: [
        {
          user_id: 'user-refund',
          carry_over: 40,
          carry_over_allocated: 20,
          carry_over_allocated_month: '2026-11',
          carry_over_closed_through: '2026-10',
        },
      ],
    });
    const ctrl = createCarryOverController({ client: mockDb });
    ctrl.setUser('user-refund');
    await ctrl.loadState(false);

    assert.equal(await ctrl.allocateCarryOver('user-refund', 25), true);
    assert.equal(ctrl.getSnapshot().carryOver, 15);
    assert.equal(await ctrl.refundCarryOver('user-refund', 25), true);
    assert.equal(ctrl.getSnapshot().carryOver, 40);
    assert.equal(mockDb._rows.get('user-refund')?.carry_over, 40);

    // Concurrent external modification to carry_over_allocated retries cleanly with fresh state
    mockDb._rows.set('user-refund', {
      ...mockDb._rows.get('user-refund'),
      carry_over: 50,
      carry_over_allocated: 10,
      carry_over_allocated_month: '2026-11',
    });
    assert.equal(await ctrl.allocateCarryOverToBudget('user-refund', 15, '2026-11'), true);
    assert.equal(mockDb._rows.get('user-refund')?.carry_over, 35);
    assert.equal(mockDb._rows.get('user-refund')?.carry_over_allocated, 25);
  }

  // Exchange-rate validation: rejects empty rates, missing NZD, and future clock skew
  {
    const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
    const prevStorage = globalThis.localStorage;
    const mem = new Map();
    globalThis.localStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
    const origFetch = globalThis.fetch;
    try {
      localStorage.setItem(
        'finance-exchange-rates',
        JSON.stringify({ rates: {}, fetchedAt: Date.now() })
      );
      assert.equal(readCachedRates(), null);

      localStorage.setItem(
        'finance-exchange-rates',
        JSON.stringify({ rates: { USD: 0.6 }, fetchedAt: Date.now() + 600000 })
      );
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({ result: 'success', rates: { USD: 0.65 } }), // invalid: missing NZD
      });
      const rates = await loadExchangeRates();
      // Falls back to cached valid object from clock-skew cache since network had no NZD
      assert.equal(rates.USD, 0.6);
    } finally {
      globalThis.fetch = origFetch;
      if (hadStorage) {
        globalThis.localStorage = prevStorage;
      } else {
        delete globalThis.localStorage;
      }
    }
  }

  // 31st-of-month anchor preservation across February & skippedDates + alert cap (#23)
  {
    const sub31 = {
      id: 'sub-31',
      label: 'Month End Plan',
      amount: 20,
      frequency: 'monthly',
      start_date: '2026-01-31',
      initial_start_date: '2026-01-31',
      active: true,
      remind_days_before: 45,
    };
    const nextMar = getNextBillingDate({
      startDate: sub31.start_date,
      initialStartDate: sub31.initial_start_date,
      frequency: 'monthly',
      fromDate: new Date(2026, 2, 1), // March 1
    });
    assert.equal(format(nextMar, 'yyyy-MM-dd'), '2026-03-31');

    const nextAfterSkip = getNextBillingDate({
      startDate: sub31.start_date,
      initialStartDate: sub31.initial_start_date,
      frequency: 'monthly',
      skippedDates: ['2026-03-31'],
      fromDate: new Date(2026, 2, 1),
    });
    assert.equal(format(nextAfterSkip, 'yyyy-MM-dd'), '2026-04-30');

    const skipFeb = computeSkipPayload(sub31, new Date(2026, 1, 20)); // Feb 20 (next is Feb 28)
    assert.equal(skipFeb.start_date, '2026-03-31');
    assert.equal(skipFeb.initial_start_date, '2026-01-31');
    assert.deepEqual(skipFeb.skipped_dates, ['2026-02-28']);

    // maxDaysUntilDue: 30 caps distant reminders even when remind_days_before is 45 (#23)
    const distantSub = {
      ...sub31,
      start_date: '2026-04-20',
      initial_start_date: '2026-04-20',
    };
    assert.deepEqual(
      getUpcomingBillingAlerts([distantSub], {
        today: new Date(2026, 2, 10), // 41 days away (< 45 remind window, but > 30 cap)
        daysAhead: 30,
        maxDaysUntilDue: 30,
      }),
      []
    );
  }

  // Unclosed prior-month top-up must not be overwritten before month-close runs
  {
    const mockDbPendingClose = createMockSupabase({
      initialSettings: [
        {
          user_id: 'user-pending-close',
          carry_over: 200,
          carry_over_allocated: 60,
          carry_over_allocated_month: '2026-10',
          carry_over_closed_through: '2026-09',
        },
      ],
    });
    const ctrlPending = createCarryOverController({ client: mockDbPendingClose });
    ctrlPending.setUser('user-pending-close');
    await ctrlPending.loadState(false);
    const blocked = await ctrlPending.allocateCarryOverToBudget('user-pending-close', 40, '2026-11');
    assert.equal(blocked, false, 'allocating to new month blocks while prior month allocation is unclosed');
    assert.equal(mockDbPendingClose._rows.get('user-pending-close')?.carry_over_allocated_month, '2026-10');
    assert.equal(mockDbPendingClose._rows.get('user-pending-close')?.carry_over_allocated, 60);

    // Mutation during slow initial load must still finish hydration and clear isLoading
    const baseMockDb = createMockSupabase({
      initialSettings: [{ user_id: 'user-slow-load', carry_over: 75, category_limits: {} }],
    });
    let releaseFirstSelect;
    const firstSelectGate = new Promise((resolve) => {
      releaseFirstSelect = resolve;
    });
    let delayedOnce = false;
    const slowReadClient = {
      ...baseMockDb,
      from(table) {
        const q = baseMockDb.from(table);
        if (table === 'user_settings' && !delayedOnce) {
          delayedOnce = true;
          const origThen = q.then.bind(q);
          q.then = (onFulfilled, onRejected) =>
            firstSelectGate.then(() => origThen(onFulfilled, onRejected));
        }
        return q;
      },
    };
    const ctrlSlow = createCarryOverController({ client: slowReadClient });
    ctrlSlow.setUser('user-slow-load');
    const loadPromise = ctrlSlow.loadState(false);
    const mutPromise = ctrlSlow.updateCategoryLimits('user-slow-load', { Food: 300 });
    releaseFirstSelect();
    await Promise.all([loadPromise, mutPromise]);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(ctrlSlow.getSnapshot().isLoading, false);
    assert.equal(ctrlSlow.getSnapshot().loadedUserId, 'user-slow-load');
    assert.equal(ctrlSlow.getSnapshot().carryOver, 75);
  }

  console.log('✓ Step 1-2 regression checks (refundCarryOver, FX, 31st anchor, #23 alert cap) passed');
}

// PR #15 final review regressions: FX price_history inheritance & legacy reactivation
{
  const rates = { NZD: 1, USD: 0.5 };
  const [convertedSub] = withConvertedAmounts(
    [
      {
        id: 'usd-hist',
        label: 'Cloud',
        amount: 10,
        currency: 'USD',
        frequency: 'monthly',
        start_date: '2026-09-01',
        price_history: [{ amount: 5, until: '2026-10-01' }],
      },
    ],
    'NZD',
    rates,
  );
  assert.equal(convertedSub.price_history[0].base_amount, 10, 'price_history without currency inherits sub.currency');

  const legacyDisabled = {
    id: 'legacy-off',
    label: 'Old Gym',
    amount: 25,
    currency: 'NZD',
    frequency: 'monthly',
    start_date: '2026-06-05',
    initial_start_date: '2026-06-05',
    active: false,
    ended_on: null,
    skipped_dates: [],
  };
  const reactivated = computeActivationUpdate(legacyDisabled, now);
  assert.equal(reactivated.active, true);
  assert.equal(reactivated.ended_on, null);
  assert.deepEqual(
    reactivated.skipped_dates,
    ['2026-06-05', '2026-07-05', '2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05'],
    'reactivating legacy disabled subscription skips historical pre-today dates'
  );
  assert.equal(
    generateSubscriptionExpenseOccurrences([{ ...legacyDisabled, ...reactivated }], now, { today: now }).length,
    0,
    'reactivating legacy disabled subscription must not invent past charges'
  );

  console.log('✓ PR #15 final review carry-over, reactivation, and FX regressions passed');
}

console.log('\nAll money rules tests passed!');
