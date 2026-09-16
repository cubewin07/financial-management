import {
  format,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfMonth,
  subDays,
  differenceInCalendarDays,
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
  '#d0bcff',
  '#00eefc',
  '#f15999',
  '#9f78ff',
  '#d3fbff',
  '#ffb0ca',
];

export const CHART_COLOR_PALETTE = ['#d0bcff', '#00eefc', '#f15999', '#9f78ff', '#d3fbff', '#ffb0ca'];

const CATEGORY_COLOR_OVERRIDES = {
  food: '#00eefc',
  transport: '#d0bcff',
  health: '#f15999',
  entertainment: '#9f78ff',
  groceries: '#00eefc',
  bills: '#d3fbff',
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

export function formatCurrency(value, currency = 'NZD', locale = 'en-NZ') {
  const numericValue = Number(value || 0);

  try {
    return new Intl.NumberFormat(locale || 'en-NZ', {
      style: 'currency',
      currency: currency || 'NZD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch (e) {
    return `NZ$${numericValue.toFixed(2)}`;
  }
}

/**
 * Formats raw byte counts into dynamic, exact MB representations (e.g., '0.24 MB', '1.5 MB', '0 MB').
 */
export function formatStorageMb(bytes) {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01) return '< 0.01 MB';
  if (mb < 0.1) return `${mb.toFixed(2)} MB`;
  if (mb < 10) {
    const fixed2 = mb.toFixed(2);
    if (fixed2.endsWith('.00')) return `${mb.toFixed(0)} MB`;
    if (fixed2.endsWith('0')) return `${mb.toFixed(1)} MB`;
    return `${fixed2} MB`;
  }
  return `${mb.toFixed(1)} MB`;
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
  return getCategoryBreakdown(expenses).map((item) => ({
    ...item,
    color: getCategoryColor(item.name),
  }));
}

export function getDailyTrend(expenses = [], period = 'current-month', customRange = null, allExpenses = []) {
  const now = new Date();
  let startDate, endDate;

  if (period === 'current-month') {
    startDate = startOfMonth(now);
    endDate = now;
  } else if (period === 'last-90-days') {
    startDate = subDays(now, 89);
    endDate = now;
  } else if (period === 'this-year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = now;
  } else if (period === 'custom' && customRange?.start && customRange?.end) {
    startDate = parseISO(customRange.start);
    endDate = parseISO(customRange.end);
  } else {
    const meta = getDateRangeMeta(expenses);
    startDate = meta.startDate ? parseISO(meta.startDate) : startOfMonth(now);
    endDate = meta.endDate ? parseISO(meta.endDate) : now;
  }

  // Create lookup for expenses by isoDate
  const spendingByDay = expenses.reduce((groups, expense) => {
    groups[expense.date] = roundCurrency(Number(groups[expense.date] || 0) + Number(expense.amount || 0));
    return groups;
  }, {});

  // Generate zero-filled date series
  const actualTrend = [];
  let curr = new Date(startDate);
  while (curr <= endDate) {
    const isoDate = format(curr, 'yyyy-MM-dd');
    const displayDate = format(curr, 'MMM d');
    actualTrend.push({
      date: displayDate,
      isoDate,
      total: spendingByDay[isoDate] || 0,
    });
    curr = new Date(curr.setDate(curr.getDate() + 1));
  }

  // Compute ghost trend (previous month cumulative pace up to day N)
  let previousMonthTrend = [];
  if (period === 'current-month') {
    const prevMonthDate = subDays(startOfMonth(now), 1);
    const prevMonthStart = startOfMonth(prevMonthDate);
    const daysInPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const currentDayNum = now.getDate();

    const pool = allExpenses.length > 0 ? allExpenses : expenses;
    const prevMonthExpenses = pool.filter((e) => e.date?.startsWith(format(prevMonthStart, 'yyyy-MM')));

    const prevSpendingByDay = prevMonthExpenses.reduce((acc, exp) => {
      acc[exp.date] = roundCurrency((acc[exp.date] || 0) + Number(exp.amount || 0));
      return acc;
    }, {});

    let runningPrevTotal = 0;
    const maxDays = Math.min(currentDayNum + 5, daysInPrevMonth);
    for (let day = 1; day <= maxDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const isoDate = `${format(prevMonthStart, 'yyyy-MM')}-${dayStr}`;
      runningPrevTotal = roundCurrency(runningPrevTotal + (prevSpendingByDay[isoDate] || 0));
      
      // Calculate matching day offset in current month for alignment on X-axis
      const currentMonthDayDate = new Date(now.getFullYear(), now.getMonth(), day);
      previousMonthTrend.push({
        date: format(currentMonthDayDate, 'MMM d'),
        dayNumber: day,
        total: runningPrevTotal,
      });
    }
  }

  return { actualTrend, previousMonthTrend };
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

  return {
    daysCovered: differenceInCalendarDays(endDate, startDate) + 1,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

export function getMonthLabel(date = new Date()) {
  return format(startOfMonth(date), 'MMMM yyyy');
}

export function getMonthOverMonthDelta(snapshots, currentMonthKey, expenses = []) {
  const currentKey = currentMonthKey || format(new Date(), 'yyyy-MM');
  const now = new Date();
  const currentDayNum = now.getDate();

  // Like-for-like comparison up to day N if expenses are available
  if (expenses && expenses.length > 0) {
    const currentMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentKey));
    const currentTotal = roundCurrency(currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0));

    const prevMonthDate = subDays(startOfMonth(parseISO(`${currentKey}-01`)), 1);
    const prevKey = format(prevMonthDate, 'yyyy-MM');
    const dayStr = String(currentDayNum).padStart(2, '0');
    const prevCutoffIso = `${prevKey}-${dayStr}`;

    const prevMonthExpensesCutoff = expenses.filter((e) => {
      return e.date?.startsWith(prevKey) && e.date <= prevCutoffIso;
    });

    if (prevMonthExpensesCutoff.length > 0) {
      const prevTotal = roundCurrency(prevMonthExpensesCutoff.reduce((sum, e) => sum + Number(e.amount || 0), 0));
      if (prevTotal > 0) {
        const deltaValue = roundCurrency(currentTotal - prevTotal);
        const deltaPercent = Math.round((deltaValue / prevTotal) * 100);
        return {
          value: deltaValue,
          percent: deltaPercent,
          isIncrease: deltaValue > 0,
          isDecrease: deltaValue < 0,
          comparedDays: currentDayNum,
        };
      }
    }
  }

  if (!snapshots || snapshots.length === 0) return null;
  const nowKey = currentMonthKey || format(new Date(), 'yyyy-MM');
  const nowISO = parseISO(`${nowKey}-01`);
  const prevMonth = subDays(startOfMonth(nowISO), 1);
  const prevKey = format(prevMonth, 'yyyy-MM');

  const currentSnapshot = snapshots.find((s) => s.month === nowKey);
  const prevSnapshot = snapshots.find((s) => s.month === prevKey);

  if (!prevSnapshot || !prevSnapshot.total_spent) return null;

  const currentTotal = currentSnapshot ? currentSnapshot.total_spent : 0;
  const prevTotal = prevSnapshot.total_spent;

  const deltaValue = currentTotal - prevTotal;
  const deltaPercent = Math.round((deltaValue / prevTotal) * 100);

  return {
    value: deltaValue,
    percent: deltaPercent,
    isIncrease: deltaValue > 0,
    isDecrease: deltaValue < 0,
  };
}

export function getProjectedDailyTrend(actualTrend) {
  if (!actualTrend || actualTrend.length === 0) return [];

  const today = new Date();
  const todayIso = format(today, 'yyyy-MM-dd');
  const lastTrendDate = parseISO(actualTrend[actualTrend.length - 1].isoDate);

  if (!isSameMonth(lastTrendDate, today)) {
    return [];
  }

  let totalSpent = 0;

  for (const item of actualTrend) {
    if (isBefore(parseISO(item.isoDate), today) || item.isoDate === todayIso) {
      totalSpent += item.total;
    }
  }

  const daysPassed = today.getDate();
  if (daysPassed === 0) return [];

  const dailyAvg = totalSpent / daysPassed;
  const projectedTrend = [];

  const endOfMonthDate = parseISO(
    format(today, 'yyyy-MM-') +
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
  );

  let currentProjectedTotal = totalSpent;
  let currentProjDate = today;

  projectedTrend.push({
    date: format(today, 'MMM d'),
    isoDate: format(today, 'yyyy-MM-dd'),
    total: currentProjectedTotal,
  });

  while (isBefore(currentProjDate, endOfMonthDate)) {
    currentProjDate = new Date(currentProjDate.setDate(currentProjDate.getDate() + 1));
    currentProjectedTotal += dailyAvg;

    projectedTrend.push({
      date: format(currentProjDate, 'MMM d'),
      isoDate: format(currentProjDate, 'yyyy-MM-dd'),
      total: currentProjectedTotal,
    });
  }

  return projectedTrend;
}

export function getTotalAccountBalance(accounts = [], currency = 'NZD') {
  let totalBalance = 0;
  let excludedCount = 0;

  for (const account of accounts) {
    const accountCurrency = account.currency || 'NZD';
    if (accountCurrency === currency) {
      totalBalance += Number(account.balance || 0);
    } else {
      excludedCount++;
    }
  }

  return {
    totalBalance: roundCurrency(totalBalance),
    excludedCount,
    reportString: `${formatCurrency(totalBalance, currency)} (Excluded ${excludedCount} non-${currency} accounts)`,
  };
}

export function getGoalProgress(goal) {
  if (!goal) return { rawValue: 0, clampedRenderPercent: 0 };
  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 0);

  if (target <= 0) {
    const rawValue = current > 0 ? 100 : 0;
    return { rawValue, clampedRenderPercent: rawValue };
  }

  const rawValue = (current / target) * 100;
  const clampedRenderPercent = Math.min(Math.max(rawValue, 0), 100);

  return { rawValue, clampedRenderPercent };
}

