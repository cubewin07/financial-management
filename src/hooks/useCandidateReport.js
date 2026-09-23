import { useState, useEffect, useMemo, useCallback } from 'react';
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

  const fetchCandidateData = useCallback(async () => {
    if (!candidateOwnerId) {
      setRawExpenses([]);
      setSubscriptions([]);
      setSnapshots([]);
      setUserSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Candidate expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', candidateOwnerId)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // 2. Candidate subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', candidateOwnerId);

      if (subsError) throw subsError;

      // 3. Candidate monthly snapshots
      const { data: snapshotsData, error: snapError } = await supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('user_id', candidateOwnerId)
        .order('month', { ascending: false });

      if (snapError) throw snapError;

      // 4. Candidate user settings (budget & currency)
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', candidateOwnerId)
        .maybeSingle();

      setRawExpenses(expensesData || []);
      setSubscriptions(subsData || []);
      setSnapshots(snapshotsData || []);
      setUserSettings(settingsData || null);
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
    const manualKeys = new Set(
      rawExpenses.map((e) => `${(e.item || '').toLowerCase().trim()}_${e.date}`)
    );

    const filteredSubOccurrences = subOccurrences.filter(
      (subExp) => !manualKeys.has(`${(subExp.item || '').toLowerCase().trim()}_${subExp.date}`)
    );

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
