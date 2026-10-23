import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { endOfMonth } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import {
  getExpensesForPeriod,
  getFinanceSummary,
  getChartCategoryBreakdown,
  getDailyBurnRate,
  getFixedVsDiscretionarySplit,
  sortExpenses,
  getDailyTrend,
} from '../utils/finance';
import { generateSubscriptionExpenseOccurrences } from '../utils/subscriptions';

export default function useCandidateReport({ candidateOwnerId, period = 'current-month', customRange } = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawExpenses, setRawExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [userSettings, setUserSettings] = useState(null);
  const loadedCandidateIdRef = useRef(null);

  const fetchCandidateData = useCallback(async () => {
    if (!candidateOwnerId) {
      setRawExpenses([]);
      setSubscriptions([]);
      setSnapshots([]);
      setUserSettings(null);
      setLoading(false);
      loadedCandidateIdRef.current = null;
      return;
    }

    if (loadedCandidateIdRef.current !== candidateOwnerId) {
      setLoading(true);
    }
    setError('');

    try {
      const [
        { data: expensesData, error: expensesError },
        { data: subsData, error: subsError },
        { data: snapshotsData, error: snapError },
        { data: settingsData },
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('id,user_id,amount,category,date,note,created_at')
          .eq('user_id', candidateOwnerId)
          .order('date', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', candidateOwnerId),
        supabase
          .from('monthly_snapshots')
          .select('*')
          .eq('user_id', candidateOwnerId)
          .order('month', { ascending: false }),
        supabase
          .from('user_settings')
          .select('monthly_budget, default_currency')
          .eq('user_id', candidateOwnerId)
          .maybeSingle(),
      ]);

      if (expensesError) throw expensesError;
      if (subsError) throw subsError;
      if (snapError) throw snapError;

      setRawExpenses(expensesData || []);
      setSubscriptions(subsData || []);
      setSnapshots(snapshotsData || []);
      setUserSettings(settingsData || null);
      loadedCandidateIdRef.current = candidateOwnerId;
    } catch (err) {
      setError(err?.message || 'Failed to load candidate financial report.');
    } finally {
      setLoading(false);
    }
  }, [candidateOwnerId]);

  useEffect(() => {
    fetchCandidateData();
  }, [fetchCandidateData]);

  // Combine raw expenses with recurring subscription occurrences
  const allExpenses = useMemo(() => {
    const cutoff = endOfMonth(new Date());
    const subOccurrences = generateSubscriptionExpenseOccurrences(subscriptions, cutoff);
    const manualKeys = new Set();
    for (const e of rawExpenses) {
      const label = (e.note || e.item || '').toLowerCase().trim();
      if (label && e.date) {
        manualKeys.add(`${label}_${e.date}`);
      }
    }

    const filteredSubOccurrences = subOccurrences.filter((subExp) => {
      const subLabel = (subExp.item || subExp.note || '').toLowerCase().trim();
      return !subLabel || !manualKeys.has(`${subLabel}_${subExp.date}`);
    });

    return sortExpenses([...rawExpenses, ...filteredSubOccurrences]);
  }, [rawExpenses, subscriptions]);

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

  const burnRate = useMemo(() => {
    return getDailyBurnRate(periodExpenses, period);
  }, [periodExpenses, period]);

  const categoryData = useMemo(() => {
    return getChartCategoryBreakdown(periodExpenses);
  }, [periodExpenses]);

  const fixedVsDisc = useMemo(() => {
    return getFixedVsDiscretionarySplit(periodExpenses);
  }, [periodExpenses]);

  const trendData = useMemo(() => {
    return getDailyTrend(periodExpenses, period, customRange, allExpenses);
  }, [periodExpenses, period, customRange, allExpenses]);

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
    burnRate,
    categoryData,
    fixedVsDisc,
    trendData,
    snapshots,
    subscriptions,
  };
}
