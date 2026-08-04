/**
 * Source of truth: skip next billing cycle / "Skip Week" on subscriptions.
 *
 * These tests pin the real product contract used by:
 * - SubscriptionCard handleSkipNext  → onUpdate(id, { start_date: nextDate })
 * - SubscriptionDetailModal handleSkipCycle → onUpdate(id, { start_date: nextDate })
 *
 * If you redesign UI, re-run this file. Behavior must not change unless product intent changes.
 *
 * Run: node src/tests/skip-billing-cycle.test.js
 *   or: npm run test:skip-billing
 */

import assert from 'node:assert/strict';
import { addMonths, addWeeks, format, parseISO } from 'date-fns';
import {
  getNextBillingDate,
  getUpcomingBillingAlerts,
  skipNextBillingCycle,
  formatNextBilling,
} from '../utils/subscriptions.js';

// ─── helpers that mirror real UI usage ───────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function ymd(date) {
  return format(date, 'yyyy-MM-dd');
}

/** Same shape the UI stores after a successful Skip click. */
function applySkipLikeUi(subscription, fromDate) {
  const nextDate = skipNextBillingCycle(subscription, fromDate);
  if (!nextDate) return { updated: false, subscription, nextDate: null };
  return {
    updated: true,
    nextDate,
    subscription: { ...subscription, start_date: nextDate },
  };
}

function nextBillingYmd(subscription, fromDate) {
  const next = getNextBillingDate({
    startDate: subscription.start_date,
    frequency: subscription.frequency,
    fromDate,
  });
  return next ? ymd(next) : null;
}

function assertIsStartDateContract(value, label) {
  assert.equal(typeof value, 'string', `${label}: must be string for onUpdate start_date`);
  assert.match(value, YMD, `${label}: must be yyyy-MM-dd for DB/UI date fields`);
  assert.ok(!Number.isNaN(parseISO(value).getTime()), `${label}: must parse as a real date`);
}

// ─── suite ───────────────────────────────────────────────────────────────────

