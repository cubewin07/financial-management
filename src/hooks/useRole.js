import useLocalStorage from './useLocalStorage';

export const ROLE_STORAGE_KEY = 'finance-role';

function normalizeRole(role) {
  return role === 'reviewer' ? 'reviewer' : 'owner';
}

function useRole({ useSupabase = false } = {}) {
  const [storedRole, setStoredRole] = useLocalStorage(ROLE_STORAGE_KEY, 'owner');
  const role = normalizeRole(storedRole);

  const setRole = (nextRole) => {
    if (useSupabase) {
      return;
    }

    setStoredRole(normalizeRole(nextRole));
  };

  return {
    role,
    isOwner: role === 'owner',
    isReviewer: role === 'reviewer',
    switchToOwner: () => setRole('owner'),
    switchToReviewer: () => setRole('reviewer'),
    setRole,
  };
}

export default useRole;
