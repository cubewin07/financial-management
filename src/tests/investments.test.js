import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  isMissingInvestmentMetadataColumn,
  normalizeInvestmentCurrency,
  normalizeInvestmentRow,
  sanitizeScopedLegacyAssets,
  summarizeInvestments,
  withConvertedInvestments,
} from '../utils/investments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function runTests() {
  console.log('--- Running investments tests ---');

  // 1. Currency & row normalization
  assert.equal(normalizeInvestmentCurrency(' usd '), 'USD');
  assert.equal(normalizeInvestmentCurrency('', 'aud'), 'AUD');
  assert.equal(normalizeInvestmentCurrency(null, ''), 'NZD');

  const normalized = normalizeInvestmentRow({
    id: 42,
    name: '  Global ETF  ',
    category: 'Equities',
    market_value: -50,
    currency: 'usd ',
    isLiquid: false,
  });
  assert.deepEqual(normalized, {
    id: 42,
    user_id: null,
    name: 'Global ETF',
    category: 'Equities',
    market_value: 0,
    currency: 'USD',
    is_liquid: false,
    created_at: null,
    updated_at: null,
  });

  // 2. FX conversion instead of relabeling on defaultCurrency change
  const rates = { NZD: 1, USD: 0.5, VND: 15000 };
  const holdings = [
    { id: 1, name: 'NZ Cash', category: 'Cash', market_value: 1000, currency: 'NZD', is_liquid: true },
    { id: 2, name: 'US ETF', category: 'Equities', market_value: 500, currency: 'USD', is_liquid: true },
    { id: 3, name: 'VN Term', category: 'Other', market_value: 150000, currency: 'VND', is_liquid: false },
  ];

  const inNzd = withConvertedInvestments(holdings, 'NZD', rates);
  assert.equal(inNzd[0].base_value, 1000);
  assert.equal(inNzd[1].base_value, 1000); // 500 USD / 0.5 = 1000 NZD
  assert.equal(inNzd[2].base_value, 10);   // 150,000 VND / 15,000 = 10 NZD
  assert.equal(inNzd.every((a) => !a.conversion_missing), true);

  const summaryNzd = summarizeInvestments(inNzd);
  assert.equal(summaryNzd.totalNetWorth, 2010);
  assert.equal(summaryNzd.liquidTotal, 2000);
  assert.equal(summaryNzd.illiquidTotal, 10);
  assert.equal(summaryNzd.liquidPercent, 100);
  assert.equal(summaryNzd.illiquidPercent, 0);
  assert.equal(summaryNzd.missingConversionCount, 0);

  // Switching defaultCurrency to USD converts holdings instead of keeping 1000/500/150000 raw
  const inUsd = withConvertedInvestments(holdings, 'USD', rates);
  assert.equal(inUsd[0].base_value, 500);  // 1000 NZD * 0.5 = 500 USD
  assert.equal(inUsd[1].base_value, 500);  // 500 USD stays 500 USD
  assert.equal(inUsd[2].base_value, 5);    // 150,000 VND -> 10 NZD -> 5 USD
  assert.equal(summarizeInvestments(inUsd).totalNetWorth, 1005);

  // Unknown currency is excluded from converted totals and flagged
  const withMissing = withConvertedInvestments(
    [
      ...holdings,
      { id: 4, name: 'Mystery Asset', category: 'Crypto', market_value: 999, currency: 'XXX', is_liquid: true },
    ],
    'NZD',
    rates,
  );
  assert.equal(withMissing[3].conversion_missing, true);
  assert.equal(withMissing[3].base_value, 0);
  const summaryMissing = summarizeInvestments(withMissing);
  assert.equal(summaryMissing.totalNetWorth, 2010);
  assert.equal(summaryMissing.convertedCount, 3);
  assert.equal(summaryMissing.missingConversionCount, 1);

  // 3. Sanitize scoped legacy assets (drops sample defaults, keeps user edits)
  const sanitized = sanitizeScopedLegacyAssets(
    [
      { id: 1, name: 'Emergency Cash Fund', category: 'Cash', value: 12500, isLiquid: true },
      { id: 2, name: 'Global Index ETF (US/World)', category: 'Equities', value: 36000, isLiquid: true },
      { id: 'custom-1', name: 'My Savings', category: 'Cash', value: 4200, currency: 'USD', isLiquid: false },
    ],
    'NZD',
  );
  assert.equal(sanitized.length, 2);
  assert.deepEqual(sanitized[0], {
    name: 'Global Index ETF (US/World)',
    category: 'Equities',
    market_value: 36000,
    currency: 'NZD',
    is_liquid: true,
  });
  assert.deepEqual(sanitized[1], {
    name: 'My Savings',
    category: 'Cash',
    market_value: 4200,
    currency: 'USD',
    is_liquid: false,
  });

  assert.equal(isMissingInvestmentMetadataColumn({ code: '42703', message: 'column "is_liquid" does not exist' }), true);
  assert.equal(isMissingInvestmentMetadataColumn({ code: 'PGRST204', message: 'Could not find category' }), true);
  assert.equal(isMissingInvestmentMetadataColumn({ code: '42501', message: 'permission denied' }), false);

  // 4. Hook persistence, account isolation, scoped migration, fallback, and error surfacing
  await runInvestmentsHookTests();

  // 5. Source contract: InvestmentsPage no longer writes/reads localStorage directly
  const pageSrc = fs.readFileSync(path.join(rootDir, 'src/pages/InvestmentsPage.jsx'), 'utf8');
  assert.equal(pageSrc.includes('localStorage'), false, 'InvestmentsPage must not use localStorage directly');
  assert.equal(pageSrc.includes('useInvestments'), true, 'InvestmentsPage must use useInvestments hook');

  const appSrc = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
  assert.equal(appSrc.includes('exchangeRates={exchangeRates}'), true, 'App must pass exchangeRates to InvestmentsPage');

  console.log('✓ All investments tests passed!');
}

