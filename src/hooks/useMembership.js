import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function normalizeSupabaseRole(rawRole) {
  const role = (rawRole || 'owner').toLowerCase().trim();
  if (role === 'reviewer' || role === 'member' || role === 'read_only') {
    return 'reviewer';
  }
  return 'owner';
}

// Shown when the email-resolving RPCs are unavailable and only raw membership rows are returned.
export const FALLBACK_OWNER_LABEL = 'Shared budget';
export const FALLBACK_MEMBER_LABEL = 'Authorized reviewer';

export default function useMembership({ sessionUserId } = {}) {
  const [accessLoading, setAccessLoading] = useState(Boolean(sessionUserId));
  const [myReviewers, setMyReviewers] = useState([]);
  const [revieweeCandidates, setRevieweeCandidates] = useState([]);
  const [error, setError] = useState('');
  const initialLoadDone = useRef(false);

  const loadMembershipData = useCallback(async (isSilent = false) => {
    if (!sessionUserId) {
      setMyReviewers([]);
      setRevieweeCandidates([]);
      setAccessLoading(false);
      return;
    }

    if (!isSilent && !initialLoadDone.current) {
      setAccessLoading(true);
    }
    setError('');

    try {
      // 1. Fetch people who review MY budget (I am the owner)
      const { data: reviewersData, error: reviewersError } = await supabase
        .rpc('get_my_reviewers');

      // 2. Fetch candidates whose budget I review (I am the reviewer)
      const { data: candidatesData, error: candidatesError } = await supabase
        .rpc('get_my_reviewee_candidates');

      if (reviewersError) {
        console.warn('get_my_reviewers RPC failed, using direct query fallback:', reviewersError);
        // Fallback for environments where RPC might not be migrated yet:
        // Try querying budget_memberships directly (no emails available via this path)
        const { data: fallbackReviewers } = await supabase
          .from('budget_memberships')
          .select('member_user_id, role, created_at')
          .eq('owner_user_id', sessionUserId);

        if (fallbackReviewers) {
          setMyReviewers(
            fallbackReviewers.map((row) => ({ ...row, member_email: FALLBACK_MEMBER_LABEL }))
          );
        }
      } else {
        setMyReviewers(reviewersData || []);
      }

      if (candidatesError) {
        console.warn('get_my_reviewee_candidates RPC failed, using direct query fallback:', candidatesError);
        // Fallback query
        const { data: fallbackCandidates } = await supabase
          .from('budget_memberships')
          .select('owner_user_id, role, created_at')
          .eq('member_user_id', sessionUserId);

        if (fallbackCandidates) {
          setRevieweeCandidates(
            fallbackCandidates.map((row) => ({ ...row, owner_email: FALLBACK_OWNER_LABEL }))
          );
        }
      } else {
        setRevieweeCandidates(candidatesData || []);
      }
    } catch (err) {
      console.warn('Membership query failed, falling back to local owner:', err);
      setError(err?.message || 'Failed to load membership data');
    } finally {
      initialLoadDone.current = true;
      if (!isSilent) {
        setAccessLoading(false);
      }
    }
  }, [sessionUserId]);


  useEffect(() => {
    initialLoadDone.current = false;
  }, [sessionUserId]);

  useEffect(() => {
    loadMembershipData(false);
  }, [loadMembershipData]);

  // Action: Add reviewer by email
  const addReviewer = async (email) => {
    if (!email || !email.trim()) {
      return { success: false, message: 'Please enter an email address.' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('add_budget_reviewer_by_email', {
        reviewer_email: email.trim(),
      });

      if (rpcError) {
        return { success: false, message: rpcError.message };
      }

      if (data && !data.success) {
        return { success: false, message: data.message };
      }

      await loadMembershipData(true);
      return { success: true, message: data?.message || 'Reviewer added successfully.' };
    } catch (err) {
      return { success: false, message: err?.message || 'Failed to add reviewer.' };
    }
  };

  // Action: Remove reviewer
  const removeReviewer = async (memberUserId) => {
    if (!memberUserId) return { success: false, message: 'Invalid member ID.' };

    try {
      const { data, error: rpcError } = await supabase.rpc('remove_budget_reviewer', {
        target_member_user_id: memberUserId,
      });

      if (rpcError) {
        // Fallback direct delete
        const { error: deleteError } = await supabase
          .from('budget_memberships')
          .delete()
          .eq('owner_user_id', sessionUserId)
          .eq('member_user_id', memberUserId);

        if (deleteError) {
          return { success: false, message: deleteError.message };
        }
      } else if (data && !data.success) {
        return { success: false, message: data.message };
      }

      await loadMembershipData(true);
      return { success: true, message: 'Reviewer removed.' };
    } catch (err) {
      return { success: false, message: err?.message || 'Failed to remove reviewer.' };
    }
  };

  return {
    budgetOwnerId: sessionUserId || '',
    role: 'owner',
    isOwner: true,
    myReviewers,
    revieweeCandidates,
    hasRevieweeCandidates: revieweeCandidates.length > 0,
    addReviewer,
    removeReviewer,
    refreshMembership: () => loadMembershipData(true),
    accessLoading,
    error,
  };
}

export { useMembership };

