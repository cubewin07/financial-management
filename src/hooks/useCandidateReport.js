import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { differenceInCalendarMonths, isValid, startOfMonth } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { fetchCandidateBudgetSettings } from '../lib/candidateSettings';
import {
  computePeriodBudget,
  getExpensesForPeriod,
  getFinanceSummary,
  getChartCategoryBreakdown,
  sortExpenses,
} from '../utils/finance';
import { isValidMonthKey, monthKeyToDate } from '../utils/carryOver';
import { mergeSubscriptionOccurrences } from '../utils/subscriptions';
import { withConvertedAmounts } from '../utils/exchangeRates';
import useExchangeRates from './useExchangeRates';

export default function useCandidateReport({
  candidateOwnerId,
  period = 'current-month',
  customRange,
  now = null,
} = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawExpenses, setRawExpenses] = useState([]);
  const [rawSubscriptions, setSubscriptions] = useState([]);
  const { rates } = useExchangeRates();
  const [userSettings, setUserSettings] = useState(null);
  const activeCandidateIdRef = useRef(candidateOwnerId);

  useEffect(() => {
    activeCandidateIdRef.current = candidateOwnerId;
    // Clear previous candidate data immediately on ID change to avoid stale cross-budget rendering
    setRawExpenses([]);
    setSubscriptions([]);
    setUserSettings(null);
    setLoading(Boolean(candidateOwnerId));
    setError('');
  }, [candidateOwnerId]);

  const fetchCandidateData = useCallback(async () => {
    const targetId = candidateOwnerId;
    if (!targetId) {
      setRawExpenses([]);
      setSubscriptions([]);
      setUserSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [
        { data: expensesData, error: expensesError },
        { data: subsData, error: subsError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('id,user_id,amount,category,date,note,created_at')
          .eq('user_id', targetId)
          .order('date', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', targetId),
        fetchCandidateBudgetSettings(targetId),
      ]);

      // If user switched candidate while request was in-flight, discard stale result
      if (activeCandidateIdRef.current !== targetId) {
        return;
      }

      if (expensesError) throw expensesError;
      if (subsError) throw subsError;
      if (settingsError) throw settingsError;

      const normalizedExpenses = (expensesData || []).map((expense) => ({
        ...expense,
        amount: Number.isFinite(Number(expense.amount)) ? Number(expense.amount) : 0,
        note: expense.note || '',
      }));

      setRawExpenses(normalizedExpenses);
      setSubscriptions(subsData || []);
      setUserSettings(settingsData || null);
    } catch (err) {
      if (activeCandidateIdRef.current === targetId) {
        setError(err?.message || 'Failed to load candidate financial report.');
      }
    } finally {
      if (activeCandidateIdRef.current === targetId) {
        setLoading(false);
      }
    }
  }, [candidateOwnerId]);

  useEffect(() => {
    fetchCandidateData();
  }, [fetchCandidateData]);

  const defaultCurrency = userSettings?.default_currency || 'NZD';
  const subscriptions = useMemo(
    () => withConvertedAmounts(rawSubscriptions, defaultCurrency, rates),
    [rawSubscriptions, defaultCurrency, rates],
  );

  const effectiveNow = useMemo(
    () => (now instanceof Date && isValid(now) ? now : new Date()),
    [now],
  );

  // Combine raw expenses with recurring subscription occurrences up to today
  const allExpenses = useMemo(() => {
    return sortExpenses(mergeSubscriptionOccurrences(rawExpenses, subscriptions, effectiveNow));
  }, [rawExpenses, subscriptions, effectiveNow]);

  // Filter for active period
  const periodExpenses = useMemo(() => {
    return getExpensesForPeriod(allExpenses, period, customRange);
  }, [allExpenses, period, customRange]);

  const monthlyBudget = Number.isFinite(Number(userSettings?.monthly_budget))
    ? Number(userSettings?.monthly_budget)
    : 0;

  const periodBudget = useMemo(() => {
    const months = allExpenses.map((e) => e?.date?.slice(0, 7)).filter(isValidMonthKey).sort();
    const earliest = months[0];
    const monthsSpan = earliest
      ? Math.max(1, differenceInCalendarMonths(startOfMonth(effectiveNow), monthKeyToDate(earliest)) + 1)
      : 1;
    return computePeriodBudget({
      period,
      monthlyBudget,
      customRange,
      monthsCount: monthsSpan,
      now: effectiveNow,
    });
  }, [period, monthlyBudget, effectiveNow, customRange, allExpenses]);

  // Compute summary metrics
  const summary = useMemo(() => {
    return getFinanceSummary(periodExpenses, periodBudget);
  }, [periodBudget, periodExpenses]);

  const categoryData = useMemo(() => {
    return getChartCategoryBreakdown(periodExpenses);
  }, [periodExpenses]);

  return {
    loading,
    error,
    refresh: fetchCandidateData,
    candidateOwnerId,
    defaultCurrency,
    monthlyBudget,
    periodBudget,
    allExpenses,
    periodExpenses,
    summary,
    categoryData,
    subscriptions,
  };
}
