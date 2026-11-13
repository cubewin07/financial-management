import {
  addDays,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  differenceInCalendarDays,
  isValid,
} from 'date-fns';

function toFiniteAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function parseExpenseDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return isValid(dateValue) ? startOfDay(dateValue) : null;
  }
  if (typeof dateValue !== 'string') return null;
  const trimmed = dateValue.trim();
  if (!trimmed) return null;
  const isoDay = /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : trimmed;
  const parsed = parseISO(isoDay);
  return isValid(parsed) ? startOfDay(parsed) : null;
}

export function getLocalDateString(d = new Date()) {
  if (!d) return format(new Date(), 'yyyy-MM-dd');
  if (typeof d === 'string') {
    const parsed = parseISO(d);
    return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : d;
  }
  return isValid(d) ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
}

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
  groceries: '#ffb0ca',
  bills: '#d3fbff',
};

export function roundCurrency(value) {
  const num = toFiniteAmount(value);
  const sign = num < 0 ? -1 : 1;
  const rounded = (sign * Math.round((Math.abs(num) + Number.EPSILON) * 100)) / 100;
  return rounded === 0 ? 0 : rounded;
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
  } catch {
    return `NZ$${numericValue.toFixed(2)}`;
  }
}

/** Short amount for tight spaces, such as 7-column mobile charts ($950, $1.2K). */
export function formatCompactCurrency(value, currency = 'NZD', locale = 'en-NZ') {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'NZD',
      notation: 'compact',
      maximumFractionDigits: Math.abs(amount) >= 1000 ? 1 : 0,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency, locale);
  }
}

