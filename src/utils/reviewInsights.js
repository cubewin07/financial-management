import {
  format,
  parseISO,
  startOfMonth,
  subMonths,
  subDays,
} from 'date-fns';
import {
  formatCurrency,
  getMonthPace,
  isRecurringExpense,
} from './finance.js';
export const FALLBACK_OWNER_LABEL = 'Shared budget';
export const FALLBACK_MEMBER_LABEL = 'Authorized reviewer';

export const OUTLIER_LIMIT = 3;
export const LARGE_MULTIPLE = 2;       // amount >= 2 × category median
export const MIN_HISTORY_SAMPLES = 3;  // need >= 3 prior samples in the category
export const HISTORY_DAYS = 90;
export const SURGE_RATIO = 1.3;        // category up >= 30% vs previous calendar month
export const minMeaningfulAmount = (budget) => Math.max(20, 0.05 * (Number(budget) || 0));

function roundCurrency(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function calculateMedian(numbers = []) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Classifies month pacing status: 'none' | 'on-track' | 'watch' | 'over'
 */
export function classifyPace({ monthlyBudget = 0, monthSpent = 0, now = new Date() } = {}) {
  const budget = Number(monthlyBudget) || 0;
  if (budget <= 0) return 'none';

  const pace = getMonthPace({ monthlyBudget: budget, monthSpent, now });
  if (pace.remaining < 0 || pace.projectedEndSpend > budget * 1.1) {
    return 'over';
  }
  if (pace.projectedEndSpend > budget) {
    return 'watch';
  }
  return 'on-track';
}

/**
 * Finds up to `limit` notable outliers for the current month.
 * -> [{ type:'expense'|'category', reason:'large'|'new'|'surge', score, expense?, category?, title, detail, amount }]
 */
export function findOutliers(allExpenses = [], { monthlyBudget = 0, now = new Date(), limit = OUTLIER_LIMIT } = {}) {
  const nonRecurring = (allExpenses || []).filter((e) => !isRecurringExpense(e) && e && e.date);
  if (!nonRecurring.length) return [];

  const min = minMeaningfulAmount(monthlyBudget);
  const currentMonthKey = format(now, 'yyyy-MM');
  const firstOfThisMonth = startOfMonth(now);
  const prevMonthDate = subMonths(firstOfThisMonth, 1);
  const prevMonthKey = format(prevMonthDate, 'yyyy-MM');
  const prevMonthName = format(prevMonthDate, 'MMM');
  const historyCutoff = subDays(firstOfThisMonth, HISTORY_DAYS);

  const thisMonthExpenses = [];
  const pastExpenses = [];

  for (const exp of nonRecurring) {
    if (exp.date.startsWith(currentMonthKey)) {
      thisMonthExpenses.push(exp);
    } else if (exp.date < `${currentMonthKey}-01`) {
      pastExpenses.push(exp);
    }
  }

  const rawOutliers = [];

  // 1. Large: this-month expense >= min, category has >= MIN_HISTORY_SAMPLES in the 90 days prior, amount >= LARGE_MULTIPLE * median
  for (const exp of thisMonthExpenses) {
    const amt = Number(exp.amount) || 0;
    if (amt < min) continue;

    const catHistory = pastExpenses.filter((h) => {
      if (h.category !== exp.category) return false;
      const hDate = parseISO(h.date);
      return hDate >= historyCutoff && hDate < firstOfThisMonth;
    });

    if (catHistory.length >= MIN_HISTORY_SAMPLES) {
      const median = calculateMedian(catHistory.map((h) => Number(h.amount) || 0));
      if (median > 0 && amt >= LARGE_MULTIPLE * median) {
        const score = amt / median;
        const formattedRatio = String(Number(score.toFixed(1))).replace(/\.0$/, '');
        rawOutliers.push({
          type: 'expense',
          reason: 'large',
          score,
          expense: exp,
          category: exp.category,
          title: exp.item || exp.category || 'Expense',
          detail: `${formattedRatio}× usual`,
          amount: amt,
        });
      }
    }
  }

  // 2. New: this-month expense whose normalised item never appeared in any expense before this month, amount >= min
  const knownPastItems = new Set(
    pastExpenses.map((h) => String(h.item || '').trim().toLowerCase()).filter(Boolean),
  );

  for (const exp of thisMonthExpenses) {
    const amt = Number(exp.amount) || 0;
    if (amt < min) continue;
    const cleanItem = String(exp.item || '').trim().toLowerCase();
    if (!cleanItem) continue;

    if (!knownPastItems.has(cleanItem)) {
      rawOutliers.push({
        type: 'expense',
        reason: 'new',
        score: 1.5,
        expense: exp,
        category: exp.category,
        title: exp.item || exp.category || 'Expense',
        detail: 'New merchant',
        amount: amt,
      });
    }
  }

  // 3. Surge: category whose this-month total >= SURGE_RATIO * prev-month total, prev > 0, and diff >= min
  const thisCatTotals = {};
  for (const exp of thisMonthExpenses) {
    const cat = exp.category || 'Other';
    thisCatTotals[cat] = (thisCatTotals[cat] || 0) + (Number(exp.amount) || 0);
  }

  const prevMonthExpenses = pastExpenses.filter((e) => e.date.startsWith(prevMonthKey));
  const prevCatTotals = {};
  for (const exp of prevMonthExpenses) {
    const cat = exp.category || 'Other';
    prevCatTotals[cat] = (prevCatTotals[cat] || 0) + (Number(exp.amount) || 0);
  }

  for (const [cat, thisTotal] of Object.entries(thisCatTotals)) {
    const prevTotal = prevCatTotals[cat] || 0;
    if (prevTotal > 0 && thisTotal >= SURGE_RATIO * prevTotal && (thisTotal - prevTotal) >= min) {
      const score = thisTotal / prevTotal;
      const pct = Math.round(((thisTotal - prevTotal) / prevTotal) * 100);
      rawOutliers.push({
        type: 'category',
        reason: 'surge',
        score,
        category: cat,
        title: cat,
        detail: `+${pct}% vs ${prevMonthName}`,
        amount: roundCurrency(thisTotal),
        thisTotal: roundCurrency(thisTotal),
        prevTotal: roundCurrency(prevTotal),
        pct,
      });
    }
  }

  // Deduplicate expenses by expense.id (keep highest score)
  const expenseMap = new Map();
  const categoryOutliers = [];

  for (const item of rawOutliers) {
    if (item.type === 'expense' && item.expense?.id) {
      const existing = expenseMap.get(item.expense.id);
      if (!existing || item.score > existing.score) {
        expenseMap.set(item.expense.id, item);
      }
    } else {
      categoryOutliers.push(item);
    }
  }

  const combined = [...expenseMap.values(), ...categoryOutliers];

  // Sort by score desc, ties by amount desc
  combined.sort((a, b) => b.score - a.score || b.amount - a.amount);

  return combined.slice(0, limit);
}

/**
 * Groups expenses by day, newest first.
 * -> [{ date:'yyyy-MM-dd', label:'Today'|'Yesterday'|'Thu 23 Oct', total, items:[…] }]
 */
export function groupByDay(expenses = [], now = new Date()) {
  const groupsMap = new Map();
  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');

  for (const exp of expenses || []) {
    if (!exp || !exp.date) continue;
    const d = exp.date;
    if (!groupsMap.has(d)) {
      groupsMap.set(d, []);
    }
    groupsMap.get(d).push(exp);
  }

  // Sort dates descending
  const sortedDates = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => {
    let label;
    if (date === todayStr) {
      label = 'Today';
    } else if (date === yesterdayStr) {
      label = 'Yesterday';
    } else {
      label = format(parseISO(date), 'EEE d MMM');
    }

    const items = groupsMap.get(date);
    const total = roundCurrency(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));

    return {
      date,
      label,
      total,
      items,
    };
  });
}