export function getYearlySavingsProgress({ goalAmount, carriedOver, totalSpent, monthIndex }) {
  const goal = Number(goalAmount || 0);
  const saved = Number(carriedOver || 0);

  if (goal <= 0) return { rawValue: 0, clampedRenderPercent: 0, isTracked: false };

  const rawValue = (saved / goal) * 100;
  const clampedRenderPercent = Math.min(Math.max(rawValue, 0), 100);

  return {
    rawValue,
    clampedRenderPercent,
    isTracked: true,
  };
}

export function getCategoryBudgetImpact({ spent, monthlyLimit }) {
  const spendNum = Number(spent || 0);
  const limitNum = Number(monthlyLimit || 0);

  const utilization = limitNum > 0 ? (spendNum / limitNum) * 100 : null;
  const remaining = limitNum - spendNum;

  return {
    utilization,
    remaining: roundCurrency(remaining),
  };
}

export function getDailyBurnRate(expenses = [], period = null) {
  const totalSpent = roundCurrency(
    expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  );

  let daysCovered = 1;
  const now = new Date();
  if (period === 'current-month') {
    daysCovered = Math.max(1, now.getDate());
  } else {
    const rangeMeta = getDateRangeMeta(expenses);
    daysCovered = rangeMeta.daysCovered > 0 ? rangeMeta.daysCovered : Math.max(1, now.getDate());
  }

  const dailyAvg = roundCurrency(totalSpent / daysCovered);

  return {
    dailyAvg,
    daysCovered,
    totalSpent,
  };
}

