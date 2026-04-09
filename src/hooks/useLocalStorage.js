import { useEffect, useState } from 'react';

function readStoredValue(key, initialValue) {
  if (typeof window === 'undefined') {
    return initialValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch {
    return initialValue;
  }
}

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => readStoredValue(key, initialValue));

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
