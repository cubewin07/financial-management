import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { fetchCandidateBudgetSettings } from '../lib/candidateSettings';
import { getMonthRecurringBreakdown, mergeSubscriptionOccurrences } from '../utils/subscriptions';
import { getMonthPace } from '../utils/finance';
import { classifyPace } from '../utils/reviewInsights';

const OVERVIEW_CACHE_TTL = 60_000; // 60s
const OVERVIEW_BATCH_SIZE = 5;
const overviewCache = new Map(); // Map<ownerId, { at: number, data: Overview, createdAts: string[] }>

// Other people's budget figures must not outlive the signed-in session.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') overviewCache.clear();
});

function roundCurrency(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function computeNewCount(ownerId, createdAts = [], currentUserId = null) {
  try {
    const lastSeen = localStorage.getItem(`reviewerHub:lastSeen:${currentUserId}:${ownerId}`);
    // A first visit has no baseline, so nothing counts as "new since you last looked".
    if (!lastSeen) return 0;
    return createdAts.filter((ts) => ts && ts > lastSeen).length;
  } catch {
    return 0;
  }
}

export default function useRevieweeOverviews(revieweeCandidates = [], { enabled = true, currentUserId = null } = {}) {
  const [overviews, setOverviews] = useState(new Map());
  const [loading, setLoading] = useState(Boolean(enabled));
  const mountedRef = useRef(true);

  const fetchOverviews = useCallback(async (force = false) => {
    if (!enabled) {
      return;
    }

    if (!revieweeCandidates || revieweeCandidates.length === 0) {
      setOverviews(new Map());
      setLoading(false);
      return;
    }

    const now = new Date();
    const cutoff = now;

    setLoading(true);

    const resultMap = new Map();
    const loadOverview = async (candidate) => {
      const ownerId = candidate.owner_user_id;
      if (!ownerId) return;

      const cached = overviewCache.get(ownerId);
      if (!force && cached && Date.now() - cached.at < OVERVIEW_CACHE_TTL) {
        resultMap.set(ownerId, {
          ...cached.data,
          newCount: computeNewCount(ownerId, cached.createdAts, currentUserId),
        });
        return;
      }

      try {
        const [
          { data: expensesData, error: expError },
          { data: subsData, error: subsError },
          { data: settingsData, error: settingsError },
        ] = await Promise.all([
          supabase
            .from('expenses')
            .select('id,amount,category,date,created_at,note')
            .eq('user_id', ownerId)
            .gte('date', format(startOfMonth(now), 'yyyy-MM-dd'))
            .order('date', { ascending: false }),
          supabase.from('subscriptions').select('*').eq('user_id', ownerId),
          fetchCandidateBudgetSettings(ownerId),
        ]);

        if (expError) throw expError;
        if (subsError) throw subsError;
        if (settingsError) throw settingsError;

        const rawExpenses = expensesData || [];
        const subscriptions = subsData || [];
        const monthlyBudget = Number(settingsData?.monthly_budget || 0);
        const currency = settingsData?.default_currency || 'NZD';

        const allExpenses = mergeSubscriptionOccurrences(rawExpenses, subscriptions, cutoff);
        const currentMonthExpenses = allExpenses.filter((e) => {
          if (!e || !e.date) return false;
          try {
            return isSameMonth(parseISO(e.date), now);
          } catch {
            return false;
          }
        });

        const monthSpent = roundCurrency(
          currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        );

        const recurring = getMonthRecurringBreakdown(currentMonthExpenses, subscriptions, now);
        const pace = getMonthPace({ monthlyBudget, monthSpent, now, ...recurring });
        const status = classifyPace({ monthlyBudget, monthSpent, now, ...recurring });
        const createdAts = rawExpenses.map((e) => e.created_at).filter(Boolean);
        const newCount = computeNewCount(ownerId, createdAts, currentUserId);

        const overview = {
          monthSpent,
          monthlyBudget,
          currency,
          status,
          newCount,
          pace,
        };

        overviewCache.set(ownerId, { at: Date.now(), data: overview, createdAts });
        resultMap.set(ownerId, overview);
      } catch (err) {
        console.warn(`[ReviewerHub] Failed overview for ${ownerId}:`, err);
        const failedOverview = {
          monthSpent: 0,
          monthlyBudget: 0,
          currency: 'NZD',
          status: 'unavailable',
          newCount: 0,
          error: err?.message || 'Failed to load',
        };
        resultMap.set(ownerId, failedOverview);
      }
    };

    // Small batches keep long reviewer lists from flooding the connection on phones.
    for (let i = 0; i < revieweeCandidates.length; i += OVERVIEW_BATCH_SIZE) {
      await Promise.all(revieweeCandidates.slice(i, i + OVERVIEW_BATCH_SIZE).map(loadOverview));
    }

    if (mountedRef.current) {
      setOverviews(resultMap);
      setLoading(false);
    }
  }, [revieweeCandidates, enabled, currentUserId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOverviews();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchOverviews]);

  const refresh = useCallback(() => fetchOverviews(true), [fetchOverviews]);

  return { overviews, loading, refresh };
}