export function getCategoryHealthAlerts(expenses = [], categoryLimits = null, allExpenses = []) {
  const breakdown = getCategoryBreakdown(expenses);

  const trailing3MonthAvgs = {};
  if (allExpenses && allExpenses.length > 0) {
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const pastExpenses = allExpenses.filter((e) => e.date && e.date.slice(0, 7) < currentMonthKey);
    const months = Array.from(new Set(pastExpenses.map((e) => e.date.slice(0, 7)))).sort().slice(-3);
    const monthsCount = Math.max(1, months.length);

    const totalsByCat = pastExpenses.reduce((acc, exp) => {
      if (months.includes(exp.date.slice(0, 7))) {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
      }
      return acc;
    }, {});

    Object.entries(totalsByCat).forEach(([cat, sum]) => {
      trailing3MonthAvgs[cat] = roundCurrency(sum / monthsCount);
    });
  }
  
  const items = breakdown.map((item) => {
    const limit = categoryLimits?.[item.name] || null;
    const hasLimit = limit !== null && limit > 0;
    const utilization = hasLimit ? roundCurrency((item.value / limit) * 100) : null;
    const isOverBudget = hasLimit && item.value > limit;
    const isWarning = hasLimit && utilization >= 80 && !isOverBudget;

    const trailingAvg = trailing3MonthAvgs[item.name] || null;
    let trailingDeltaPercent = null;
    if (trailingAvg && trailingAvg > 0) {
      trailingDeltaPercent = Math.round(((item.value - trailingAvg) / trailingAvg) * 100);
    }

    return {
      ...item,
      limit,
      hasLimit,
      utilization,
      isOverBudget,
      isWarning,
      trailingAvg,
      trailingDeltaPercent,
    };
  });

  items.sort((a, b) => {
    if (a.hasLimit && b.hasLimit) {
      return (b.utilization || 0) - (a.utilization || 0);
    }
    if (a.hasLimit) return -1;
    if (b.hasLimit) return 1;
    return b.value - a.value;
  });

  const alertCount = items.filter((i) => i.isOverBudget || i.isWarning).length;
  const topCategory = breakdown.length > 0 ? breakdown[0] : null;

  return {
    items,
    alertCount,
    topCategory,
  };
}

