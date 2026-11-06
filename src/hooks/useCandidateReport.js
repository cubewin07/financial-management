import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchCandidateBudgetSettings } from '../lib/candidateSettings';
import {
  getExpensesForPeriod,
  getFinanceSummary,
  getChartCategoryBreakdown,
  sortExpenses,
} from '../utils/finance';
import { mergeSubscriptionOccurrences } from '../utils/subscriptions';

export default function useCandidateReport({
  candidateOwnerId,
  period = 'current-month',
  customRange,
  now = null,
} = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawExpenses, setRawExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
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

      setRawExpenses(expensesData || []);
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

  // Combine raw expenses with recurring subscription occurrences up to today
  const allExpenses = useMemo(() => {
    return sortExpenses(mergeSubscriptionOccurrences(rawExpenses, subscriptions, now || new Date()));
  }, [rawExpenses, subscriptions, now]);

  // Filter for active period
  const periodExpenses = useMemo(() => {
    return getExpensesForPeriod(allExpenses, period, customRange);
  }, [allExpenses, period, customRange]);

  const defaultCurrency = userSettings?.default_currency || 'NZD';
  const monthlyBudget = Number(userSettings?.monthly_budget) || 0;

  // Compute summary metrics
  const summary = useMemo(() => {
    return getFinanceSummary(periodExpenses, monthlyBudget);
  }, [monthlyBudget, periodExpenses]);

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
    allExpenses,
    periodExpenses,
    summary,
    categoryData,
    subscriptions,
  };
}
