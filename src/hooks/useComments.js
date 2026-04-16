import { useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import {
  EXPENSE_COMMENTS_STORAGE_KEY,
  MONTH_COMMENTS_STORAGE_KEY,
  addExpenseComment,
  getCommentCounts,
  getExpenseCommentsById,
  getLatestMonthComment,
  getMonthCommentsByMonth,
  saveMonthComment,
} from '../utils/comments';

function useComments({ userId = 'local-owner', useSupabase = false } = {}) {
  const [expenseComments, setExpenseComments] = useLocalStorage(EXPENSE_COMMENTS_STORAGE_KEY, {});
  const [monthComments, setMonthComments] = useLocalStorage(MONTH_COMMENTS_STORAGE_KEY, {});

  const commentCounts = useMemo(() => getCommentCounts(expenseComments), [expenseComments]);

  const getExpenseComments = (expenseId) => getExpenseCommentsById(expenseComments, expenseId);

  const addCommentToExpense = (expenseId, body, authorRole) => {
    if (useSupabase) {
      return;
    }

    setExpenseComments((current) =>
      addExpenseComment(current, {
        expense_id: expenseId,
        author_role: authorRole,
        body,
      }),
    );
  };

  const getMonthComments = (month) => getMonthCommentsByMonth(monthComments, month);

  const getReviewerMonthComment = (month) => getLatestMonthComment(monthComments, month, 'reviewer');

  const saveReviewerMonthComment = (month, body, authorRole = 'reviewer') => {
    if (useSupabase) {
      return;
    }

    setMonthComments((current) =>
      saveMonthComment(current, {
        user_id: userId,
        month,
        author_role: authorRole,
        body,
      }),
    );
  };

  return {
    expenseComments,
    monthComments,
    commentCounts,
    getExpenseComments,
    addCommentToExpense,
    getMonthComments,
    getReviewerMonthComment,
    saveReviewerMonthComment,
  };
}

export default useComments;

