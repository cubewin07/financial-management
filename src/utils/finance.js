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

export const CATEGORY_COLORS = {
  Food: '#22c55e',
  Groceries: '#16a34a',
  Transport: '#3b82f6',
  Entertainment: '#f59e0b',
  Shopping: '#ec4899',
  Bills: '#ef4444',
  Health: '#14b8a6',
  Education: '#8b5cf6',
  Other: '#a1a1aa',
};

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function getCurrentMonthExpenses(expenses) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return expenses
    .filter((expense) => {
      const expenseDate = new Date(`${expense.date}T00:00:00`);
      return (
        expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      );
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export const PERIOD_OPTIONS = [
  { value: 'current-month', label: 'This month' },
  { value: 'last-90-days', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
  { value: 'all-time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export function getFinanceSummary(expenses, budget) {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const remaining = budget - totalSpent;
  const percentSpent = budget === 0 ? 0 : Math.min((totalSpent / budget) * 100, 100);

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
      groups[expense.category] = (groups[expense.category] || 0) + Number(expense.amount);
      return groups;
    }, {}),
  )
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
    }))
    .sort((left, right) => right.value - left.value);
}

export function getDailyTrend(expenses) {
  const byDay = expenses.reduce((groups, expense) => {
    groups[expense.date] = (groups[expense.date] || 0) + Number(expense.amount);
    return groups;
  }, {});

  return Object.entries(byDay)
    .sort(([left], [right]) => new Date(left) - new Date(right))
    .map(([date, total]) => {
      const isoDate = date;
      return {
        date: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        isoDate,
        total,
      };
    });
}

export function getExpensesForPeriod(expenses, period, customRange) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return expenses
    .filter((expense) => {
      const expenseDate = new Date(`${expense.date}T00:00:00`);

      if (period === 'current-month') {
        return (
          expenseDate.getMonth() === today.getMonth() &&
          expenseDate.getFullYear() === today.getFullYear()
        );
      }

      if (period === 'last-90-days') {
        const start = new Date(today);
        start.setDate(start.getDate() - 89);
        return expenseDate >= start && expenseDate <= today;
      }

      if (period === 'this-year') {
        return expenseDate.getFullYear() === today.getFullYear();
      }

      if (period === 'custom') {
        const start = customRange?.start ? new Date(`${customRange.start}T00:00:00`) : null;
        const end = customRange?.end ? new Date(`${customRange.end}T23:59:59`) : null;

        if (start && expenseDate < start) {
          return false;
        }

        if (end && expenseDate > end) {
          return false;
        }

        return Boolean(start || end);
      }

      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
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

  const match = PERIOD_OPTIONS.find((option) => option.value === period);
  return match?.label || 'Selected period';
}

export function getBudgetRemainingPercent(remaining, budget) {
  if (budget <= 0) {
    return 0;
  }

  return Math.max((remaining / budget) * 100, 0);
}

export function getBudgetProgressTone(percentSpent) {
  if (percentSpent < 60) {
    return 'from-green-400 via-green-400 to-lime-300';
  }

  if (percentSpent < 85) {
    return 'from-green-400 via-yellow-400 to-amber-400';
  }

  return 'from-yellow-400 via-orange-400 to-red-400';
}

export function getTopCategories(expenses, limit = 3) {
  return getCategoryBreakdown(expenses).slice(0, limit);
}

export function formatLongDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getDateRangeMeta(expenses) {
  if (expenses.length === 0) {
    return {
      daysCovered: 0,
      startDate: null,
      endDate: null,
    };
  }

  const dates = expenses
    .map((expense) => new Date(`${expense.date}T00:00:00`))
    .sort((left, right) => left - right);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysCovered = Math.floor((endDate - startDate) / millisecondsPerDay) + 1;

  return {
    daysCovered,
    startDate: dates[0].toISOString().slice(0, 10),
    endDate: dates[dates.length - 1].toISOString().slice(0, 10),
  };
}

export function getMonthLabel() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}