function runTests() {
  console.log('--- Running skip-billing-cycle source-of-truth tests ---\n');
  let passed = 0;
  const section = (name) => console.log(`\n▸ ${name}`);

  const check = (label, fn) => {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Guard rails — never throw; never invent a date
  // ═══════════════════════════════════════════════════════════════════════════
  section('Guard rails');

  check('null subscription → null', () => {
    assert.equal(skipNextBillingCycle(null), null);
  });

  check('undefined subscription → null', () => {
    assert.equal(skipNextBillingCycle(undefined), null);
  });

  check('empty object → null', () => {
    assert.equal(skipNextBillingCycle({}), null);
  });

  check('missing start_date → null', () => {
    assert.equal(skipNextBillingCycle({ frequency: 'weekly', label: 'Bus' }), null);
  });

  check('null start_date → null', () => {
    assert.equal(skipNextBillingCycle({ start_date: null, frequency: 'weekly' }), null);
  });

  check('empty string start_date → null', () => {
    assert.equal(skipNextBillingCycle({ start_date: '', frequency: 'weekly' }), null);
  });

  check('invalid start_date → null (UI must not call onUpdate)', () => {
    assert.equal(
      skipNextBillingCycle({ start_date: 'not-a-date', frequency: 'weekly' }, '2024-06-01'),
      null,
    );
  });

  check('garbage ISO-ish string → null', () => {
    assert.equal(
      skipNextBillingCycle({ start_date: '2024-99-99', frequency: 'monthly' }, '2024-06-01'),
      null,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Return contract — what UI / Supabase persist
  // ═══════════════════════════════════════════════════════════════════════════
  section('Return contract (UI onUpdate payload)');

  check('weekly skip returns yyyy-MM-dd string', () => {
    const result = skipNextBillingCycle(
      { start_date: '2024-03-04', frequency: 'weekly' },
      '2024-03-04',
    );
    assertIsStartDateContract(result, 'weekly skip');
  });

  check('monthly skip returns yyyy-MM-dd string', () => {
    const result = skipNextBillingCycle(
      { start_date: '2024-03-01', frequency: 'monthly' },
      '2024-03-01',
    );
    assertIsStartDateContract(result, 'monthly skip');
  });

  check('UI apply path only updates when result is non-null', () => {
    const good = applySkipLikeUi(
      { id: 'bus', start_date: '2024-03-04', frequency: 'weekly', active: true },
      '2024-03-04',
    );
    assert.equal(good.updated, true);
    assert.equal(good.subscription.start_date, good.nextDate);

    const bad = applySkipLikeUi({ id: 'broken', frequency: 'weekly' }, '2024-03-04');
    assert.equal(bad.updated, false);
    assert.equal(bad.nextDate, null);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Weekly — product "Skip Week" / uni break (primary real case)
  // ═══════════════════════════════════════════════════════════════════════════
  section('Weekly Skip Week (uni break)');

  check('on billing day: skip moves anchor +7 days (skip today\'s charge)', () => {
    // Bus pass bills every Monday. Today is Monday billing day → skip this week.
    const sub = { id: 'bus', label: 'Bus pass', start_date: '2024-03-04', frequency: 'weekly' };
    const today = '2024-03-04';
    assert.equal(nextBillingYmd(sub, today), '2024-03-04', 'precondition: due today');

    const skipped = skipNextBillingCycle(sub, today);
    assert.equal(skipped, '2024-03-11', 'new start_date is next Monday');

    const after = applySkipLikeUi(sub, today).subscription;
    assert.equal(nextBillingYmd(after, today), '2024-03-11', 'next bill is next week, not today');
  });

  check('mid-week: skip advances past the upcoming bill by one week', () => {
    // Anchor Mon 2024-03-04. Today Wed 2024-03-06 → next bill Mon 2024-03-11.
    // Skip → new anchor Mon 2024-03-18 (skip the Mar 11 charge).
    const sub = { start_date: '2024-03-04', frequency: 'weekly' };
    const today = '2024-03-06';
    assert.equal(nextBillingYmd(sub, today), '2024-03-11');

    const skipped = skipNextBillingCycle(sub, today);
    assert.equal(skipped, '2024-03-18');

    const after = { ...sub, start_date: skipped };
    assert.equal(nextBillingYmd(after, today), '2024-03-18');
  });

  check('day before billing: skip pushes bill out one more week', () => {
    const sub = { start_date: '2024-03-04', frequency: 'weekly' };
    const today = '2024-03-10'; // Sunday before Monday bill
    assert.equal(nextBillingYmd(sub, today), '2024-03-11');
    assert.equal(skipNextBillingCycle(sub, today), '2024-03-18');
  });

  check('day after billing: next is already next week; skip goes +1 from that', () => {
    const sub = { start_date: '2024-03-04', frequency: 'weekly' };
    const today = '2024-03-05'; // Tuesday after Monday bill
    assert.equal(nextBillingYmd(sub, today), '2024-03-11');
    assert.equal(skipNextBillingCycle(sub, today), '2024-03-18');
  });

  check('future-only start_date: skip still advances one week from that future anchor', () => {
    const sub = { start_date: '2024-06-03', frequency: 'weekly' };
    const today = '2024-03-01'; // well before start
    assert.equal(nextBillingYmd(sub, today), '2024-06-03');
    assert.equal(skipNextBillingCycle(sub, today), '2024-06-10');
  });

  check('core weekly invariant: skipped next = original next + 7 days', () => {
    const cases = [
      { start_date: '2024-01-01', today: '2024-01-01' },
      { start_date: '2024-01-01', today: '2024-01-03' },
      { start_date: '2024-01-01', today: '2024-02-15' },
      { start_date: '2023-12-25', today: '2024-01-10' },
      { start_date: '2024-06-17', today: '2024-06-20' },
    ];

    for (const { start_date, today } of cases) {
      const sub = { start_date, frequency: 'weekly' };
      const originalNext = getNextBillingDate({ startDate: start_date, frequency: 'weekly', fromDate: today });
      const expected = ymd(addWeeks(originalNext, 1));
      const actual = skipNextBillingCycle(sub, today);
      assert.equal(actual, expected, `weekly invariant failed for start=${start_date} today=${today}`);
    }
  });

  check('consecutive weekly skips (2× uni break / multi-week off)', () => {
    let sub = { id: 'bus', start_date: '2024-03-04', frequency: 'weekly', active: true };
    const today = '2024-03-04';

    // Skip week 1
    let step = applySkipLikeUi(sub, today);
    assert.equal(step.nextDate, '2024-03-11');
    sub = step.subscription;
    assert.equal(nextBillingYmd(sub, today), '2024-03-11');

    // Skip week 2 from the already-skipped state
    step = applySkipLikeUi(sub, today);
    assert.equal(step.nextDate, '2024-03-18');
    sub = step.subscription;
    assert.equal(nextBillingYmd(sub, today), '2024-03-18');

    // Skip week 3
    step = applySkipLikeUi(sub, today);
    assert.equal(step.nextDate, '2024-03-25');
    assert.equal(nextBillingYmd(step.subscription, today), '2024-03-25');
  });

  check('long-running weekly sub (many elapsed cycles) still skips cleanly', () => {
    // Started a year ago; today mid-stream
    const sub = { start_date: '2023-03-06', frequency: 'weekly' }; // Monday
    const today = '2024-03-13'; // Wednesday
    const originalNext = nextBillingYmd(sub, today);
    // From Mon 2023-03-06, next on/after Wed 2024-03-13 is Mon 2024-03-18
    assert.equal(originalNext, '2024-03-18');
    assert.equal(skipNextBillingCycle(sub, today), '2024-03-25');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Monthly — "Skip Next Billing Period"
  // ═══════════════════════════════════════════════════════════════════════════
  section('Monthly Skip Next Billing Period');

  check('on billing day: skip moves to same day next month', () => {
    const sub = { start_date: '2024-03-01', frequency: 'monthly' };
    const today = '2024-03-01';
    assert.equal(nextBillingYmd(sub, today), '2024-03-01');
    assert.equal(skipNextBillingCycle(sub, today), '2024-04-01');

    const after = applySkipLikeUi(sub, today).subscription;
    assert.equal(nextBillingYmd(after, today), '2024-04-01');
  });

  check('mid-month: skip advances past upcoming bill by one month', () => {
    const sub = { start_date: '2024-03-15', frequency: 'monthly' };
    const today = '2024-03-20';
    assert.equal(nextBillingYmd(sub, today), '2024-04-15');
    assert.equal(skipNextBillingCycle(sub, today), '2024-05-15');
  });

  check('core monthly invariant: skipped next = original next + 1 month', () => {
    const cases = [
      { start_date: '2024-01-15', today: '2024-01-15' },
      { start_date: '2024-01-15', today: '2024-01-20' },
      { start_date: '2024-01-15', today: '2024-03-01' },
      { start_date: '2023-06-01', today: '2024-06-15' },
    ];

    for (const { start_date, today } of cases) {
      const sub = { start_date, frequency: 'monthly' };
      const originalNext = getNextBillingDate({ startDate: start_date, frequency: 'monthly', fromDate: today });
      const expected = ymd(addMonths(originalNext, 1));
      assert.equal(
        skipNextBillingCycle(sub, today),
        expected,
        `monthly invariant failed for start=${start_date} today=${today}`,
      );
    }
  });

  check('month-end start (Jan 31) skips through short months safely', () => {
    // next from Jan 31 as of Feb 1 → Feb 29 (2024 leap) via getNextBillingDate
    const sub = { start_date: '2024-01-31', frequency: 'monthly' };
    const today = '2024-02-01';
    const originalNext = nextBillingYmd(sub, today);
    assert.equal(originalNext, '2024-02-29', 'precondition: Feb clamp in leap year');

    const skipped = skipNextBillingCycle(sub, today);
    // +1 month from Feb 29 → Mar 29
    assert.equal(skipped, '2024-03-29');
  });

  check('leap-day adjacent monthly skip remains a valid calendar date', () => {
    const sub = { start_date: '2024-02-29', frequency: 'monthly' };
    const today = '2024-02-29';
    assert.equal(skipNextBillingCycle(sub, today), '2024-03-29');
  });

  check('consecutive monthly skips chain correctly', () => {
    let sub = { start_date: '2024-01-10', frequency: 'monthly' };
    const today = '2024-01-10';

    sub = applySkipLikeUi(sub, today).subscription; // → 2024-02-10
    assert.equal(sub.start_date, '2024-02-10');
    sub = applySkipLikeUi(sub, today).subscription; // → 2024-03-10
    assert.equal(sub.start_date, '2024-03-10');
    sub = applySkipLikeUi(sub, today).subscription; // → 2024-04-10
    assert.equal(sub.start_date, '2024-04-10');
    assert.equal(nextBillingYmd(sub, today), '2024-04-10');
  });

  check('non-weekly frequency defaults to monthly advance (product default)', () => {
    // Unknown/legacy frequency must not break Skip — treat as monthly.
    const sub = { start_date: '2024-05-01', frequency: 'yearly' };
    const today = '2024-05-01';
    // getNextBillingDate falls back to anchor for unknown freq; skip still +1 month
    assert.equal(skipNextBillingCycle(sub, today), '2024-06-01');

    const noFreq = { start_date: '2024-05-01' };
    assert.equal(skipNextBillingCycle(noFreq, today), '2024-06-01');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Real product scenarios (bus pass, streaming, cellular)
  // ═══════════════════════════════════════════════════════════════════════════
  section('Real product scenarios');

  check('Bus pass weekly — skip during uni break week of exam period', () => {
    // Student: weekly bus, bills every Monday. Uni break: skip the week of 11 Mar.
    const bus = {
      id: 'bus-pass',
      label: 'Bus pass',
      amount: 15,
      frequency: 'weekly',
      start_date: '2024-02-05', // Monday
      active: true,
      remind_days_before: 3,
      currency: 'NZD',
    };
    const today = '2024-03-11'; // Monday billing day during break
    assert.equal(nextBillingYmd(bus, today), '2024-03-11');

    const { updated, nextDate, subscription: after } = applySkipLikeUi(bus, today);
    assert.equal(updated, true);
    assert.equal(nextDate, '2024-03-18');
    assert.equal(after.start_date, '2024-03-18');
    assert.equal(after.id, 'bus-pass', 'other fields preserved by UI spread');
    assert.equal(after.amount, 15);
    assert.equal(after.frequency, 'weekly');
    assert.equal(nextBillingYmd(after, today), '2024-03-18');
  });

  check('Netflix monthly — skip one month while travelling', () => {
    const netflix = {
      id: 'netflix',
      label: 'Netflix',
      amount: 15.49,
      frequency: 'monthly',
      start_date: '2024-01-12',
      active: true,
      brand_key: 'netflix',
    };
    const today = '2024-04-05';
    assert.equal(nextBillingYmd(netflix, today), '2024-04-12');

    const skipped = skipNextBillingCycle(netflix, today);
    assert.equal(skipped, '2024-05-12');

    const after = { ...netflix, start_date: skipped };
    assert.equal(nextBillingYmd(after, today), '2024-05-12');
    // Original April bill is gone from schedule
    assert.notEqual(nextBillingYmd(after, today), '2024-04-12');
  });

  check('Cellular monthly mid-cycle skip does not charge this cycle', () => {
    const cell = {
      id: 'cell',
      label: 'Cellular data',
      amount: 20,
      frequency: 'monthly',
      start_date: '2024-01-01',
      active: true,
    };
    const today = '2024-03-20';
    assert.equal(nextBillingYmd(cell, today), '2024-04-01');
    assert.equal(skipNextBillingCycle(cell, today), '2024-05-01');
  });

  check('inactive sub can still compute skip (toggle is separate from skip math)', () => {
    // UI may still show Skip on inactive cards or not — pure function must remain safe.
    const sub = { start_date: '2024-03-04', frequency: 'weekly', active: false };
    assert.equal(skipNextBillingCycle(sub, '2024-03-04'), '2024-03-11');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Post-skip billing / alert integration (what the rest of the app sees)
  // ═══════════════════════════════════════════════════════════════════════════
  section('Post-skip integration with billing + alerts');

  check('after weekly skip, formatNextBilling shows the pushed date', () => {
    // Billing day Mar 4 → skip sets start_date to Mar 11.
    // From today (Mar 4), next bill is the new anchor Mar 11 (not Mar 18).
    const sub = { start_date: '2024-03-04', frequency: 'weekly' };
    const today = '2024-03-04';
    assert.equal(formatNextBilling(getNextBillingDate({
      startDate: sub.start_date,
      frequency: sub.frequency,
      fromDate: today,
    })), 'Mar 4', 'precondition: due today');

    const after = applySkipLikeUi(sub, today).subscription;
    assert.equal(after.start_date, '2024-03-11');
    const next = getNextBillingDate({
      startDate: after.start_date,
      frequency: after.frequency,
      fromDate: today,
    });
    assert.equal(formatNextBilling(next), 'Mar 11');
  });

  check('after skip, old billing date no longer appears in upcoming alerts', () => {
    const original = {
      id: 'bus',
      start_date: '2024-03-04',
      frequency: 'weekly',
      active: true,
      remind_days_before: 0, // alert on billing day
    };
    const today = '2024-03-11'; // billing Monday
    // Before skip: due today → alert fires
    const beforeAlerts = getUpcomingBillingAlerts([original], { today, daysAhead: 0 });
    assert.equal(beforeAlerts.length, 1, 'precondition: alert on billing day');

    const after = applySkipLikeUi(original, today).subscription;
    // After skip: next is Mar 18, not today → no same-day alert
    const afterAlerts = getUpcomingBillingAlerts([after], { today, daysAhead: 0 });
    assert.equal(afterAlerts.length, 0, 'skipped cycle must not still alert today');
  });

  check('skipped monthly sub only re-enters alert window on the new bill date', () => {
    const sub = {
      id: 'spotify',
      start_date: '2024-03-01',
      frequency: 'monthly',
      active: true,
      remind_days_before: 0,
    };
    const billingDay = '2024-04-01';
    assert.equal(nextBillingYmd(sub, billingDay), '2024-04-01');

    const after = applySkipLikeUi(sub, billingDay).subscription;
    assert.equal(after.start_date, '2024-05-01');

    const alertsOnOldDay = getUpcomingBillingAlerts([after], { today: billingDay, daysAhead: 0 });
    assert.equal(alertsOnOldDay.length, 0);

    const alertsOnNewDay = getUpcomingBillingAlerts([after], { today: '2024-05-01', daysAhead: 0 });
    assert.equal(alertsOnNewDay.length, 1);
    assert.equal(alertsOnNewDay[0].id, 'spotify');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Determinism + optional fromDate (test harness contract)
  // ═══════════════════════════════════════════════════════════════════════════
  section('Determinism');

  check('same inputs always produce same output (pinned fromDate)', () => {
    const sub = { start_date: '2024-02-12', frequency: 'weekly' };
    const today = '2024-03-01';
    const a = skipNextBillingCycle(sub, today);
    const b = skipNextBillingCycle(sub, today);
    const c = skipNextBillingCycle({ ...sub }, today);
    assert.equal(a, b);
    assert.equal(b, c);
    assert.equal(a, '2024-03-11');
  });

  check('different fromDate can change which cycle is skipped', () => {
    const sub = { start_date: '2024-03-04', frequency: 'weekly' };
    // On Mar 4, next is Mar 4 → skip to Mar 11
    assert.equal(skipNextBillingCycle(sub, '2024-03-04'), '2024-03-11');
    // On Mar 12, next is Mar 18 → skip to Mar 25
    assert.equal(skipNextBillingCycle(sub, '2024-03-12'), '2024-03-25');
  });

  check('fromDate accepts Date objects as well as yyyy-MM-dd strings', () => {
    const sub = { start_date: '2024-03-04', frequency: 'weekly' };
    const asString = skipNextBillingCycle(sub, '2024-03-06');
    const asDate = skipNextBillingCycle(sub, parseISO('2024-03-06'));
    assert.equal(asString, asDate);
    assert.equal(asString, '2024-03-18');
  });

  check('omitting fromDate still returns a valid yyyy-MM-dd (live today path used by UI)', () => {
    // UI calls skipNextBillingCycle(subscription) with no second arg.
    // We only assert shape/safety here — absolute date depends on wall clock.
    const sub = {
      start_date: '2020-01-06', // Monday far in the past so next always exists
      frequency: 'weekly',
    };
    const result = skipNextBillingCycle(sub);
    assertIsStartDateContract(result, 'live today weekly skip');

    const monthly = skipNextBillingCycle({ start_date: '2020-01-01', frequency: 'monthly' });
    assertIsStartDateContract(monthly, 'live today monthly skip');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Calendar edge cases that break naive date math
  // ═══════════════════════════════════════════════════════════════════════════
  section('Calendar edge cases');

  check('year boundary weekly skip (Dec → Jan)', () => {
    const sub = { start_date: '2024-12-30', frequency: 'weekly' }; // Monday
    const today = '2024-12-30';
    assert.equal(skipNextBillingCycle(sub, today), '2025-01-06');
  });

  check('year boundary monthly skip (Dec → Jan)', () => {
    const sub = { start_date: '2024-12-15', frequency: 'monthly' };
    const today = '2024-12-15';
    assert.equal(skipNextBillingCycle(sub, today), '2025-01-15');
  });

  check('DST spring-forward week still advances exactly 7 calendar days', () => {
    // US DST 2024: springs forward 2024-03-10. Weekly math must stay calendar-stable.
    const sub = { start_date: '2024-03-04', frequency: 'weekly' }; // Mon before DST
    const today = '2024-03-10'; // Sunday of DST change weekend
    // Next bill Mon Mar 11; skip → Mon Mar 18
    assert.equal(nextBillingYmd(sub, today), '2024-03-11');
    assert.equal(skipNextBillingCycle(sub, today), '2024-03-18');
  });

  check('DST fall-back week still advances exactly 7 calendar days', () => {
    // US DST 2024: falls back 2024-11-03.
    const sub = { start_date: '2024-10-28', frequency: 'weekly' }; // Monday
    const today = '2024-11-03';
    assert.equal(nextBillingYmd(sub, today), '2024-11-04');
    assert.equal(skipNextBillingCycle(sub, today), '2024-11-11');
  });

  check('date-only strings stay stable (no UTC off-by-one in skip result)', () => {
    // Critical for NZ/west-of-UTC users: yyyy-MM-dd must not shift a day.
    const sub = { start_date: '2024-08-05', frequency: 'weekly' };
    const today = '2024-08-05';
    const skipped = skipNextBillingCycle(sub, today);
    assert.equal(skipped, '2024-08-12');
    assert.match(skipped, YMD);
    // Re-parse and format must round-trip the same calendar day
    assert.equal(ymd(parseISO(skipped)), '2024-08-12');
  });

  check('ISO datetime start_date still skips correctly', () => {
    const sub = { start_date: '2024-03-04T00:00:00', frequency: 'weekly' };
    assert.equal(skipNextBillingCycle(sub, '2024-03-04T00:00:00'), '2024-03-11');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Idempotent product rule: skip never charges the skipped cycle
  // ═══════════════════════════════════════════════════════════════════════════
  section('Product rule: skipped cycle is never the next bill');

  check('for many weekly fixtures, post-skip next ≠ pre-skip next', () => {
    const fixtures = [
      { start_date: '2024-01-01', today: '2024-01-01' },
      { start_date: '2024-01-01', today: '2024-01-08' },
      { start_date: '2024-02-05', today: '2024-03-11' },
      { start_date: '2023-06-12', today: '2024-06-01' },
      { start_date: '2024-07-01', today: '2024-07-15' },
    ];

    for (const { start_date, today } of fixtures) {
      const sub = { start_date, frequency: 'weekly' };
      const before = nextBillingYmd(sub, today);
      const afterSub = applySkipLikeUi(sub, today).subscription;
      const after = nextBillingYmd(afterSub, today);
      assert.ok(before, `pre next exists (${start_date})`);
      assert.ok(after, `post next exists (${start_date})`);
      assert.notEqual(after, before, `must leave skipped cycle (${before})`);
      // And exactly +7 days
      assert.equal(after, ymd(addWeeks(parseISO(before), 1)));
    }
  });

  check('for many monthly fixtures, post-skip next ≠ pre-skip next', () => {
    const fixtures = [
      { start_date: '2024-01-01', today: '2024-01-01' },
      { start_date: '2024-01-15', today: '2024-01-20' },
      { start_date: '2024-01-31', today: '2024-02-15' },
      { start_date: '2023-12-01', today: '2024-06-15' },
    ];

    for (const { start_date, today } of fixtures) {
      const sub = { start_date, frequency: 'monthly' };
      const before = nextBillingYmd(sub, today);
      const afterSub = applySkipLikeUi(sub, today).subscription;
      const after = nextBillingYmd(afterSub, today);
      assert.notEqual(after, before, `must leave skipped cycle (${before})`);
      assert.equal(after, ymd(addMonths(parseISO(before), 1)));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Does not mutate input (safe for React state)
  // ═══════════════════════════════════════════════════════════════════════════
  section('Immutability');

  check('skipNextBillingCycle does not mutate the subscription object', () => {
    const sub = {
      id: 'x',
      start_date: '2024-03-04',
      frequency: 'weekly',
      amount: 15,
      active: true,
    };
    const freeze = JSON.stringify(sub);
    skipNextBillingCycle(sub, '2024-03-04');
    assert.equal(JSON.stringify(sub), freeze, 'input object must be unchanged');
  });

  console.log(`\nAll skip-billing-cycle tests passed (${passed} assertions/groups).`);
}

runTests();
