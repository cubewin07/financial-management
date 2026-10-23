import assert from 'node:assert/strict';
import {
  OUTLIER_LIMIT,
  LARGE_MULTIPLE,
  MIN_HISTORY_SAMPLES,
  HISTORY_DAYS,
  SURGE_RATIO,
  minMeaningfulAmount,
  classifyPace,
  findOutliers,
  groupByDay,
  needsReview,
  getSuggestedNote,
  displayName,
  FALLBACK_OWNER_LABEL,
} from '../utils/reviewInsights.js';

async function runTests() {
  console.log('--- Running Review Insights Contract Tests ---');

  const now = new Date(2026, 9, 15); // Fixed clock: 15 Oct 2026

  // 1. Constants
  assert.equal(OUTLIER_LIMIT, 3);
  assert.equal(LARGE_MULTIPLE, 2);
  assert.equal(MIN_HISTORY_SAMPLES, 3);
  assert.equal(HISTORY_DAYS, 90);
  assert.equal(SURGE_RATIO, 1.3);
  assert.equal(minMeaningfulAmount(1000), 50); // max(20, 0.05 * 1000) = 50
  assert.equal(minMeaningfulAmount(200), 20);  // max(20, 0.05 * 200) = 20
  assert.equal(minMeaningfulAmount(0), 20);
  console.log('✓ Threshold constants and minMeaningfulAmount contract');

  // 2. classifyPace
  // None: budget <= 0
  assert.equal(classifyPace({ monthlyBudget: 0, monthSpent: 100, now }), 'none');
  assert.equal(classifyPace({ monthlyBudget: null, monthSpent: 100, now }), 'none');

  // On track: 300 spent by day 15, projected = (300/15)*31 = 620 <= 1000
  assert.equal(classifyPace({ monthlyBudget: 1000, monthSpent: 300, now }), 'on-track');

  // Watch: 510 spent by day 15, projected = (510/15)*31 = 1054 (> 1000, but <= 1000 * 1.10 = 1100)
  assert.equal(classifyPace({ monthlyBudget: 1000, monthSpent: 510, now }), 'watch');

  // Over via projected > budget * 1.10: 600 spent by day 15, projected = (600/15)*31 = 1240 > 1100
  assert.equal(classifyPace({ monthlyBudget: 1000, monthSpent: 600, now }), 'over');

  // Over via remaining < 0 (even if projected was somehow lower, but spent >= budget)
  assert.equal(classifyPace({ monthlyBudget: 1000, monthSpent: 1050, now }), 'over');
  console.log('✓ classifyPace accurately resolves status (none, on-track, watch, over)');

  // 3. findOutliers
  // Empty input -> []
  assert.deepEqual(findOutliers([], { monthlyBudget: 1000, now }), []);

  // Large outlier test:
  // History: 3 samples in Dining Out in last 90 days (Aug/Sep) with median = 30.
  // Today's expense: amount 60 (>= 2.0x median) fires.
  // Another expense with 57 (< 2.0x median = 60) does not fire as large.
  const historyDining = [
    { id: 'h1', item: 'Cafe', category: 'Dining Out', amount: 30, date: '2026-08-10' },
    { id: 'h2', item: 'Cafe', category: 'Dining Out', amount: 30, date: '2026-09-01' },
    { id: 'h3', item: 'Cafe', category: 'Dining Out', amount: 30, date: '2026-09-20' },
  ];
  const thisMonthDiningLarge = { id: 'd-large', item: 'Cafe', category: 'Dining Out', amount: 60, date: '2026-10-05' };
  const thisMonthDiningBorder = { id: 'd-border', item: 'Cafe', category: 'Dining Out', amount: 57, date: '2026-10-06' };

  const outliersLarge = findOutliers([...historyDining, thisMonthDiningLarge], { monthlyBudget: 1000, now });
  assert.equal(outliersLarge.length, 1);
  assert.equal(outliersLarge[0].reason, 'large');
  assert.equal(outliersLarge[0].detail, '2× usual');
  assert.equal(outliersLarge[0].amount, 60);

  const outliersBorder = findOutliers([...historyDining, thisMonthDiningBorder], { monthlyBudget: 1000, now });
  assert.equal(outliersBorder.length, 0); // 57 < 2 * 30

  // Needs >= 3 history samples: with only 2, large does not fire
  const outliersFewSamples = findOutliers([historyDining[0], historyDining[1], thisMonthDiningLarge], { monthlyBudget: 1000, now });
  assert.equal(outliersFewSamples.length, 0);

  // History older than 90 days before Oct 1 (July 1 is 92 days before Oct 1): ignored
  const oldHistory = [
    { id: 'old1', item: 'Cafe', category: 'Dining Out', amount: 30, date: '2026-06-01' },
    { id: 'old2', item: 'Cafe', category: 'Dining Out', amount: 30, date: '2026-06-15' },
    { id: 'h3', item: 'Cafe', category: 'Dining Out', amount: 30, date: '2026-09-20' },
  ];
  const outliersOldHist = findOutliers([...oldHistory, thisMonthDiningLarge], { monthlyBudget: 1000, now });
  assert.equal(outliersOldHist.length, 0); // only 1 within 90 days

  // New merchant test:
  // Item "TechStore" never appeared before Oct 2026, amount 80 >= min (50) -> fires as 'new'
  const newMerchantExp = { id: 'm-new', item: 'TechStore', category: 'Shopping', amount: 80, date: '2026-10-08' };
  const outliersNew = findOutliers([newMerchantExp], { monthlyBudget: 1000, now });
  assert.equal(outliersNew.length, 1);
  assert.equal(outliersNew[0].reason, 'new');
  assert.equal(outliersNew[0].detail, 'New merchant');

  // If "techstore" was in history, it should NOT fire as new merchant
  const prevTechStore = { id: 'prev-tech', item: '  techstore  ', category: 'Shopping', amount: 40, date: '2026-09-10' };
  const outliersNotNew = findOutliers([prevTechStore, newMerchantExp], { monthlyBudget: 1000, now });
  assert.equal(outliersNotNew.length, 0);

  // Surge category test:
  // September Groceries = 200. October Groceries = 260 (ratio = 1.3x >= 1.3 and diff = 60 >= min 50) -> fires
  const prevGroceries = { id: 'g-prev', item: 'Supermarket', category: 'Groceries', amount: 200, date: '2026-09-15' };
  const thisGroceriesSurge = { id: 'g-this', item: 'Supermarket', category: 'Groceries', amount: 260, date: '2026-10-10' };
  const outliersSurge = findOutliers([prevGroceries, thisGroceriesSurge], { monthlyBudget: 1000, now });
  assert.equal(outliersSurge.some((o) => o.reason === 'surge'), true);
  const surgeItem = outliersSurge.find((o) => o.reason === 'surge');
  assert.equal(surgeItem.type, 'category');
  assert.equal(surgeItem.category, 'Groceries');
  assert.equal(surgeItem.detail, '+30% vs Sep');

  // Surge border: 1.29x should NOT fire
  const thisGroceriesUnder = { id: 'g-this-under', item: 'Supermarket', category: 'Groceries', amount: 258, date: '2026-10-10' };
  const outliersSurgeUnder = findOutliers([prevGroceries, thisGroceriesUnder], { monthlyBudget: 1000, now });
  assert.equal(outliersSurgeUnder.some((o) => o.reason === 'surge'), false);

  // Virtual recurring rows (subscription_id or id: sub-exp-) NEVER flagged as outliers
  const recurringExp = { id: 'sub-exp-12-2026-10-01', subscription_id: 12, item: 'Netflix', category: 'Bills', amount: 150, date: '2026-10-01' };
  const outliersRecurring = findOutliers([recurringExp], { monthlyBudget: 1000, now });
  assert.equal(outliersRecurring.length, 0);

  // Amounts below minMeaningfulAmount (50 for budget 1000) ignored
  const smallNewExp = { id: 'm-small', item: 'TinyShop', category: 'Shopping', amount: 45, date: '2026-10-08' };
  assert.equal(findOutliers([smallNewExp], { monthlyBudget: 1000, now }).length, 0);

  // Deduplication and limit: max OUTLIER_LIMIT (3) returned, sorted by score desc
  console.log('✓ findOutliers detects large, new, and surge anomalies with threshold guards');

  // 4. groupByDay
  const dayExpenses = [
    { id: '1', item: 'A', amount: 10.55, date: '2026-10-15' }, // Today
    { id: '2', item: 'B', amount: 5.45, date: '2026-10-15' },  // Today -> Total 16.00
    { id: '3', item: 'C', amount: 20.00, date: '2026-10-14' }, // Yesterday
    { id: '4', item: 'D', amount: 50.00, date: '2026-10-12' }, // Monday
  ];
  const groups = groupByDay(dayExpenses, now);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].label, 'Today');
  assert.equal(groups[0].date, '2026-10-15');
  assert.equal(groups[0].total, 16);
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[1].label, 'Yesterday');
  assert.equal(groups[1].total, 20);
  assert.equal(groups[2].label, 'Mon 12 Oct');
  assert.equal(groups[2].total, 50);
  console.log('✓ groupByDay correctly formats dates, labels, totals, and maintains stable order');

  // 5. needsReview
  assert.equal(needsReview({ id: 'sub-exp-1', subscription_id: 1 }), false);
  assert.equal(needsReview({ id: 10 }, []), true);
  assert.equal(needsReview({ id: 10 }, [{ author_role: 'owner', body: 'Mine' }]), true);
  assert.equal(needsReview({ id: 10 }, [{ author_role: 'reviewer', body: 'Checked' }]), false);
  console.log('✓ needsReview accurately identifies unreviewed non-recurring expenses');

  // 6. getSuggestedNote
  const noteOver = getSuggestedNote({
    name: 'Mia',
    status: 'over',
    pace: { budget: 1000, projectedEndSpend: 1200 },
    topSurge: { category: 'Dining Out' },
    currency: 'NZD',
  });
  assert.ok(noteOver.includes('Mia'));
  assert.ok(noteOver.includes('over budget'));
  assert.ok(noteOver.includes('Dining Out'));

  const noteOnTrackSurge = getSuggestedNote({
    name: 'Mia',
    status: 'on-track',
    pace: { budget: 1000, projectedEndSpend: 800, daysRemaining: 16 },
    topSurge: { category: 'Groceries', pct: 30, thisTotal: 260, prevTotal: 200 },
    currency: 'NZD',
  });
  assert.ok(noteOnTrackSurge.includes('Nice pacing'));
  assert.ok(noteOnTrackSurge.includes('Groceries'));
  assert.ok(noteOnTrackSurge.includes('30%'));

  const noteOnTrack = getSuggestedNote({
    name: 'Mia',
    status: 'on-track',
    pace: { budget: 1000, projectedEndSpend: 800, remaining: 200, daysRemaining: 16 },
    topSurge: null,
    currency: 'NZD',
  });
  assert.ok(noteOnTrack.includes('keep it up!'));

  const noteNone = getSuggestedNote({ status: 'none' });
  assert.ok(noteNone.includes('setting a monthly budget'));
  console.log('✓ getSuggestedNote returns tailored guidance for all pace conditions');

  // 7. displayName
  assert.equal(displayName('mia.smith@x.com'), 'Mia Smith');
  assert.equal(displayName('dad@x.com'), 'Dad');
  assert.equal(displayName('alex_john-doe@example.org'), 'Alex John Doe');
  assert.equal(displayName('', 'Default Person'), 'Default Person');
  assert.equal(displayName(null, FALLBACK_OWNER_LABEL), FALLBACK_OWNER_LABEL);
  assert.equal(displayName(FALLBACK_OWNER_LABEL), FALLBACK_OWNER_LABEL);
  console.log('✓ displayName formats human-readable names and preserves fallback tokens');

  console.log('\nAll Review Insights contract tests passed!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
