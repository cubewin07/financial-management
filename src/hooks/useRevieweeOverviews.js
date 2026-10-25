import { useState, useEffect, useCallback, useRef } from 'react';
import { endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { generateSubscriptionExpenseOccurrences } from '../utils/subscriptions';
import { getMonthPace } from '../utils/finance';
import { classifyPace } from '../utils/reviewInsights';

const OVERVIEW_CACHE_TTL = 60_000; // 60s
const overviewCache = new Map(); // Map<ownerId, { at: number, data: Overview, createdAts: string[] }>

function roundCurrency(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function computeNewCount(ownerId, createdAts = []) {
  try {
    const lastSeen = localStorage.getItem(`reviewerHub:lastSeen:${ownerId}`);
    if (!lastSeen) return createdAts.length;
    return createdAts.filter((ts) => ts && ts > lastSeen).length;
  } catch {
    return 0;
  }
}

export default function useRevieweeOverviews(revieweeCandidates = [], { enabled = true } = {}) {
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
    const cutoff = endOfMonth(now);
    const candidateList = revieweeCandidates.slice(0, 10); // Cap at 10

    setLoading(true);

    const resultMap = new Map();
    const fetchPromises = candidateList.map(async (candidate) => {
      const ownerId = candidate.owner_user_id;
      if (!ownerId) return;

      const cached = overviewCache.get(ownerId);
      if (!force && cached && Date.now() - cached.at < OVERVIEW_CACHE_TTL) {
        resultMap.set(ownerId, {
          ...cached.data,
          newCount: computeNewCount(ownerId, cached.createdAts),
        });
        return;
      }

      try {
        const [
          { data: expensesData, error: expError },
          { data: subsData, error: subsError },
          { data: settingsData },
        ] = await Promise.all([
          supabase
            .from('expenses')
            .select('id,amount,category,date,created_at,note')
            .eq('user_id', ownerId),
          supabase.from('subscriptions').select('*').eq('user_id', ownerId),
          supabase
            .from('user_settings')
            .select('monthly_budget, default_currency')
            .eq('user_id', ownerId)
            .maybeSingle(),
        ]);

        if (expError) throw expError;
        if (subsError) throw subsError;

        const rawExpenses = expensesData || [];
        const subscriptions = subsData || [];
        const monthlyBudget = Number(settingsData?.monthly_budget || 0);
        const currency = settingsData?.default_currency || 'NZD';

        // Generate virtual subscription occurrences
        const subOccurrences = generateSubscriptionExpenseOccurrences(subscriptions, cutoff);
        const manualKeys = new Set();
        for (const e of rawExpenses) {
          const label = (e.note || e.item || '').toLowerCase().trim();
          if (label && e.date) {
            manualKeys.add(`${label}_${e.date}`);
          }
        }
        const filteredSubs = subOccurrences.filter((subExp) => {
          const subLabel = (subExp.item || subExp.note || '').toLowerCase().trim();
          return !subLabel || !manualKeys.has(`${subLabel}_${subExp.date}`);
        });

        const allExpenses = [...rawExpenses, ...filteredSubs];
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

        const pace = getMonthPace({ monthlyBudget, monthSpent, now });
        const status = classifyPace({ monthlyBudget, monthSpent, now });
        const createdAts = rawExpenses.map((e) => e.created_at).filter(Boolean);
        const newCount = computeNewCount(ownerId, createdAts);

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
    });

    await Promise.all(fetchPromises);

    if (mountedRef.current) {
      setOverviews(resultMap);
      setLoading(false);
    }
  }, [revieweeCandidates, enabled]);

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