export function getFixedVsDiscretionarySplit(expenses = [], subscriptions = []) {
  const subCategories = new Set(subscriptions.map((s) => s.category?.toLowerCase() || 'bills'));
  const DEFAULT_FIXED_CATEGORIES = new Set(['bills', 'subscriptions', 'utilities', 'rent', 'insurance', 'health', 'housing']);

  let fixedTotal = 0;
  let discretionaryTotal = 0;

  for (const exp of expenses) {
    const catLower = (exp.category || '').toLowerCase();
    const amount = Number(exp.amount || 0);
    if (DEFAULT_FIXED_CATEGORIES.has(catLower) || subCategories.has(catLower)) {
      fixedTotal += amount;
    } else {
      discretionaryTotal += amount;
    }
  }

  const grandTotal = fixedTotal + discretionaryTotal;
  const fixedPercent = grandTotal > 0 ? Math.round((fixedTotal / grandTotal) * 100) : 0;
  const discretionaryPercent = grandTotal > 0 ? 100 - fixedPercent : 0;

  return {
    fixedTotal: roundCurrency(fixedTotal),
    discretionaryTotal: roundCurrency(discretionaryTotal),
    fixedPercent,
    discretionaryPercent,
  };
}

export function getDayOfWeekPattern(expenses = []) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totalsByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

  for (const exp of expenses) {
    if (!exp.date) continue;
    const dateObj = parseISO(exp.date);
    let dayIndex = dateObj.getDay() - 1; // 0=Sun, so -1 makes Mon=0
    if (dayIndex < 0) dayIndex = 6;
    const dayName = days[dayIndex];
    totalsByDay[dayName] = roundCurrency((totalsByDay[dayName] || 0) + Number(exp.amount || 0));
  }

  const grandTotal = Object.values(totalsByDay).reduce((a, b) => a + b, 0);

  return days.map((day) => ({
    day,
    total: totalsByDay[day],
    percent: grandTotal > 0 ? Math.round((totalsByDay[day] / grandTotal) * 100) : 0,
  }));
}

export function getExpenseStats(expenses = []) {
  if (!expenses || expenses.length === 0) {
    return {
      count: 0,
      median: 0,
      average: 0,
      maxTransaction: null,
    };
  }

  const sortedByAmount = [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  const maxTransaction = sortedByAmount[0]
    ? {
        amount: Number(sortedByAmount[0].amount || 0),
        category: sortedByAmount[0].category || 'Other',
        note: sortedByAmount[0].note || '',
        date: sortedByAmount[0].date || '',
      }
    : null;

  const amounts = expenses.map((e) => Number(e.amount || 0)).sort((a, b) => a - b);
  const count = amounts.length;
  const total = amounts.reduce((sum, val) => sum + val, 0);
  const average = roundCurrency(total / count);

  let median = 0;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = roundCurrency((amounts[mid - 1] + amounts[mid]) / 2);
  } else {
    median = roundCurrency(amounts[mid]);
  }

  return {
    count,
    median,
    average,
    maxTransaction,
  };
}

export function getWeekdayVsWeekendSplit(expenses = []) {
  let weekdayTotal = 0;
  let weekendTotal = 0;

  for (const exp of expenses) {
    if (!exp.date) continue;
    const dateObj = parseISO(exp.date);
    const day = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const amount = Number(exp.amount || 0);

    if (day === 0 || day === 6) {
      weekendTotal += amount;
    } else {
      weekdayTotal += amount;
    }
  }

  const grandTotal = weekdayTotal + weekendTotal;
  const weekdayPercent = grandTotal > 0 ? Math.round((weekdayTotal / grandTotal) * 100) : 0;
  const weekendPercent = grandTotal > 0 ? 100 - weekdayPercent : 0;

  return {
    weekdayTotal: roundCurrency(weekdayTotal),
    weekendTotal: roundCurrency(weekendTotal),
    weekdayPercent,
    weekendPercent,
  };
}

