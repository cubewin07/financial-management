export const EXPENSE_COMMENTS_STORAGE_KEY = 'finance-comments';
export const MONTH_COMMENTS_STORAGE_KEY = 'finance-month-comments';

function createId(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortComments(comments = []) {
  return [...comments].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

export function getExpenseCommentsById(commentMap = {}, expenseId) {
  return sortComments(commentMap?.[expenseId] || []);
}

export function getCommentCounts(commentMap = {}) {
  return Object.fromEntries(
    Object.entries(commentMap).map(([key, comments]) => [key, Array.isArray(comments) ? comments.length : 0]),
  );
}

export function addExpenseComment(commentMap = {}, input) {
  const nextComment = {
    id: createId('expense-comment'),
    expense_id: input.expense_id,
    author_role: input.author_role,
    body: input.body.trim(),
    created_at: new Date().toISOString(),
  };

  return {
    ...commentMap,
    [input.expense_id]: sortComments([...(commentMap[input.expense_id] || []), nextComment]),
  };
}

export function getMonthCommentsByMonth(commentMap = {}, month) {
  return sortComments(commentMap?.[month] || []);
}

export function getLatestMonthComment(commentMap = {}, month, role = 'reviewer') {
  const comments = getMonthCommentsByMonth(commentMap, month).filter(
    (comment) => comment.author_role === role,
  );

  return comments.at(-1) || null;
}

export function saveMonthComment(commentMap = {}, input) {
  const currentComments = getMonthCommentsByMonth(commentMap, input.month);
  const existingIndex = currentComments.findIndex(
    (comment) => comment.author_role === input.author_role,
  );
  const nextComment = {
    id: existingIndex >= 0 ? currentComments[existingIndex].id : createId('month-comment'),
    user_id: input.user_id,
    month: input.month,
    author_role: input.author_role,
    body: input.body.trim(),
    created_at: new Date().toISOString(),
  };

  const nextMonthComments =
    existingIndex >= 0
      ? currentComments.map((comment, index) => (index === existingIndex ? nextComment : comment))
      : [...currentComments, nextComment];

  return {
    ...commentMap,
    [input.month]: sortComments(nextMonthComments),
  };
}