async function runInvestmentsHookTests() {
  const loaderSource = `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === 'react') {
        return { url: 'mock:react', shortCircuit: true };
      }
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
      if (url === 'mock:react') {
        return {
          format: 'module',
          source: \`
            export function useState(init) { return globalThis.__TEST_REACT_HOOKS__.useState(init); }
            export function useEffect(fn, deps) { return globalThis.__TEST_REACT_HOOKS__.useEffect(fn, deps); }
            export function useRef(init) { return globalThis.__TEST_REACT_HOOKS__.useRef(init); }
            export function useCallback(fn, deps) { return globalThis.__TEST_REACT_HOOKS__.useCallback(fn, deps); }
          \`,
          shortCircuit: true,
        };
      }
      if (url === 'mock:supabaseClient') {
        return {
          format: 'module',
          source: 'export const supabase = {};',
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    }
  `;
  register(`data:text/javascript,${encodeURIComponent(loaderSource)}`);

  async function mountHook(hookFn, initialProps) {
    const slots = [];
    const effects = [];
    let cursor = 0;
    let pendingEffects = [];
    let isRendering = false;
    let needsRender = false;
    let currentProps = initialProps;
    let result;

    const depsChanged = (prevDeps, nextDeps) => {
      if (!prevDeps || !nextDeps) return true;
      if (prevDeps.length !== nextDeps.length) return true;
      return nextDeps.some((dep, i) => !Object.is(dep, prevDeps[i]));
    };

    const runCycle = () => {
      if (isRendering) {
        needsRender = true;
        return;
      }
      isRendering = true;
      try {
        do {
          needsRender = false;
          cursor = 0;
          pendingEffects = [];
          result = hookFn(currentProps);
          const toRun = pendingEffects;
          pendingEffects = [];
          for (const item of toRun) {
            if (typeof item.prevCleanup === 'function') {
              item.prevCleanup();
            }
            const cleanup = item.fn();
            effects[item.slotIdx] = { deps: item.deps, cleanup };
          }
        } while (needsRender);
      } finally {
        isRendering = false;
      }
    };

    globalThis.__TEST_REACT_HOOKS__ = {
      useState(initial) {
        const slotIdx = cursor++;
        if (!(slotIdx in slots)) {
          slots[slotIdx] = typeof initial === 'function' ? initial() : initial;
        }
        const setState = (updater) => {
          const nextValue = typeof updater === 'function' ? updater(slots[slotIdx]) : updater;
          if (!Object.is(nextValue, slots[slotIdx])) {
            slots[slotIdx] = nextValue;
            runCycle();
          }
        };
        return [slots[slotIdx], setState];
      },
      useRef(initial) {
        const slotIdx = cursor++;
        if (!(slotIdx in slots)) {
          slots[slotIdx] = { current: initial };
        }
        return slots[slotIdx];
      },
      useCallback(fn, deps) {
        const slotIdx = cursor++;
        const prev = slots[slotIdx];
        if (!prev || depsChanged(prev.deps, deps)) {
          slots[slotIdx] = { fn, deps };
        }
        return slots[slotIdx].fn;
      },
      useEffect(fn, deps) {
        const slotIdx = cursor++;
        const prev = effects[slotIdx];
        if (!prev || depsChanged(prev.deps, deps)) {
          pendingEffects.push({ slotIdx, fn, deps, prevCleanup: prev?.cleanup });
        }
      },
    };

    runCycle();
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      get result() {
        return result;
      },
      async rerender(nextProps) {
        currentProps = nextProps;
        runCycle();
        await new Promise((resolve) => setTimeout(resolve, 10));
      },
      unmount() {
        for (const eff of effects) {
          if (typeof eff?.cleanup === 'function') eff.cleanup();
        }
      },
    };
  }

  function createInvestmentsMockSupabase(initialRows = []) {
    const rows = initialRows.map((r) => ({ ...r }));
    const calls = { selectEq: [], inserts: [], updates: [], deletes: [], channels: [], removedChannels: 0 };
    let simulateMissingMetadata = false;
    let deleteError = null;
    let nextId = 100;

    const client = {
      calls,
      setSimulateMissingMetadata(val) {
        simulateMissingMetadata = val;
      },
      setDeleteError(err) {
        deleteError = err;
      },
      channel(name) {
        const ch = {
          name,
          on() { return ch; },
          subscribe() { return ch; },
        };
        calls.channels.push(name);
        return ch;
      },
      removeChannel() {
        calls.removedChannels += 1;
      },
      from(table) {
        assert.equal(table, 'investments');
        return {
          select() {
            return {
              eq(col, val) {
                calls.selectEq.push([col, val]);
                return {
                  async order() {
                    const matched = rows
                      .filter((r) => r[col] === val)
                      .map((r) => ({ ...r }));
                    return { data: matched, error: null };
                  },
                };
              },
            };
          },
          insert(payload) {
            const list = Array.isArray(payload) ? payload : [payload];
            calls.inserts.push(list);
            return {
              select() {
                const runInsert = () => {
                  if (
                    simulateMissingMetadata &&
                    list.some((item) => 'category' in item || 'is_liquid' in item)
                  ) {
                    return {
                      data: null,
                      error: { code: '42703', message: 'column "category" of relation "investments" does not exist' },
                    };
                  }
                  const created = list.map((item) => {
                    const row = {
                      id: nextId++,
                      created_at: new Date().toISOString(),
                      ...item,
                    };
                    rows.unshift(row);
                    return { ...row };
                  });
                  return { data: created, error: null };
                };

                return {
                  then(onFulfilled, onRejected) {
                    return Promise.resolve(runInsert()).then(onFulfilled, onRejected);
                  },
                  async single() {
                    const res = runInsert();
                    if (res.error) return { data: null, error: res.error };
                    return { data: res.data[0], error: null };
                  },
                };
              },
            };
          },
          update(payload) {
            calls.updates.push(payload);
            const filters = {};
            const builder = {
              eq(col, val) {
                filters[col] = val;
                return builder;
              },
              select() {
                return {
                  async single() {
                    if (
                      simulateMissingMetadata &&
                      ('category' in payload || 'is_liquid' in payload)
                    ) {
                      return {
                        data: null,
                        error: { code: 'PGRST204', message: 'Could not find the is_liquid column' },
                      };
                    }
                    const idx = rows.findIndex(
                      (r) => String(r.id) === String(filters.id) && r.user_id === filters.user_id,
                    );
                    if (idx === -1) {
                      return { data: null, error: { message: 'Not found' } };
                    }
                    rows[idx] = { ...rows[idx], ...payload };
                    return { data: { ...rows[idx] }, error: null };
                  },
                };
              },
            };
            return builder;
          },
          delete() {
            const filters = {};
            const builder = {
              eq(col, val) {
                filters[col] = val;
                if (col === 'user_id') {
                  calls.deletes.push({ ...filters });
                  if (deleteError) {
                    return Promise.resolve({ error: deleteError });
                  }
                  const idx = rows.findIndex(
                    (r) => String(r.id) === String(filters.id) && r.user_id === filters.user_id,
                  );
                  if (idx !== -1) rows.splice(idx, 1);
                  return Promise.resolve({ error: null });
                }
                return builder;
              },
            };
            return builder;
          },
        };
      },
    };
    return client;
  }

  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  const prevStorage = globalThis.localStorage;
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
  };

  try {
    const { default: useInvestments, SCOPED_LEGACY_KEY_PREFIX } = await import('../hooks/useInvestments.js');

    // Unscoped legacy key MUST be ignored; user-scoped key migrates once when DB is empty
    storageMap.set(
      'financial_mgt_portfolio_assets',
      JSON.stringify([{ id: 'leak', name: 'Other User Secret', value: 999999 }]),
    );
    storageMap.set(
      `${SCOPED_LEGACY_KEY_PREFIX}user-a`,
      JSON.stringify([
        { id: 1, name: 'Emergency Cash Fund', category: 'Cash', value: 12500, isLiquid: true },
        { id: 'c-1', name: 'US Index', category: 'Equities', value: 500, currency: 'USD', isLiquid: true },
      ]),
    );

    const mockDb = createInvestmentsMockSupabase([
      { id: 1, user_id: 'user-b', name: 'User B Holding', category: 'Cash', market_value: 750, currency: 'AUD', is_liquid: true },
    ]);

    const hook = await mountHook(useInvestments, {
      userId: 'user-a',
      defaultCurrency: 'NZD',
      client: mockDb,
    });

    assert.equal(hook.result.investments.length, 1, 'Migrates only user-a scoped non-sample asset');
    assert.equal(hook.result.investments[0].name, 'US Index');
    assert.equal(hook.result.investments[0].currency, 'USD');
    assert.equal(storageMap.has(`${SCOPED_LEGACY_KEY_PREFIX}user-a`), false, 'Removes migrated scoped key');
    assert.equal(
      hook.result.investments.some((a) => a.name === 'Other User Secret'),
      false,
      'Must never read unscoped legacy key',
    );

    // Add + update + metadata fallback
    mockDb.setSimulateMissingMetadata(true);
    const added = await hook.result.addInvestment({
      name: 'VND Term Deposit',
      category: 'Cash',
      currency: 'VND',
      market_value: 300000,
      is_liquid: false,
    });
    assert.equal(added.error, null);
    assert.equal(hook.result.investments[0].currency, 'VND');
    assert.equal(hook.result.investments[0].is_liquid, false);

    const updated = await hook.result.updateInvestment(added.data.id, {
      name: 'VND Savings',
      category: 'Cash',
      currency: 'VND',
      market_value: 450000,
      is_liquid: true,
    });
    assert.equal(updated.error, null);
    assert.equal(hook.result.investments[0].market_value, 450000);
    assert.equal(hook.result.investments[0].is_liquid, true);
    mockDb.setSimulateMissingMetadata(false);

    // Delete error surfaces instead of silently succeeding
    mockDb.setDeleteError({ message: 'RLS blocked' });
    const failedDel = await hook.result.deleteInvestment(added.data.id);
    assert.equal(failedDel.error.message, 'RLS blocked');
    assert.equal(hook.result.error, 'RLS blocked');
    assert.equal(hook.result.investments.length, 2);

    mockDb.setDeleteError(null);
    const okDel = await hook.result.deleteInvestment(added.data.id);
    assert.equal(okDel.error, null);
    assert.equal(hook.result.error, '');
    assert.equal(hook.result.investments.length, 1);

    // Switching userId resets state and loads only user-b's records
    await hook.rerender({ userId: 'user-b', defaultCurrency: 'NZD', client: mockDb });
    assert.equal(hook.result.investments.length, 1);
    assert.equal(hook.result.investments[0].name, 'User B Holding');
    assert.equal(hook.result.investments[0].currency, 'AUD');

    hook.unmount();
    assert.ok(mockDb.calls.removedChannels >= 2, 'Cleans up realtime subscriptions on switch/unmount');
  } finally {
    if (hadStorage) {
      globalThis.localStorage = prevStorage;
    } else {
      delete globalThis.localStorage;
    }
    delete globalThis.__TEST_REACT_HOOKS__;
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
