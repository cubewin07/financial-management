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

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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
    expenses.reduce((sum, expense) => {
      if (expense.date?.slice(0, 7) !== month) {
        return sum;
      }

      return sum + Number(expense.amount || 0);
    }, 0),
  );

  return roundCurrency(Number(budget || 0) - totalSpent);
}

export function buildMonthlySnapshots(
  expenses = [],
  existingSnapshots = [],
  budget = 0,
  userId = 'local-owner',
  currentMonth = getMonthKey(),
) {
  const candidateMonths = [
    ...expenses.map((expense) => expense.date?.slice(0, 7)).filter(Boolean),
    ...existingSnapshots.map((snapshot) => snapshot.month).filter(Boolean),
  ];

  if (candidateMonths.length === 0) {
    return [];
  }

  const earliestMonth = candidateMonths.sort()[0];
  const lastClosedMonth = getMonthKey(subMonths(monthKeyToDate(currentMonth), 1));

  if (earliestMonth > lastClosedMonth) {
    return existingSnapshots
      .filter((snapshot) => snapshot.month < currentMonth)
      .sort((left, right) => right.month.localeCompare(left.month));
  }

  const intervalMonths = eachMonthOfInterval({
    start: startOfMonth(monthKeyToDate(earliestMonth)),
    end: startOfMonth(monthKeyToDate(lastClosedMonth)),
  });

  const snapshotByMonth = new Map(existingSnapshots.map((snapshot) => [snapshot.month, snapshot]));

  return intervalMonths
    .map((monthDate) => {
      const month = getMonthKey(monthDate);
      const existing = snapshotByMonth.get(month);
      const totalSpent = roundCurrency(
        expenses.reduce((sum, expense) => {
          if (expense.date?.slice(0, 7) !== month) {
            return sum;
          }

          return sum + Number(expense.amount || 0);
        }, 0),
      );

      return {
        id: existing?.id || createId('snapshot'),
        user_id: existing?.user_id || userId,
        month,
        budget: roundCurrency(budget),
        total_spent: totalSpent,
        carry_over: roundCurrency(budget - totalSpent),
        created_at: existing?.created_at || new Date().toISOString(),
      };
    })
    .sort((left, right) => right.month.localeCompare(left.month));
}

export function getEffectiveBudget(baseBudget, snapshots = [], currentMonth = getMonthKey()) {
  return roundCurrency(
    Number(baseBudget || 0) +
      snapshots.reduce((sum, snapshot) => {
        if (snapshot.month >= currentMonth) {
          return sum;
        }

        return sum + Number(snapshot.carry_over || 0);
      }, 0),
  );
}

export function getPreviousMonthCarryOver(snapshots = [], currentMonth = getMonthKey()) {
  const previousMonth = getMonthKey(subMonths(monthKeyToDate(currentMonth), 1));
  const match = snapshots.find((snapshot) => snapshot.month === previousMonth);
  return Number(match?.carry_over || 0);
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

export function getNextMonthKey(month) {
  return getMonthKey(addMonths(monthKeyToDate(month), 1));
}

