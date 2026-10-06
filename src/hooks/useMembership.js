import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function normalizeSupabaseRole(role) {
  if (role === 'reviewer' || role === 'viewer') {
    return role;
  }
  return 'owner';
}

export default function useMembership({ sessionUserId }) {
  const [accessLoading, setAccessLoading] = useState(true);
  const [budgetOwnerId, setBudgetOwnerId] = useState('');
  const [role, setRole] = useState('owner');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionUserId) {
      setBudgetOwnerId('');
      setRole('owner');
      setAccessLoading(false);
      return;
    }

    let isMounted = true;

    const loadMembership = async () => {
      setAccessLoading(true);

      try {
        const { data, error } = await supabase
          .from('budget_memberships')
          .select('owner_user_id,role')
          .eq('member_user_id', sessionUserId)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          setError(error.message);
          setBudgetOwnerId(sessionUserId);
          setRole('owner');
          return;
        }

        if (data) {
          setBudgetOwnerId(data.owner_user_id);
          setRole(normalizeSupabaseRole(data.role));
        } else {
          setBudgetOwnerId(sessionUserId);
          setRole('owner');
        }

        setError('');
      } catch (err) {
        if (!isMounted) return;
        console.warn('Membership query failed, falling back to local owner:', err);
        setError(err.message || 'Unable to verify shared budget access');
        setBudgetOwnerId(sessionUserId);
        setRole('owner');
      } finally {
        if (isMounted) {
          setAccessLoading(false);
        }
      }
    };

    loadMembership();

    return () => {
      isMounted = false;
    };
  }, [sessionUserId]);

  return { budgetOwnerId, role, accessLoading, error };
}
