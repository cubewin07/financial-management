import { supabase } from './supabaseClient';
import { getMonthAllocation, getMonthKey } from '../utils/carryOver.js';
import { roundCurrency } from '../utils/finance.js';

function toFiniteBudget(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Resolves a candidate's base monthly budget, current-month carry-over top-up,
 * and effective monthly budget from a user_settings or RPC row.
 */
export function resolveCandidateBudgetSettings(settings, now = new Date()) {
  const safeNow =
    now instanceof Date
      ? (!Number.isNaN(now.getTime()) ? now : new Date())
      : (typeof now === 'string' && now.trim() ? now : new Date());
  const currentMonth = getMonthKey(safeNow);

  const baseMonthlyBudget = roundCurrency(Math.max(0, toFiniteBudget(settings?.monthly_budget)));
  const carryOverAllocated = Math.max(
    0,
    getMonthAllocation(
      {
        month: settings?.carry_over_allocated_month ?? null,
        amount: settings?.carry_over_allocated ?? 0,
      },
      currentMonth,
    ),
  );
  const effectiveMonthlyBudget = roundCurrency(baseMonthlyBudget + carryOverAllocated);

  return {
    baseMonthlyBudget,
    carryOverAllocated,
    effectiveMonthlyBudget,
    defaultCurrency: settings?.default_currency || 'NZD',
  };
}

/**
 * Loads a reviewed owner's budget, current-month carry-over allocation, and currency.
 * Falls back to a direct read until migration 017 has been applied.
 */
export async function fetchCandidateBudgetSettings(ownerId, now = new Date()) {
  const { data, error } = await supabase.rpc('get_candidate_budget_settings', {
    target_owner_id: ownerId,
  });

  const rpcMissing = error && (error.code === 'PGRST202' || error.code === '42883');
  if (rpcMissing) {
    const fallbackResult = await supabase
      .from('user_settings')
      .select('monthly_budget, default_currency')
      .eq('user_id', ownerId)
      .maybeSingle();

    if (fallbackResult.error || !fallbackResult.data) {
      return fallbackResult;
    }

    return {
      data: {
        ...fallbackResult.data,
        ...resolveCandidateBudgetSettings(fallbackResult.data, now),
      },
      error: null,
    };
  }

  const row = data?.[0] || null;
  if (error || !row) {
    return { data: row, error };
  }

  return {
    data: {
      ...row,
      ...resolveCandidateBudgetSettings(row, now),
    },
    error,
  };
}
