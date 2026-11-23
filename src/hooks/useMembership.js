import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function normalizeSupabaseRole(rawRole) {
  const role = (rawRole || 'owner').toLowerCase().trim();
  if (role === 'reviewer' || role === 'member' || role === 'read_only') {
    return 'reviewer';
  }
  return 'owner';
}

// Import & re-export fallback labels for local fallback use and backward compatibility
import { FALLBACK_OWNER_LABEL, FALLBACK_MEMBER_LABEL } from '../utils/reviewInsights.js';
export { FALLBACK_OWNER_LABEL, FALLBACK_MEMBER_LABEL };

export default function useMembership({ sessionUserId } = {}) {
  const [accessLoading, setAccessLoading] = useState(Boolean(sessionUserId));
  const [myReviewers, setMyReviewers] = useState([]);
  const [revieweeCandidates, setRevieweeCandidates] = useState([]);
  const [error, setError] = useState('');
  const initialLoadDone = useRef(false);
  const activeUserRef = useRef(sessionUserId);
  const requestIdRef = useRef(0);

  const loadMembershipData = useCallback(async (isSilent = false) => {
    const targetUserId = sessionUserId;
    const reqId = ++requestIdRef.current;

    if (!targetUserId) {
      setMyReviewers([]);
      setRevieweeCandidates([]);
      setError('');
      setAccessLoading(false);
      return;
    }

    if (!isSilent && !initialLoadDone.current) {
      setAccessLoading(true);
    }
    setError('');

    try {
      // People who review my budget, and budgets I review
      const [
        { data: reviewersData, error: reviewersError },
        { data: candidatesData, error: candidatesError },
      ] = await Promise.all([
        supabase.rpc('get_my_reviewers'),
        supabase.rpc('get_my_reviewee_candidates'),
      ]);
      if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;
      let loadError = null;

      if (reviewersError) {
        console.warn('get_my_reviewers RPC failed, using direct query fallback:', reviewersError);
        // Fallback for environments where RPC might not be migrated yet:
        // Try querying budget_memberships directly (no emails available via this path)
        const { data: fallbackReviewers, error: fallbackError } = await supabase
          .from('budget_memberships')
          .select('member_user_id, role, created_at')
          .eq('owner_user_id', targetUserId);

        if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;
        if (fallbackError) loadError = fallbackError;
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
        const { data: fallbackCandidates, error: fallbackError } = await supabase
          .from('budget_memberships')
          .select('owner_user_id, role, created_at')
          .eq('member_user_id', targetUserId);

        if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;
        if (fallbackError) loadError = loadError || fallbackError;
        if (fallbackCandidates) {
          setRevieweeCandidates(
            fallbackCandidates.map((row) => ({ ...row, owner_email: FALLBACK_OWNER_LABEL }))
          );
        }
      } else {
        setRevieweeCandidates(candidatesData || []);
      }

      if (loadError) setError(loadError.message || 'Failed to load membership data');
    } catch (err) {
      if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;
      console.warn('Membership query failed, falling back to local owner:', err);
      setError(err?.message || 'Failed to load membership data');
    } finally {
      if (activeUserRef.current === targetUserId && reqId === requestIdRef.current) {
        initialLoadDone.current = true;
        if (!isSilent) {
          setAccessLoading(false);
        }
      }
    }
  }, [sessionUserId]);


  useEffect(() => {
    activeUserRef.current = sessionUserId;
    requestIdRef.current += 1;
    initialLoadDone.current = false;
    setMyReviewers([]);
    setRevieweeCandidates([]);
    setError('');
    setAccessLoading(Boolean(sessionUserId));
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
    myReviewers,
    revieweeCandidates,
    addReviewer,
    removeReviewer,
    refreshMembership: () => loadMembershipData(true),
    accessLoading,
    error,
  };
}

export { useMembership };

