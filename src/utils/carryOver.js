import {
  addMonths,
  eachMonthOfInterval,
  format,
  parse,
  startOfMonth,
  subMonths,
} from 'date-fns';

export const MONTHLY_SNAPSHOTS_STORAGE_KEY = 'finance-monthly-snapshots';

function createId(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toFiniteAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function roundCurrency(value) {
  const num = toFiniteAmount(value);
  const sign = num < 0 ? -1 : 1;
  const rounded = (sign * Math.round((Math.abs(num) + Number.EPSILON) * 100)) / 100;
  return rounded === 0 ? 0 : rounded;
}

export function isValidMonthKey(monthKey) {
  return typeof monthKey === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

export function getMonthKey(date = new Date()) {
  if (typeof date === 'string') {
    return date.slice(0, 7);
  }

  return format(date, 'yyyy-MM');
}

export function monthKeyToDate(monthKey) {
  return parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date());
}

export function computeCarryOver(month, expenses = [], budget = 0) {
  const totalSpent = roundCurrency(
    (expenses || []).reduce((sum, expense) => {
      if (expense?.date?.slice(0, 7) !== month) {
        return sum;
      }

      return sum + toFiniteAmount(expense?.amount);
    }, 0),
  );

  return roundCurrency(toFiniteAmount(budget) - totalSpent);
}

export function buildMonthlySnapshots(
  expenses = [],
  existingSnapshots = [],
  budget = 0,
  userId = 'local-owner',
  currentMonth = getMonthKey(),
) {
  if (!isValidMonthKey(currentMonth)) {
    return [];
  }

  const candidateMonths = [
    ...(expenses || []).map((expense) => expense?.date?.slice(0, 7)).filter(isValidMonthKey),
    ...(existingSnapshots || []).map((snapshot) => snapshot?.month).filter(isValidMonthKey),
  ];

  if (candidateMonths.length === 0) {
    return [];
  }

  const earliestMonth = candidateMonths.sort()[0];
  const lastClosedMonth = getMonthKey(subMonths(monthKeyToDate(currentMonth), 1));

  if (earliestMonth > lastClosedMonth) {
    return (existingSnapshots || [])
      .filter((snapshot) => isValidMonthKey(snapshot?.month) && snapshot.month < currentMonth)
      .sort((left, right) => right.month.localeCompare(left.month));
  }

  const intervalMonths = eachMonthOfInterval({
    start: startOfMonth(monthKeyToDate(earliestMonth)),
    end: startOfMonth(monthKeyToDate(lastClosedMonth)),
  });

  const snapshotByMonth = new Map((existingSnapshots || []).map((snapshot) => [snapshot.month, snapshot]));

  return intervalMonths
    .map((monthDate) => {
      const month = getMonthKey(monthDate);
      const existing = snapshotByMonth.get(month);
      const totalSpent = roundCurrency(
        (expenses || []).reduce((sum, expense) => {
          if (expense?.date?.slice(0, 7) !== month) {
            return sum;
          }

          return sum + toFiniteAmount(expense?.amount);
        }, 0),
      );

      const budgetNum = roundCurrency(budget);
      return {
        id: existing?.id || createId('snapshot'),
        user_id: existing?.user_id || userId,
        month,
        budget: budgetNum,
        total_spent: totalSpent,
        carry_over: roundCurrency(budgetNum - totalSpent),
        category_limits: existing?.category_limits || {},
        created_at: existing?.created_at || new Date().toISOString(),
      };
    })
    .sort((left, right) => right.month.localeCompare(left.month));
}

export function getEffectiveBudget(baseBudget, snapshots = [], currentMonth = getMonthKey()) {
  return roundCurrency(
    toFiniteAmount(baseBudget) +
      (snapshots || []).reduce((sum, snapshot) => {
        if (!snapshot?.month || snapshot.month >= currentMonth) {
          return sum;
        }

        return sum + toFiniteAmount(snapshot.carry_over);
      }, 0),
  );
}

export function getPreviousMonthCarryOver(snapshots = [], currentMonth = getMonthKey()) {
  if (!isValidMonthKey(currentMonth)) return 0;
  const previousMonth = getMonthKey(subMonths(monthKeyToDate(currentMonth), 1));
  const match = (snapshots || []).find((snapshot) => snapshot?.month === previousMonth);
  return roundCurrency(match?.carry_over);
}

/** The top-up moved from carry-over into a month's budget. It only counts for that month. */
export function getMonthAllocation(allocation, month) {
  return allocation?.month === month ? roundCurrency(allocation.amount) : 0;
}

/**
 * Adds unused budget from finished months to the carry-over reserve. Overspent months take nothing.
 * The first run only records a starting point, so no past months are guessed at.
 *
 * @returns {{carryAddition: number, closedThrough: string}|null} null when there is nothing to close
 */
export function computeMonthClose({ closedThrough, currentMonth, expenses = [], baseBudget = 0, allocation = null }) {
  if (!isValidMonthKey(currentMonth)) return null;
  const lastFinishedMonth = getMonthKey(subMonths(monthKeyToDate(currentMonth), 1));
  if (!closedThrough || !isValidMonthKey(closedThrough)) {
    return { carryAddition: 0, closedThrough: lastFinishedMonth };
  }
  if (closedThrough >= lastFinishedMonth) return null;

  let carryAddition = 0;
  for (
    let month = getNextMonthKey(closedThrough);
    month && month <= lastFinishedMonth;
    month = getNextMonthKey(month)
  ) {
    const budget = toFiniteAmount(baseBudget) + getMonthAllocation(allocation, month);
    carryAddition += Math.max(0, computeCarryOver(month, expenses, budget));
  }

  return { carryAddition: roundCurrency(carryAddition), closedThrough: lastFinishedMonth };
}

export function formatCarryOver(amount) {
  if (amount > 0) {
    return {
      sign: '+',
      label: 'carried over from last month',
      colorClass:
        'border border-[rgba(45,212,191,0.22)] bg-[rgba(45,212,191,0.12)] text-[var(--accent-teal)]',
    };
  }

  if (amount < 0) {
    return {
      sign: '−',
      label: 'debt from last month',
      colorClass:
        'border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.12)] text-[var(--accent-coral)]',
    };
  }

  return {
    sign: '',
    label: 'No carry-over',
    colorClass:
      'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]',
  };
}

export function computeReserveAllocation(carryOver = 0, amount = 0) {
  const reserve = toFiniteAmount(carryOver);
  const rawAmount = Number(amount);
  if (!Number.isFinite(rawAmount)) {
    return { ok: false, moved: 0, nextBalance: roundCurrency(reserve) };
  }
  const moved = roundCurrency(rawAmount);
  if (moved <= 0 || moved > reserve) {
    return { ok: false, moved: 0, nextBalance: roundCurrency(reserve) };
  }
  return { ok: true, moved, nextBalance: roundCurrency(reserve - moved) };
}

export function buildReserveSnapshots({
  userId = 'local-owner',
  currentMonth = getMonthKey(),
  baseBudget = 0,
  carryOver = 0,
  categoryLimits = {},
  expenses = [],
  maxMonths = 240,
} = {}) {
  if (!isValidMonthKey(currentMonth)) return [];

  const spentByMonth = new Map();
  for (const e of expenses || []) {
    const month = e?.date?.slice(0, 7);
    if (isValidMonthKey(month)) {
      const amt = Number(e.amount);
      spentByMonth.set(month, roundCurrency((spentByMonth.get(month) || 0) + (Number.isFinite(amt) ? amt : 0)));
    }
  }

  // Every calendar month from the earliest expense to now, so quiet months count and future-dated ones do not.
  const rawEarliest = [...spentByMonth.keys()].sort()[0] || currentMonth;
  const earliest = rawEarliest > currentMonth ? currentMonth : rawEarliest;
  const months = [];
  let cursor = monthKeyToDate(currentMonth);
  while (getMonthKey(cursor) >= earliest && months.length < maxMonths) {
    months.push(getMonthKey(cursor));
    cursor = subMonths(cursor, 1);
  }

  const baseNum = roundCurrency(baseBudget);
  const reserveNum = roundCurrency(carryOver);
  return months.map((month) => {
    const totalSpent = roundCurrency(spentByMonth.get(month) || 0);
    const isCurrent = month === currentMonth;

    return {
      id: `snapshot-${userId}-${month}`,
      user_id: userId,
      month,
      budget: baseNum,
      carry_over: isCurrent ? reserveNum : Math.max(0, roundCurrency(baseNum - totalSpent)),
      category_limits: isCurrent ? categoryLimits : {},
      total_spent: totalSpent,
    };
  });
}

export function getNextMonthKey(month) {
  if (!isValidMonthKey(month)) return null;
  return getMonthKey(addMonths(monthKeyToDate(month), 1));
}