export function getWeekOverWeekBreakdown(expenses = []) {
  const weeks = [
    { label: 'Week 1 (1-7)', total: 0 },
    { label: 'Week 2 (8-14)', total: 0 },
    { label: 'Week 3 (15-21)', total: 0 },
    { label: 'Week 4 (22-28)', total: 0 },
    { label: 'Week 5 (29+)', total: 0 },
  ];

  for (const exp of expenses) {
    if (!exp.date) continue;
    const dayOfMonth = parseISO(exp.date).getDate();
    const amount = Number(exp.amount || 0);

    if (dayOfMonth <= 7) weeks[0].total += amount;
    else if (dayOfMonth <= 14) weeks[1].total += amount;
    else if (dayOfMonth <= 21) weeks[2].total += amount;
    else if (dayOfMonth <= 28) weeks[3].total += amount;
    else weeks[4].total += amount;
  }

  // Filter out Week 5 if zero to keep clean UI
  const filteredWeeks = weeks.filter((w, idx) => idx < 4 || w.total > 0).map((w) => ({
    ...w,
    total: roundCurrency(w.total),
  }));

  const maxWeekSpend = Math.max(...filteredWeeks.map((w) => w.total), 1);

  return filteredWeeks.map((w) => ({
    ...w,
    percent: Math.round((w.total / maxWeekSpend) * 100),
  }));
}

export function getCategorySideBySideComparison(expenses = [], period = 'current-month', customRange = null, allExpenses = []) {
  const pool = allExpenses.length > 0 ? allExpenses : expenses;
  let previousExpenses = [];

  const now = new Date();
  if (period === 'current-month') {
    const prevMonthDate = subDays(startOfMonth(now), 1);
    const prevKey = format(prevMonthDate, 'yyyy-MM');
    previousExpenses = pool.filter((e) => e.date?.startsWith(prevKey));
  } else if (period === 'last-90-days') {
    const startPrev = subDays(now, 179);
    const endPrev = subDays(now, 90);
    previousExpenses = pool.filter((e) => {
      const d = parseISO(e.date);
      return !isBefore(d, startPrev) && !isAfter(d, endPrev);
    });
  } else if (period === 'this-year') {
    const prevYearStr = String(now.getFullYear() - 1);
    previousExpenses = pool.filter((e) => e.date?.startsWith(prevYearStr));
  } else if (period === 'custom' && customRange?.start && customRange?.end) {
    const start = parseISO(customRange.start);
    const end = parseISO(customRange.end);
    const diffDays = differenceInCalendarDays(end, start) + 1;
    const startPrev = subDays(start, diffDays);
    const endPrev = subDays(start, 1);
    previousExpenses = pool.filter((e) => {
      const d = parseISO(e.date);
      return !isBefore(d, startPrev) && !isAfter(d, endPrev);
    });
  }

  const currentMap = {};
  for (const exp of expenses) {
    currentMap[exp.category] = (currentMap[exp.category] || 0) + Number(exp.amount || 0);
  }

  const prevMap = {};
  for (const exp of previousExpenses) {
    prevMap[exp.category] = (prevMap[exp.category] || 0) + Number(exp.amount || 0);
  }

  const allCategories = Array.from(new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]));
  const currentTotal = Object.values(currentMap).reduce((a, b) => a + b, 0);

  const comparisonItems = allCategories.map((cat) => {
    const currentVal = roundCurrency(currentMap[cat] || 0);
    const prevVal = roundCurrency(prevMap[cat] || 0);
    const diffVal = roundCurrency(currentVal - prevVal);
    let diffPercent = null;
    if (prevVal > 0) {
      diffPercent = Math.round((diffVal / prevVal) * 100);
    } else if (currentVal > 0) {
      diffPercent = 100;
    } else {
      diffPercent = 0;
    }

    const shareOfTotal = currentTotal > 0 ? roundCurrency((currentVal / currentTotal) * 100) : 0;

    return {
      name: cat,
      currentVal,
      prevVal,
      diffVal,
      diffPercent,
      shareOfTotal,
      color: getCategoryColor(cat),
    };
  });

  comparisonItems.sort((a, b) => b.currentVal - a.currentVal || b.prevVal - a.prevVal);

  return comparisonItems;
}



