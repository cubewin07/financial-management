import { useEffect, useState } from 'react';
import { FALLBACK_RATES } from '../utils/exchangeRates';
import { loadExchangeRates, readCachedRates } from '../lib/exchangeRates';

export default function useExchangeRates() {
  const [rates, setRates] = useState(() => readCachedRates()?.rates || FALLBACK_RATES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadExchangeRates().then((nextRates) => {
      if (!isMounted) return;
      setRates(nextRates);
      setReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return { rates, ready };
}