export function getCurrencySymbol(currency = 'NZD', locale = 'en-NZ') {
  try {
    const parts = new Intl.NumberFormat(locale || 'en-NZ', {
      style: 'currency',
      currency: currency || 'NZD',
    }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    return symbolPart ? symbolPart.value : '$';
  } catch {
    return '$';
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
  return [...(expenses || [])].sort((left, right) => {
    const rightDate = parseExpenseDate(right?.date);
    const leftDate = parseExpenseDate(left?.date);
    const rightTime = rightDate ? rightDate.getTime() : 0;
    const leftTime = leftDate ? leftDate.getTime() : 0;

    if (rightTime === leftTime) {
      const rightCreated = new Date(right?.created_at || 0).getTime();
      const leftCreated = new Date(left?.created_at || 0).getTime();
      return (Number.isFinite(rightCreated) ? rightCreated : 0) - (Number.isFinite(leftCreated) ? leftCreated : 0);
    }

    return rightTime - leftTime;
  });
}

export function getCurrentMonthExpenses(expenses = []) {
  const now = new Date();

  return sortExpenses(
    (expenses || []).filter((expense) => {
      const parsed = parseExpenseDate(expense?.date);
      return parsed !== null && isSameMonth(parsed, now);
    }),
  );
}

export const PERIOD_OPTIONS = [
  { value: 'current-month', label: 'This month' },
  { value: 'last-90-days', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
  { value: 'all-time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

// Reviewer report has no date picker, so the custom range option is not offered.
export const REVIEWER_PERIOD_OPTIONS = PERIOD_OPTIONS.filter((option) => option.value !== 'custom');

// Builds CustomSelect `options` ("All Categories" + each unique category present in the expenses).
export function getCategoryFilterOptions(expenses = []) {
  const categories = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));
  return [
    { value: 'all', label: 'All Categories' },
    ...categories.map((category) => ({ value: category, label: category })),
  ];
}

// Virtual rows generated from subscriptions have no row in `expenses`, so they cannot hold comments.
export function isRecurringExpense(expense) {
  return Boolean(expense?.subscription_id) || String(expense?.id ?? '').startsWith('sub-exp-');
}

// Each goal counts only up to its own target, so over-funding one cannot hide another goal's shortfall.
export function getGoalsTotals(goals = []) {
  let saved = 0;
  let target = 0;
  let cappedSaved = 0;

  for (const goal of goals || []) {
    const goalSaved = Math.max(0, Number(goal?.current_amount) || 0);
    const goalTarget = Math.max(0, Number(goal?.target_amount) || 0);
    saved += goalSaved;
    target += goalTarget;
    cappedSaved += Math.min(goalSaved, goalTarget);
  }

  return {
    saved: roundCurrency(saved),
    target: roundCurrency(target),
    remaining: roundCurrency(target - cappedSaved),
    percent: target > 0 ? Math.round((cappedSaved / target) * 100) : 0,
  };
}

export function getFinanceSummary(expenses = [], budget = 0) {
  const list = Array.isArray(expenses) ? expenses : [];
  const budgetNum = toFiniteAmount(budget);
  const totalSpent = roundCurrency(
    list.reduce((sum, expense) => sum + toFiniteAmount(expense?.amount), 0),
  );
  const remaining = roundCurrency(budgetNum - totalSpent);
  const percentSpent = budgetNum <= 0 ? 0 : Math.max((totalSpent / budgetNum) * 100, 0);

  return {
    totalSpent,
    remaining,
    percentSpent,
    transactionCount: list.length,
  };
}

/**
 * Computes the total budget scaled across the selected period while using
 * `effectiveBudget` (which includes carry-over top-ups) only for the current month.
 */
export function computePeriodBudget({
  period = 'current-month',
  monthlyBudget = 0,
  effectiveBudget = null,
  customRange = null,
  monthsCount = 1,
  now = new Date(),
} = {}) {
  const baseMonthly = toFiniteAmount(monthlyBudget);
  const activeMonthly =
    effectiveBudget !== null && effectiveBudget !== undefined
      ? toFiniteAmount(effectiveBudget)
      : baseMonthly;
  const refNow = now instanceof Date && isValid(now) ? now : new Date();

  if (period === 'current-month') {
    return roundCurrency(activeMonthly);
  }
  if (period === 'last-90-days') {
    return roundCurrency(baseMonthly * 3);
  }
  if (period === 'this-year') {
    return roundCurrency(baseMonthly * (refNow.getMonth() + 1));
  }
  if (period === 'custom') {
    const startDate = customRange?.start ? parseExpenseDate(customRange.start) : null;
    const endDate = customRange?.end ? parseExpenseDate(customRange.end) : null;
    if (startDate && endDate) {
      const diffDays = Math.max(0, differenceInCalendarDays(endDate, startDate)) + 1;
      return roundCurrency(baseMonthly * Math.max(1, diffDays / 30));
    }
    if (startDate) {
      const diffDays = Math.max(0, differenceInCalendarDays(startOfDay(refNow), startDate)) + 1;
      return roundCurrency(baseMonthly * Math.max(1, diffDays / 30));
    }
    return roundCurrency(baseMonthly);
  }

  const safeMonths = Number.isFinite(Number(monthsCount)) ? Math.max(1, Number(monthsCount)) : 1;
  return roundCurrency(baseMonthly * safeMonths);
}

export function getCategoryBreakdown(expenses = []) {
  return Object.entries(
    (expenses || []).reduce((groups, expense) => {
      const cat = expense?.category || 'Other';
      groups[cat] = roundCurrency(
        toFiniteAmount(groups[cat]) + toFiniteAmount(expense?.amount),
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

export function getDailyTrend(expenses = [], period = 'current-month', customRange = null, allExpenses = [], nowInput = new Date()) {
  const now = nowInput instanceof Date && isValid(nowInput) ? nowInput : new Date();
  const todayStart = startOfDay(now);
  let startDate, endDate;

  if (period === 'current-month') {
    startDate = startOfMonth(todayStart);
    endDate = todayStart;
  } else if (period === 'last-90-days') {
    startDate = subDays(todayStart, 89);
    endDate = todayStart;
  } else if (period === 'this-year') {
    startDate = new Date(todayStart.getFullYear(), 0, 1);
    endDate = todayStart;
  } else if (period === 'custom' && customRange?.start && customRange?.end) {
    startDate = parseExpenseDate(customRange.start);
    endDate = parseExpenseDate(customRange.end);
    if (!startDate || !endDate) {
      startDate = startOfMonth(todayStart);
      endDate = todayStart;
    }
  } else {
    const meta = getDateRangeMeta(expenses);
    startDate = (meta.startDate && parseExpenseDate(meta.startDate)) || startOfMonth(todayStart);
    endDate = (meta.endDate && parseExpenseDate(meta.endDate)) || todayStart;
  }

  // Create lookup for expenses by isoDate
  const spendingByDay = (expenses || []).reduce((groups, expense) => {
    const parsed = parseExpenseDate(expense?.date);
    if (!parsed) return groups;
    const key = format(parsed, 'yyyy-MM-dd');
    groups[key] = roundCurrency(toFiniteAmount(groups[key]) + toFiniteAmount(expense?.amount));
    return groups;
  }, {});

  // Generate zero-filled date series
  const actualTrend = [];
  let curr = startOfDay(startDate);
  const end = startOfDay(endDate);
  while (curr <= end) {
    const isoDate = format(curr, 'yyyy-MM-dd');
    const displayDate = format(curr, 'MMM d');
    actualTrend.push({
      date: displayDate,
      isoDate,
      total: spendingByDay[isoDate] || 0,
    });
    curr = addDays(curr, 1);
  }

  // Compute ghost trend (previous month cumulative pace up to day N)
  let previousMonthTrend = [];
  if (period === 'current-month') {
    const prevMonthDate = subDays(startOfMonth(now), 1);
    const prevMonthStart = startOfMonth(prevMonthDate);
    const prevMonthPrefix = format(prevMonthStart, 'yyyy-MM');
    const daysInPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDayNum = now.getDate();

    const pool = (allExpenses && allExpenses.length > 0) ? allExpenses : (expenses || []);
    const prevSpendingByDay = pool.reduce((acc, exp) => {
      const parsed = parseExpenseDate(exp?.date);
      if (!parsed) return acc;
      const isoKey = format(parsed, 'yyyy-MM-dd');
      if (isoKey.startsWith(prevMonthPrefix)) {
        acc[isoKey] = roundCurrency(toFiniteAmount(acc[isoKey]) + toFiniteAmount(exp?.amount));
      }
      return acc;
    }, {});

    let runningPrevTotal = 0;
    const maxDays = Math.min(currentDayNum + 5, daysInPrevMonth, daysInCurrentMonth);
    for (let day = 1; day <= maxDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const isoDate = `${prevMonthPrefix}-${dayStr}`;
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

export function getExpensesForPeriod(expenses = [], period, customRange) {
  const now = new Date();
  const today = startOfDay(now);

  return sortExpenses(
    (expenses || []).filter((expense) => {
      const expenseDate = parseExpenseDate(expense?.date);
      if (!expenseDate) return false;

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
        const start = customRange?.start ? parseExpenseDate(customRange.start) : null;
        const end = customRange?.end ? parseExpenseDate(customRange.end) : null;

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
  const budgetNum = toFiniteAmount(budget);
  const remainingNum = toFiniteAmount(remaining);
  if (budgetNum <= 0) {
    return 0;
  }

  return Math.max((remainingNum / budgetNum) * 100, 0);
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
  const parsed = parseExpenseDate(date);
  return parsed ? format(parsed, 'MMM d, yyyy') : '—';
}

export function formatShortDate(date) {
  const parsed = parseExpenseDate(date);
  return parsed ? format(parsed, 'MMM d') : '—';
}

export function formatMonthLabel(month) {
  if (!month || typeof month !== 'string') return '—';
  const normalized = /^\d{4}-\d{2}$/.test(month.trim()) ? `${month.trim()}-01` : month.trim();
  const parsed = parseExpenseDate(normalized);
  return parsed ? format(parsed, 'MMMM yyyy') : '—';
}

export function getDateRangeMeta(expenses = []) {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {
      daysCovered: 0,
      startDate: null,
      endDate: null,
    };
  }

  const validDates = expenses
    .map((expense) => parseExpenseDate(expense?.date))
    .filter(Boolean)
    .sort((left, right) => left.getTime() - right.getTime());

  if (validDates.length === 0) {
    return {
      daysCovered: 0,
      startDate: null,
      endDate: null,
    };
  }

  const startDate = validDates[0];
  const endDate = validDates[validDates.length - 1];

  return {
    daysCovered: Math.max(1, differenceInCalendarDays(endDate, startDate) + 1),
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

export function getMonthLabel(date = new Date()) {
  const parsed = date instanceof Date ? (isValid(date) ? date : new Date()) : (parseExpenseDate(date) || new Date());
  return format(startOfMonth(parsed), 'MMMM yyyy');
}

export function getMonthOverMonthDelta(snapshots, currentMonthKey, expenses = []) {
  const currentKey = currentMonthKey || format(new Date(), 'yyyy-MM');
  const currentMonthDate = parseExpenseDate(`${currentKey}-01`);
  if (!currentMonthDate) return null;
  const now = new Date();
  const currentDayNum = now.getDate();

  // Like-for-like comparison up to day N if expenses are available
  if (expenses && expenses.length > 0) {
    const currentMonthExpenses = expenses.filter((e) => {
      const parsed = parseExpenseDate(e?.date);
      return parsed && format(parsed, 'yyyy-MM') === currentKey;
    });
    const currentTotal = roundCurrency(
      currentMonthExpenses.reduce((sum, e) => sum + toFiniteAmount(e?.amount), 0),
    );

    const prevMonthDate = subDays(startOfMonth(currentMonthDate), 1);
    const prevKey = format(prevMonthDate, 'yyyy-MM');
    const dayStr = String(currentDayNum).padStart(2, '0');
    const prevCutoffIso = `${prevKey}-${dayStr}`;

    const prevMonthExpensesCutoff = expenses.filter((e) => {
      const parsed = parseExpenseDate(e?.date);
      if (!parsed) return false;
      const iso = format(parsed, 'yyyy-MM-dd');
      return iso.startsWith(prevKey) && iso <= prevCutoffIso;
    });

    if (prevMonthExpensesCutoff.length > 0) {
      const prevTotal = roundCurrency(
        prevMonthExpensesCutoff.reduce((sum, e) => sum + toFiniteAmount(e?.amount), 0),
      );
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

    // No like-for-like figures yet: a part month cannot be compared with a full snapshot.
    return null;
  }

  if (!snapshots || snapshots.length === 0) return null;
  const prevMonth = subDays(startOfMonth(currentMonthDate), 1);
  const prevKey = format(prevMonth, 'yyyy-MM');

  const currentSnapshot = snapshots.find((s) => s.month === currentKey);
  const prevSnapshot = snapshots.find((s) => s.month === prevKey);

  if (!prevSnapshot || !prevSnapshot.total_spent) return null;

  const currentTotal = currentSnapshot ? toFiniteAmount(currentSnapshot.total_spent) : 0;
  const prevTotal = toFiniteAmount(prevSnapshot.total_spent);
  if (prevTotal <= 0) return null;

  const deltaValue = roundCurrency(currentTotal - prevTotal);
  const deltaPercent = Math.round((deltaValue / prevTotal) * 100);

  return {
    value: deltaValue,
    percent: deltaPercent,
    isIncrease: deltaValue > 0,
    isDecrease: deltaValue < 0,
  };
}

export function getProjectedDailyTrend(actualTrend, recurring = null, nowInput = new Date()) {
  if (!actualTrend || actualTrend.length === 0) return [];

  const today = nowInput instanceof Date && isValid(nowInput) ? nowInput : new Date();
  const todayStart = startOfDay(today);
  const todayIso = format(todayStart, 'yyyy-MM-dd');
  const lastTrendDate = parseExpenseDate(actualTrend[actualTrend.length - 1]?.isoDate);

  if (!lastTrendDate || !isSameMonth(lastTrendDate, todayStart)) {
    return [];
  }

  let totalSpent = 0;

  for (const item of actualTrend) {
    const itemDate = parseExpenseDate(item?.isoDate);
    if (!itemDate) continue;
    const itemIso = format(itemDate, 'yyyy-MM-dd');
    if (isBefore(itemDate, todayStart) || itemIso === todayIso) {
      totalSpent += toFiniteAmount(item?.total);
    }
  }
  totalSpent = roundCurrency(totalSpent);

  const daysPassed = todayStart.getDate();
  if (daysPassed === 0) return [];

  const recurringSpent = toFiniteAmount(recurring?.recurringSpent);
  const upcomingRecurring = toFiniteAmount(recurring?.upcomingRecurring);
  const hasRecurringSplit = recurring !== null && recurring !== undefined;
  const flexSpent = hasRecurringSplit ? Math.max(0, totalSpent - recurringSpent) : totalSpent;
  const dailyAvg = flexSpent / daysPassed;
  const projectedTrend = [];

  const endOfMonthDate = startOfDay(endOfMonth(todayStart));
  const remainingDays = Math.max(0, differenceInCalendarDays(endOfMonthDate, todayStart));
  const dailyUpcomingShare = remainingDays > 0 && hasRecurringSplit ? upcomingRecurring / remainingDays : 0;

  let currentProjectedTotal = totalSpent;
  let currentProjDate = todayStart;

  projectedTrend.push({
    date: format(todayStart, 'MMM d'),
    isoDate: todayIso,
    total: roundCurrency(currentProjectedTotal),
  });

  while (isBefore(currentProjDate, endOfMonthDate)) {
    currentProjDate = addDays(currentProjDate, 1);
    currentProjectedTotal += dailyAvg + dailyUpcomingShare;

    projectedTrend.push({
      date: format(currentProjDate, 'MMM d'),
      isoDate: format(currentProjDate, 'yyyy-MM-dd'),
      total: roundCurrency(currentProjectedTotal),
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

export function getYearlySavingsProgress({ goalAmount, carriedOver }) {
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

export function getDailyBurnRate(expenses = [], period = null, customRange = null) {
  const totalSpent = roundCurrency(
    (expenses || []).reduce((sum, expense) => sum + toFiniteAmount(expense?.amount), 0)
  );

  let daysCovered = 1;
  const now = new Date();
  if (period === 'current-month') {
    daysCovered = Math.max(1, now.getDate());
  } else if (period === 'last-90-days') {
    daysCovered = 90;
  } else if (period === 'this-year') {
    daysCovered = Math.max(1, differenceInCalendarDays(now, new Date(now.getFullYear(), 0, 1)) + 1);
  } else if (period === 'custom' && customRange?.start && customRange?.end) {
    const start = parseExpenseDate(customRange.start);
    const end = parseExpenseDate(customRange.end);
    daysCovered = start && end ? Math.max(1, differenceInCalendarDays(end, start) + 1) : 1;
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

// Pace of the *current calendar month* against the monthly budget. Callers must pass the
// current-month spend only; a 90-day / yearly total would be compared against a monthly cap.
// Pass recurringSpent/upcomingRecurring so bills count once instead of being extrapolated as a daily rate.
export function getMonthPace({
  monthlyBudget = 0,
  monthSpent = 0,
  now = new Date(),
  recurringSpent = 0,
  upcomingRecurring = 0,
} = {}) {
  const budget = roundCurrency(monthlyBudget);
  const spent = roundCurrency(monthSpent);
  const recSpent = roundCurrency(recurringSpent);
  const upRec = roundCurrency(upcomingRecurring);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
  const monthElapsedPercent = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
  const budgetSpentPercent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : null;

  const dailyAvg = currentDay > 0 ? spent / currentDay : 0;
  const flexSpent = Math.max(0, spent - recSpent);
  const flexDailyAvg = currentDay > 0 ? flexSpent / currentDay : 0;
  const projectedEndSpend = roundCurrency(flexDailyAvg * daysInMonth + recSpent + upRec);
  const remaining = roundCurrency(budget - spent);
  const safeDailyAllowance = budget > 0 ? Math.max(0, remaining / daysRemaining) : 0;
  const isPacingOver = budget > 0 && (projectedEndSpend > budget || remaining < 0);

  return {
    monthlyBudget: budget,
    budget,
    monthSpent: spent,
    daysInMonth,
    currentDay,
    daysRemaining,
    monthElapsedPercent,
    budgetSpentPercent,
    dailyAvg,
    flexDailyAvg,
    projectedEndSpend,
    remaining,
    safeDailyAllowance,
    isPacingOver,
  };
}

export function getCategoryHealthAlerts(expenses = [], categoryLimits = null, allExpenses = []) {
  const breakdown = getCategoryBreakdown(expenses);

  const trailing3MonthAvgs = {};
  if (allExpenses && allExpenses.length > 0) {
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const pastExpenses = allExpenses.filter((e) => {
      const parsed = parseExpenseDate(e?.date);
      return parsed && format(parsed, 'yyyy-MM') < currentMonthKey;
    });
    const months = Array.from(
      new Set(pastExpenses.map((e) => format(parseExpenseDate(e.date), 'yyyy-MM')))
    ).sort().slice(-3);
    const monthsCount = Math.max(1, months.length);

    const totalsByCat = pastExpenses.reduce((acc, exp) => {
      const monthKey = format(parseExpenseDate(exp.date), 'yyyy-MM');
      if (months.includes(monthKey)) {
        const cat = exp?.category || 'Other';
        acc[cat] = toFiniteAmount(acc[cat]) + toFiniteAmount(exp?.amount);
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

export function getFixedVsDiscretionarySplit(expenses = []) {
  const DEFAULT_FIXED_CATEGORIES = new Set(['bills', 'subscriptions', 'utilities', 'rent', 'insurance', 'health', 'housing']);

  let fixedTotal = 0;
  let discretionaryTotal = 0;

  for (const exp of expenses) {
    const catLower = (exp.category || '').toLowerCase();
    const amount = Number(exp.amount || 0);
    if (DEFAULT_FIXED_CATEGORIES.has(catLower) || isRecurringExpense(exp)) {
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

  for (const exp of expenses || []) {
    const dateObj = parseExpenseDate(exp?.date);
    if (!dateObj) continue;
    let dayIndex = dateObj.getDay() - 1; // 0=Sun, so -1 makes Mon=0
    if (dayIndex < 0) dayIndex = 6;
    const dayName = days[dayIndex];
    totalsByDay[dayName] = roundCurrency(totalsByDay[dayName] + toFiniteAmount(exp?.amount));
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

export function getWeekdayVsWeekendSplit(expenses = [], range = null) {
  let weekdayTotal = 0;
  let weekendTotal = 0;
  const dates = [];

  for (const exp of expenses || []) {
    const dateObj = parseExpenseDate(exp?.date);
    if (!dateObj) continue;
    const day = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const amount = toFiniteAmount(exp?.amount);

    if (day === 0 || day === 6) {
      weekendTotal += amount;
    } else {
      weekdayTotal += amount;
    }
    dates.push(format(dateObj, 'yyyy-MM-dd'));
  }

  const grandTotal = weekdayTotal + weekendTotal;
  const weekdayPercent = grandTotal > 0 ? Math.round((weekdayTotal / grandTotal) * 100) : 0;
  const weekendPercent = grandTotal > 0 ? 100 - weekdayPercent : 0;

  let weekdayDays = 5;
  let weekendDays = 2;

  if (dates.length > 0) {
    dates.sort();
    const startDate = parseExpenseDate(range?.start) || parseExpenseDate(dates[0]);
    const endDate = parseExpenseDate(range?.end) || parseExpenseDate(dates[dates.length - 1]);
    const totalDays = startDate && endDate ? differenceInCalendarDays(endDate, startDate) + 1 : 0;

    if (totalDays > 0) {
      const fullWeeks = Math.floor(totalDays / 7);
      let wdCount = fullWeeks * 5;
      let weCount = fullWeeks * 2;
      for (let i = 0; i < totalDays % 7; i++) {
        const d = (startDate.getDay() + i) % 7;
        if (d === 0 || d === 6) weCount++;
        else wdCount++;
      }
      if (wdCount > 0) weekdayDays = wdCount;
      if (weCount > 0) weekendDays = weCount;
    }
  }

  return {
    weekdayTotal: roundCurrency(weekdayTotal),
    weekendTotal: roundCurrency(weekendTotal),
    weekdayPercent,
    weekendPercent,
    weekdayDays,
    weekendDays,
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

  for (const exp of expenses || []) {
    const parsed = parseExpenseDate(exp?.date);
    if (!parsed) continue;
    const dayOfMonth = parsed.getDate();
    const amount = toFiniteAmount(exp?.amount);

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

// Compares against the same stretch of the previous period, so a part month is not set against a full one.
export function getCategorySideBySideComparison(expenses = [], period = 'current-month', customRange = null, allExpenses = [], now = new Date()) {
  const pool = allExpenses.length > 0 ? allExpenses : expenses;
  let previousExpenses = [];

  const today = startOfDay(now instanceof Date && isValid(now) ? now : new Date());
  if (period === 'current-month') {
    const prevMonthDate = subDays(startOfMonth(today), 1);
    const prevKey = format(prevMonthDate, 'yyyy-MM');
    const cutoff = `${prevKey}-${format(today, 'dd')}`;
    previousExpenses = pool.filter((e) => {
      const d = parseExpenseDate(e?.date);
      if (!d) return false;
      const iso = format(d, 'yyyy-MM-dd');
      return iso.startsWith(prevKey) && iso <= cutoff;
    });
  } else if (period === 'last-90-days') {
    const startPrev = subDays(today, 179);
    const endPrev = subDays(today, 90);
    previousExpenses = pool.filter((e) => {
      const d = parseExpenseDate(e?.date);
      return d !== null && !isBefore(d, startPrev) && !isAfter(d, endPrev);
    });
  } else if (period === 'this-year') {
    const prevYearStr = String(today.getFullYear() - 1);
    const cutoff = `${prevYearStr}-${format(today, 'MM-dd')}`;
    previousExpenses = pool.filter((e) => {
      const d = parseExpenseDate(e?.date);
      if (!d) return false;
      const iso = format(d, 'yyyy-MM-dd');
      return iso.startsWith(prevYearStr) && iso <= cutoff;
    });
  } else if (period === 'custom' && customRange?.start && customRange?.end) {
    const start = parseExpenseDate(customRange.start);
    const end = parseExpenseDate(customRange.end);
    if (start && end && !isAfter(start, end)) {
      const diffDays = differenceInCalendarDays(end, start) + 1;
      const startPrev = subDays(start, diffDays);
      const endPrev = subDays(start, 1);
      previousExpenses = pool.filter((e) => {
        const d = parseExpenseDate(e?.date);
        return d !== null && !isBefore(d, startPrev) && !isAfter(d, endPrev);
      });
    }
  }

  const currentMap = {};
  for (const exp of expenses || []) {
    const cat = exp?.category || 'Other';
    currentMap[cat] = toFiniteAmount(currentMap[cat]) + toFiniteAmount(exp?.amount);
  }

  const prevMap = {};
  for (const exp of previousExpenses) {
    const cat = exp?.category || 'Other';
    prevMap[cat] = toFiniteAmount(prevMap[cat]) + toFiniteAmount(exp?.amount);
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

/**
 * Determines whether a goal or record ID represents a persisted database entity
 * vs a client-side mock/starter fallback (e.g. 'starter-1', 'mock-12345').
 * Supports generic database IDs (numbers, bigints, numeric strings, custom strings, and UUIDs).
 *
 * @param {string|number|bigint|null|undefined} id
 * @returns {boolean}
 */
export function computeReadyReceiptsTotal(readyReceipts = []) {
  const sum = (readyReceipts || []).reduce((acc, item) => {
    const data = item?.extracted_data;
    if (!data) return acc;
    const hasTotal = data.total !== null && data.total !== undefined && data.total !== '';
    const parsedTotal = hasTotal ? Number(data.total) : NaN;
    if (Number.isFinite(parsedTotal)) return acc + parsedTotal;
    if (Array.isArray(data.items)) {
      const itemsSum = data.items.reduce((s, i) => {
        const itemAmt = Number(i?.amount);
        return s + (Number.isFinite(itemAmt) ? itemAmt : 0);
      }, 0);
      return acc + itemsSum;
    }
    return acc;
  }, 0);
  return roundCurrency(sum);
}

export function isPersistedGoal(id) {
  if (id === null || id === undefined) return false;
  const str = String(id).trim();
  if (!str || str.startsWith('starter-') || str.startsWith('mock-')) return false;
  return true;
}