/**
 * Reviewer-visible status for the "Needs review" filter.
 * True if non-recurring expense with NO comment from author_role === 'reviewer'.
 */
export function needsReview(expense, commentsForExpense = []) {
  if (isRecurringExpense(expense)) return false;
  return !(commentsForExpense || []).some((c) => c && c.author_role === 'reviewer');
}

/**
 * Prefilled advice text template (pure, no LLM).
 */
export function getSuggestedNote({
  name = '',
  status = 'on-track',
  pace = {},
  topSurge = null,
  currency = 'NZD',
} = {}) {
  const fmt = (val) => formatCurrency(val, currency);
  const budget = Number(pace.budget ?? pace.monthlyBudget ?? 0);
  const projectedEnd = Number(pace.projectedEndSpend ?? 0);

  if (status === 'over' || status === 'watch') {
    const overAmt = Math.max(0, projectedEnd - budget);
    const cat = topSurge?.category || 'the biggest category';
    const prefix = name ? `${name}, ` : '';
    return `${prefix}you're on pace to finish ${fmt(overAmt)} over budget this month. Let's look at ${cat} first.`;
  }

  if (status === 'on-track' && topSurge) {
    const cat = topSurge.category;
    const pct = topSurge.pct ?? Math.round((((topSurge.thisTotal || topSurge.amount) - (topSurge.prevTotal || 0)) / (topSurge.prevTotal || 1)) * 100);
    const thisVal = fmt(topSurge.thisTotal || topSurge.amount);
    const prevVal = fmt(topSurge.prevTotal || 0);
    return `Nice pacing this month. One thing to watch: ${cat} is up ${pct}% vs last month (${thisVal} vs ${prevVal}).`;
  }

  if (status === 'on-track') {
    const underAmt = Math.max(0, budget - projectedEnd);
    const days = pace.daysRemaining || 0;
    return `You're ${fmt(underAmt)} under target with ${days} days to go — keep it up!`;
  }

  if (status === 'none') {
    return 'Consider setting a monthly budget so we can track your pace together.';
  }

  return 'Everything looks on track this month.';
}

/**
 * Generates a human-friendly display name from an email address.
 * Passes through fallback tokens unchanged.
 */
export function displayName(email, fallback = 'Shared budget') {
  if (!email || typeof email !== 'string') return fallback;
  if (email === FALLBACK_OWNER_LABEL || email === FALLBACK_MEMBER_LABEL) return email;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email || fallback;

  const localPart = email.slice(0, atIndex);
  const parts = localPart.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return fallback;

  return parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
