import {
  format,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns';

export const CATEGORIES = [
  'Food',
  'Groceries',
  'Transport',
  'Entertainment',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Other',
];

export const CATEGORY_COLOR_PALETTE = [
  '#FBBF24',
  '#60A5FA',
  '#2DD4BF',
  '#7C6FE0',
  '#F87171',
];

export const CHART_COLOR_PALETTE = ['#7C6FE0', '#2DD4BF', '#F87171', '#FBBF24', '#60A5FA'];

const CATEGORY_COLOR_OVERRIDES = {
  food: '#FBBF24',
  transport: '#60A5FA',
  health: '#2DD4BF',
  entertainment: '#7C6FE0',
  groceries: '#FBBF24',
  bills: '#F87171',
};

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function hashCode(value = '') {
  return [...String(value).trim().toLowerCase()].reduce(
    (hash, character, index) => hash + character.charCodeAt(0) * (index + 1),
    0,
  );
}

export function getCategoryColor(categoryName) {
  const normalizedName = String(categoryName || '').trim().toLowerCase();

  if (CATEGORY_COLOR_OVERRIDES[normalizedName]) {
    return CATEGORY_COLOR_OVERRIDES[normalizedName];
  }

  const index = hashCode(normalizedName) % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[index];
}

export function getCategoryBadgeStyle(categoryName) {
  const color = getCategoryColor(categoryName);

  return {
    backgroundColor: `${color}1f`,
    borderColor: `${color}40`,
    color,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function createExpense(input, userId = 'local-owner') {
  const expenseId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `expense-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    id: expenseId,
    user_id: userId,
    amount: roundCurrency(input.amount),
    category: input.category,
    date: input.date,
    note: input.note?.trim() || '',
    created_at: new Date().toISOString(),
  };
}

export function sortExpenses(expenses = []) {
  return [...expenses].sort((left, right) => {
    const rightTime = new Date(`${right.date}T00:00:00`).getTime();
    const leftTime = new Date(`${left.date}T00:00:00`).getTime();

    if (rightTime === leftTime) {
      return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
    }

    return rightTime - leftTime;
  });
}

export function getCurrentMonthExpenses(expenses) {
  const now = new Date();

  return sortExpenses(
    expenses.filter((expense) => isSameMonth(parseISO(expense.date), now)),
  );
}

export const PERIOD_OPTIONS = [
  { value: 'current-month', label: 'This month' },
  { value: 'last-90-days', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
  { value: 'all-time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export function getFinanceSummary(expenses, budget) {
  const totalSpent = roundCurrency(
    expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
  );
  const remaining = roundCurrency(Number(budget || 0) - totalSpent);
  const percentSpent = budget === 0 ? 0 : Math.max((totalSpent / budget) * 100, 0);

  return {
    totalSpent,
    remaining,
    percentSpent,
    transactionCount: expenses.length,
  };
}

export function getCategoryBreakdown(expenses) {
  return Object.entries(
    expenses.reduce((groups, expense) => {
      groups[expense.category] = roundCurrency(
        Number(groups[expense.category] || 0) + Number(expense.amount || 0),
      );
      return groups;
    }, {}),
  )
    .map(([name, value]) => ({
      name,
      value,
      color: getCategoryColor(name),
    }))
    .sort((left, right) => right.value - left.value);
}

export function getChartCategoryBreakdown(expenses) {
  return getCategoryBreakdown(expenses).map((item, index) => ({
    ...item,
    color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
  }));
}

export function getDailyTrend(expenses) {
  const byDay = expenses.reduce((groups, expense) => {
    groups[expense.date] = roundCurrency(Number(groups[expense.date] || 0) + Number(expense.amount || 0));
    return groups;
  }, {});

  return Object.entries(byDay)
    .sort(([left], [right]) => new Date(left) - new Date(right))
    .map(([date, total]) => ({
      date: format(parseISO(date), 'MMM d'),
      isoDate: date,
      total,
    }));
}

export function getExpensesForPeriod(expenses, period, customRange) {
  const now = new Date();
  const today = parseISO(format(now, 'yyyy-MM-dd'));

  return sortExpenses(
    expenses.filter((expense) => {
      const expenseDate = parseISO(expense.date);

      if (period === 'current-month') {
        return isSameMonth(expenseDate, today);
      }

      if (period === 'last-90-days') {
        const start = subDays(today, 89);
        return !isBefore(expenseDate, start) && !isAfter(expenseDate, today);
      }

      if (period === 'this-year') {
        return expenseDate.getFullYear() === today.getFullYear();
      }

      if (period === 'custom') {
        const start = customRange?.start ? parseISO(customRange.start) : null;
        const end = customRange?.end ? parseISO(customRange.end) : null;

        if (start && isBefore(expenseDate, start)) {
          return false;
        }

        if (end && isAfter(expenseDate, end)) {
          return false;
        }

        return Boolean(start || end);
      }

      return true;
    }),
  );
}

export function getPeriodLabel(period, customRange) {
  if (period === 'custom') {
    if (customRange?.start && customRange?.end) {
      return `${formatShortDate(customRange.start)} - ${formatShortDate(customRange.end)}`;
    }

    if (customRange?.start) {
      return `From ${formatShortDate(customRange.start)}`;
    }

    if (customRange?.end) {
      return `Until ${formatShortDate(customRange.end)}`;
    }

    return 'Custom range';
  }

  return PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'Selected period';
}

export function getBudgetRemainingPercent(remaining, budget) {
  if (budget <= 0) {
    return 0;
  }

  return Math.max((remaining / budget) * 100, 0);
}

export function getBudgetProgressTone(percentSpent) {
  if (percentSpent < 60) {
    return 'var(--accent-teal)';
  }

  if (percentSpent < 90) {
    return 'var(--accent-amber)';
  }

  return 'var(--accent-coral)';
}

export function getTopCategories(expenses, limit = 3) {
  return getCategoryBreakdown(expenses).slice(0, limit);
}

export function formatLongDate(date) {
  return format(parseISO(date), 'MMM d, yyyy');
}

export function formatShortDate(date) {
  return format(parseISO(date), 'MMM d');
}

export function formatMonthLabel(month) {
  return format(parseISO(`${month}-01`), 'MMMM yyyy');
}

export function getDateRangeMeta(expenses) {
  if (expenses.length === 0) {
    return {
      daysCovered: 0,
      startDate: null,
      endDate: null,
    };
  }

  const sortedDates = expenses
    .map((expense) => expense.date)
    .sort((left, right) => new Date(left) - new Date(right));
  const startDate = parseISO(sortedDates[0]);
  const endDate = parseISO(sortedDates[sortedDates.length - 1]);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return {
    daysCovered: Math.floor((endDate - startDate) / millisecondsPerDay) + 1,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

export function getMonthLabel(date = new Date()) {
  return format(startOfMonth(date), 'MMMM yyyy');
}
