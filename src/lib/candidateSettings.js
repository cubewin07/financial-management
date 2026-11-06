import { supabase } from './supabaseClient';

/**
 * Loads only a reviewed owner's budget and currency.
 * Falls back to a direct read until migration 017 has been applied.
 */
export async function fetchCandidateBudgetSettings(ownerId) {
  const { data, error } = await supabase.rpc('get_candidate_budget_settings', {
    target_owner_id: ownerId,
  });

  const rpcMissing = error && (error.code === 'PGRST202' || error.code === '42883');
  if (rpcMissing) {
    return supabase
      .from('user_settings')
      .select('monthly_budget, default_currency')
      .eq('user_id', ownerId)
      .maybeSingle();
  }

  return { data: data?.[0] || null, error };
}
