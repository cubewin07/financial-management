import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function useMembership({ sessionUserId } = {}) {
  const [accessLoading, setAccessLoading] = useState(true);
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
        // Fallback for environments where RPC might not be migrated yet:
        // Try querying budget_memberships directly
        const { data: fallbackReviewers } = await supabase
          .from('budget_memberships')
          .select('member_user_id, role, created_at')
          .eq('owner_user_id', sessionUserId);

        if (fallbackReviewers) {
          setMyReviewers(fallbackReviewers);
        }
      } else {
        setMyReviewers(reviewersData || []);
      }

      if (candidatesError) {
        // Fallback query
        const { data: fallbackCandidates } = await supabase
          .from('budget_memberships')
          .select('owner_user_id, role, created_at')
          .eq('member_user_id', sessionUserId);

        if (fallbackCandidates) {
          setRevieweeCandidates(fallbackCandidates);
        }
      } else {
        setRevieweeCandidates(candidatesData || []);
      }
    } catch (err) {
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

