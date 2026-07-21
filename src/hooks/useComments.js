import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  getCommentCounts,
  getExpenseCommentsById,
  getLatestMonthComment,
  getMonthCommentsByMonth,
} from '../utils/comments';

function sortByCreatedAt(comments = []) {
  return [...comments].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
}

function toExpenseCommentMap(rows = []) {
  return rows.reduce((commentMap, row) => {
    const expenseId = row.expense_id;
    return {
      ...commentMap,
      [expenseId]: sortByCreatedAt([...(commentMap[expenseId] || []), row]),
    };
  }, {});
}

function toMonthCommentMap(rows = []) {
  return rows.reduce((commentMap, row) => {
    const month = row.month;
    return {
      ...commentMap,
      [month]: sortByCreatedAt([...(commentMap[month] || []), row]),
    };
  }, {});
}

function useComments({ userId = 'local-owner' } = {}) {
  const [expenseComments, setExpenseComments] = useState({});
  const [monthComments, setMonthComments] = useState({});
  const [commentsError, setCommentsError] = useState('');

  useEffect(() => {
    if (!userId) {
      setExpenseComments({});
      setMonthComments({});
      setCommentsError('');
      return;
    }

    let isMounted = true;

    const loadComments = async () => {
      const { data: userExpenses, error: expenseQueryError } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId);

      if (!isMounted) {
        return;
      }

      if (expenseQueryError) {
        setExpenseComments({});
        setCommentsError(expenseQueryError.message);
        return;
      }

      let nextError = '';

      const expenseIds = (userExpenses || []).map((expense) => expense.id);

      if (expenseIds.length === 0) {
        setExpenseComments({});
      } else {
        const { data: expenseCommentRows, error: expenseCommentsError } = await supabase
          .from('expense_comments')
          .select('id,expense_id,author_role,body,created_at')
          .in('expense_id', expenseIds)
          .order('created_at', { ascending: true });

        if (!isMounted) {
          return;
        }

        if (expenseCommentsError) {
          setExpenseComments({});
          nextError = expenseCommentsError.message;
        } else {
          setExpenseComments(toExpenseCommentMap(expenseCommentRows || []));
        }
      }

      const { data: monthCommentRows, error: monthCommentsError } = await supabase
        .from('month_comments')
        .select('id,user_id,month,author_role,body,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!isMounted) {
        return;
      }

      if (monthCommentsError) {
        setMonthComments({});
        nextError = nextError || monthCommentsError.message;
      } else {
        setMonthComments(toMonthCommentMap(monthCommentRows || []));
      }

      setCommentsError(nextError);
    };

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const commentCounts = useMemo(() => getCommentCounts(expenseComments), [expenseComments]);

  const getExpenseComments = (expenseId) => getExpenseCommentsById(expenseComments, expenseId);

  const addCommentToExpense = async (expenseId, body, authorRole) => {
    const trimmedBody = body.trim();

    if (!trimmedBody || !expenseId) {
      return;
    }

    const { data, error } = await supabase
      .from('expense_comments')
      .insert({
        expense_id: expenseId,
        author_role: authorRole,
        body: trimmedBody,
      })
      .select('id,expense_id,author_role,body,created_at')
      .single();

    if (error) {
      setCommentsError(error.message);
      return;
    }

    setExpenseComments((current) => ({
      ...current,
      [expenseId]: sortByCreatedAt([...(current[expenseId] || []), data]),
    }));
    setCommentsError('');
  };

  const getMonthComments = (month) => getMonthCommentsByMonth(monthComments, month);

  const getReviewerMonthComment = (month) => getLatestMonthComment(monthComments, month, 'reviewer');

  const saveReviewerMonthComment = async (month, body, authorRole = 'reviewer') => {
    const trimmedBody = body.trim();

    if (!trimmedBody || !month || !userId) {
      return;
    }

    const { data, error } = await supabase
      .from('month_comments')
      .insert({
        user_id: userId,
        month,
        author_role: authorRole,
        body: trimmedBody,
      })
      .select('id,user_id,month,author_role,body,created_at')
      .single();

    if (error) {
      setCommentsError(error.message);
      return;
    }

    setMonthComments((current) => ({
      ...current,
      [month]: sortByCreatedAt([...(current[month] || []), data]),
    }));
    setCommentsError('');
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
    error: commentsError,
  };
}

export default useComments;
