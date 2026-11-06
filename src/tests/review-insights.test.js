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
import { getMonthPace } from '../utils/finance.js';

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

  // Database expenses use `note` column (not `item`): must detect new merchant and populate title from `note`
  const dbNewMerchantExp = { id: 501, note: ' Bunnings Warehouse ', category: 'Shopping', amount: 95, date: '2026-10-09' };
  const outliersDbNew = findOutliers([dbNewMerchantExp], { monthlyBudget: 1000, now });
  assert.equal(outliersDbNew.length, 1);
  assert.equal(outliersDbNew[0].reason, 'new');
  assert.equal(outliersDbNew[0].title, 'Bunnings Warehouse');
  assert.equal(outliersDbNew[0].detail, 'New merchant');

  const dbPrevMerchantExp = { id: 500, note: 'bunnings warehouse', category: 'Shopping', amount: 80, date: '2026-09-12' };
  assert.equal(findOutliers([dbPrevMerchantExp, dbNewMerchantExp], { monthlyBudget: 1000, now }).length, 0);

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
  assert.equal(needsReview({ id: 10 }, [{ author_role: 'reviewer', author_user_id: 'rev-dad', body: 'Checked' }], 'rev-mentor'), true);
  assert.equal(needsReview({ id: 10 }, [{ author_role: 'reviewer', author_user_id: 'rev-dad', body: 'Checked' }], 'rev-dad'), false);
  console.log('✓ needsReview accurately identifies unreviewed non-recurring expenses with multi-reviewer attribution');

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
    pace: getMonthPace({ monthlyBudget: 1000, monthSpent: 300, now }),
    topSurge: null,
    currency: 'NZD',
  });
  assert.ok(noteOnTrack.includes('380.00'));
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

  // 8. resolveAuthorName & getReviewerFeedback
  const {
    resolveAuthorName,
    getReviewerFeedback,
    countUnreadFeedback,
    sortCandidatesByAttention,
    nextUnreviewed,
  } = await import('../utils/reviewInsights.js');

  const myReviewers = [
    { member_user_id: 'usr-1', member_email: 'mentor.bob@test.com' },
    { member_user_id: 'usr-2', member_email: 'dad@test.com' },
  ];

  assert.equal(resolveAuthorName({ author_email: 'sarah.connor@test.com' }), 'Sarah Connor');
  assert.equal(resolveAuthorName({ author_user_id: 'usr-1' }, myReviewers), 'Mentor Bob');
  assert.equal(resolveAuthorName(null, [], 'Fallback Reviewer'), 'Fallback Reviewer');

  const sampleExpenses = [
    { id: 101, item: 'Book', amount: 30, category: 'Education' },
    { id: 102, item: 'Dinner', amount: 80, category: 'Dining Out' },
    { id: 'sub-exp-1-2026-10-01', item: 'Spotify', amount: 15, subscription_id: 'sub-1' },
    { id: 103, item: 'Coffee', amount: 5, category: 'Dining Out' },
  ];

  const sampleCommentsMap = {
    101: [{ id: 1, author_role: 'reviewer', author_email: 'dad@test.com', body: 'Nice book', created_at: '2026-10-10T12:00:00Z' }],
    102: [
      { id: 2, author_role: 'owner', body: 'With friends', created_at: '2026-10-11T12:00:00Z' },
      { id: 3, author_role: 'reviewer', author_user_id: 'usr-1', body: 'A bit high', created_at: '2026-10-12T15:00:00Z' },
    ],
    103: [{ id: 4, author_role: 'owner', body: 'Morning coffee', created_at: '2026-10-13T08:00:00Z' }],
  };

  const feedback = getReviewerFeedback(sampleExpenses, sampleCommentsMap, myReviewers);
  assert.equal(feedback.length, 2);
  assert.equal(feedback[0].expense.id, 102); // Newer reviewer comment (Oct 12 vs Oct 10)
  assert.equal(feedback[0].reviewerName, 'Mentor Bob');
  assert.equal(feedback[1].expense.id, 101);
  assert.equal(feedback[1].reviewerName, 'Dad');
  console.log('✓ getReviewerFeedback orders by latest reviewer comment and resolves author names');

  // 9. countUnreadFeedback
  const unreadBeforeAll = countUnreadFeedback({
    expenseComments: sampleCommentsMap,
    monthComments: { '2026-10': [{ author_role: 'reviewer', created_at: '2026-10-14T00:00:00Z' }] },
    seenIso: '2026-10-01T00:00:00Z',
  });
  assert.equal(unreadBeforeAll, 3); // 2 expense comments + 1 month comment

  // When seenIso is null, counts all reviewer comments as unread
  const unreadNullSeen = countUnreadFeedback({
    expenseComments: sampleCommentsMap,
    monthComments: { '2026-10': [{ author_role: 'reviewer', created_at: '2026-10-14T00:00:00Z' }] },
    seenIso: null,
  });
  assert.equal(unreadNullSeen, 3);

  // When currentUserId is provided, comments authored by current user are excluded
  const unreadExcludingSelf = countUnreadFeedback({
    expenseComments: sampleCommentsMap,
    monthComments: { '2026-10': [{ author_role: 'reviewer', author_user_id: 'usr-1', created_at: '2026-10-14T00:00:00Z' }] },
    seenIso: null,
    currentUserId: 'usr-1',
  });
  // sampleCommentsMap has 1 comment with author_email 'dad@test.com' (counted),
  // 1 with author_user_id 'usr-1' (excluded), and month comment has author_user_id 'usr-1' (excluded).
  assert.equal(unreadExcludingSelf, 1);

  const unreadAfterAll = countUnreadFeedback({
    expenseComments: sampleCommentsMap,
    monthComments: { '2026-10': [{ author_role: 'reviewer', created_at: '2026-10-14T00:00:00Z' }] },
    seenIso: '2026-10-15T00:00:00Z',
  });
  assert.equal(unreadAfterAll, 0);
  console.log('✓ countUnreadFeedback detects new comments against seen timestamp and excludes self-authored comments');

  // 10. sortCandidatesByAttention
  const candidates = [
    { owner_user_id: 'c-1', owner_email: 'charlie@test.com' },
    { owner_user_id: 'c-2', owner_email: 'alice@test.com' },
    { owner_user_id: 'c-3', owner_email: 'bob@test.com' },
  ];
  const overviews = new Map([
    ['c-1', { status: 'on-track', newCount: 0 }],
    ['c-2', { status: 'over', newCount: 0 }],
    ['c-3', { status: 'watch', newCount: 2 }],
  ]);
  const sortedCandidates = sortCandidatesByAttention(candidates, overviews);
  assert.equal(sortedCandidates[0].owner_user_id, 'c-2'); // 'over' first
  assert.equal(sortedCandidates[1].owner_user_id, 'c-3'); // 'watch' second
  assert.equal(sortedCandidates[2].owner_user_id, 'c-1'); // 'on-track' third
  console.log('✓ sortCandidatesByAttention ranks urgency (over > watch > on-track)');

  // 11. nextUnreviewed
  const unreviewedList = [
    { id: 'e1' },
    { id: 'e2' },
    { id: 'e3' },
  ];
  const commentsFor = (id) => (id === 'e2' ? [{ author_role: 'reviewer' }] : []); // e2 is reviewed
  assert.equal(nextUnreviewed(unreviewedList, 'e1', commentsFor)?.id, 'e3'); // skips e2, finds e3
  assert.equal(nextUnreviewed(unreviewedList, 'e3', commentsFor)?.id, 'e1'); // wraps around to e1
  console.log('✓ nextUnreviewed navigates unreviewed queue with wrap-around');

  console.log('\nAll Review Insights contract tests passed!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
