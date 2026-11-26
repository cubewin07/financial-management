import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { shouldTriggerVisibilitySync } from '../lib/connectionHealth';
import { roundCurrency } from '../utils/finance';
import {
  isMissingInvestmentMetadataColumn,
  normalizeInvestmentCurrency,
  normalizeInvestmentRow,
  sanitizeScopedLegacyAssets,
} from '../utils/investments';

export const SCOPED_LEGACY_KEY_PREFIX = 'financial_mgt_portfolio_assets:';

export default function useInvestments({
  userId = null,
  defaultCurrency = 'NZD',
  client = supabase,
} = {}) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');

  const activeUserRef = useRef(userId);
  const requestIdRef = useRef(0);
  const migratedUsersRef = useRef(new Set());
  const defaultCurrencyRef = useRef(defaultCurrency);
  defaultCurrencyRef.current = defaultCurrency;

  const insertLegacyScopedAssets = useCallback(
    async (targetUserId, legacyItems) => {
      const fullRows = legacyItems.map((item) => ({
        user_id: targetUserId,
        name: item.name,
        category: item.category,
        market_value: item.market_value,
        currency: item.currency,
        is_liquid: item.is_liquid,
      }));

      let res = await client.from('investments').insert(fullRows).select('*');
      if (isMissingInvestmentMetadataColumn(res.error)) {
        const baseRows = legacyItems.map((item) => ({
          user_id: targetUserId,
          name: item.name,
          market_value: item.market_value,
          currency: item.currency,
        }));
        res = await client.from('investments').insert(baseRows).select('*');
        if (!res.error && Array.isArray(res.data)) {
          res = {
            ...res,
            data: res.data.map((row, idx) => ({
              ...row,
              category: legacyItems[idx]?.category ?? row.category ?? 'Other',
              is_liquid: legacyItems[idx]?.is_liquid ?? row.is_liquid ?? true,
            })),
          };
        }
      }
      return res;
    },
    [client],
  );

  const loadInvestments = useCallback(
    async (silent = false) => {
      const targetUserId = userId;
      const reqId = ++requestIdRef.current;

      if (!targetUserId) {
        if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;
        setInvestments([]);
        setError('');
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const { data, error: fetchError } = await client
          .from('investments')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;

        if (fetchError) {
          setError(fetchError.message || 'Failed to load investments');
          return;
        }

        const fallbackCurrency = defaultCurrencyRef.current;

        // One-time migration of user-scoped legacy browser assets when DB is empty.
        // Never reads the unscoped global key so accounts on the same device stay isolated.
        if (
          Array.isArray(data) &&
          data.length === 0 &&
          !migratedUsersRef.current.has(targetUserId) &&
          typeof localStorage !== 'undefined'
        ) {
          migratedUsersRef.current.add(targetUserId);
          const scopedKey = `${SCOPED_LEGACY_KEY_PREFIX}${targetUserId}`;
          let legacyItems = [];
          try {
            const rawScoped = localStorage.getItem(scopedKey);
            if (rawScoped !== null) {
              legacyItems = sanitizeScopedLegacyAssets(JSON.parse(rawScoped), fallbackCurrency);
            }
          } catch {
            legacyItems = [];
          }

          if (legacyItems.length > 0) {
            const { data: insertedRows, error: insertError } = await insertLegacyScopedAssets(
              targetUserId,
              legacyItems,
            );

            if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;

            if (!insertError && Array.isArray(insertedRows)) {
              try {
                localStorage.removeItem(scopedKey);
              } catch {
                // ignore storage removal failures
              }
              setInvestments(
                insertedRows.map((row) => normalizeInvestmentRow(row, fallbackCurrency)),
              );
              setError('');
              return;
            }
          }
        }

        setInvestments((data || []).map((row) => normalizeInvestmentRow(row, fallbackCurrency)));
        setError('');
      } catch (err) {
        if (activeUserRef.current !== targetUserId || reqId !== requestIdRef.current) return;
        setError(err?.message || 'Failed to load investments');
      } finally {
        if (activeUserRef.current === targetUserId && reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [userId, client, insertLegacyScopedAssets],
  );

  useEffect(() => {
    activeUserRef.current = userId;
    requestIdRef.current += 1;
    setInvestments([]);
    setError('');
    setLoading(Boolean(userId));

    loadInvestments(false);

    if (!userId) return undefined;

    const channel =
      typeof client?.channel === 'function'
        ? client
            .channel(`investments:${userId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'investments',
                filter: `user_id=eq.${userId}`,
              },
              () => {
                loadInvestments(true);
              },
            )
            .subscribe((_status, err) => {
              if (err) {
                console.warn('[Realtime] investments channel warning:', err);
              }
            })
        : null;

    const handleSync = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        shouldTriggerVisibilitySync(`investments:${userId}`)
      ) {
        loadInvestments(true);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleSync);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleSync);
    }

    return () => {
      if (channel && typeof client?.removeChannel === 'function') {
        client.removeChannel(channel);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleSync);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleSync);
      }
    };
  }, [userId, client, loadInvestments]);

  const addInvestment = async (input) => {
    const targetUserId = userId;
    if (!targetUserId) {
      const msg = 'Sign in before adding an asset.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }

    const name = String(input?.name ?? '').trim();
    const rawValue = input?.market_value ?? input?.value;
    const parsedValue = Number(rawValue);
    const marketValue = Number.isFinite(parsedValue) ? roundCurrency(parsedValue) : NaN;
    if (!name || rawValue === '' || rawValue === null || rawValue === undefined || !Number.isFinite(marketValue) || marketValue < 0) {
      const msg = 'Asset name and a valid value of 0 or greater are required.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }

    const category = String(input?.category ?? '').trim() || 'Other';
    const currency = normalizeInvestmentCurrency(input?.currency, defaultCurrencyRef.current);
    const isLiquid =
      input?.is_liquid !== undefined
        ? Boolean(input.is_liquid)
        : Boolean(input?.isLiquid ?? true);

    requestIdRef.current += 1;

    try {
      let res = await client
        .from('investments')
        .insert({
          user_id: targetUserId,
          name,
          category,
          market_value: marketValue,
          currency,
          is_liquid: isLiquid,
        })
        .select('*')
        .single();

      if (isMissingInvestmentMetadataColumn(res.error)) {
        res = await client
          .from('investments')
          .insert({
            user_id: targetUserId,
            name,
            market_value: marketValue,
            currency,
          })
          .select('*')
          .single();
        if (!res.error && res.data) {
          res = {
            ...res,
            data: {
              ...res.data,
              category,
              is_liquid: isLiquid,
            },
          };
        }
      }

      if (activeUserRef.current !== targetUserId) {
        return { data: null, error: { message: 'Active account changed.' } };
      }

      if (res.error) {
        const msg = res.error.message || 'Could not save asset.';
        setError(msg);
        return { data: null, error: res.error };
      }

      const created = normalizeInvestmentRow(res.data, currency);
      requestIdRef.current += 1;
      setInvestments((prev) => [created, ...prev]);
      setError('');
      return { data: created, error: null };
    } catch (err) {
      if (activeUserRef.current !== targetUserId) {
        return { data: null, error: { message: 'Active account changed.' } };
      }
      const msg = err?.message || 'Could not save asset.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }
  };

  const updateInvestment = async (id, input) => {
    const targetUserId = userId;
    if (!targetUserId) {
      const msg = 'Sign in before updating an asset.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }

    if (id === null || id === undefined || id === '') {
      const msg = 'Asset ID is required.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }

    const name = String(input?.name ?? '').trim();
    const rawValue = input?.market_value ?? input?.value;
    const parsedValue = Number(rawValue);
    const marketValue = Number.isFinite(parsedValue) ? roundCurrency(parsedValue) : NaN;
    if (!name || rawValue === '' || rawValue === null || rawValue === undefined || !Number.isFinite(marketValue) || marketValue < 0) {
      const msg = 'Asset name and a valid value of 0 or greater are required.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }

    const category = String(input?.category ?? '').trim() || 'Other';
    const currency = normalizeInvestmentCurrency(input?.currency, defaultCurrencyRef.current);
    const isLiquid =
      input?.is_liquid !== undefined
        ? Boolean(input.is_liquid)
        : Boolean(input?.isLiquid ?? true);
    const updatedAt = new Date().toISOString();

    requestIdRef.current += 1;

    try {
      let res = await client
        .from('investments')
        .update({
          name,
          category,
          market_value: marketValue,
          currency,
          is_liquid: isLiquid,
          updated_at: updatedAt,
        })
        .eq('id', id)
        .eq('user_id', targetUserId)
        .select('*')
        .single();

      if (isMissingInvestmentMetadataColumn(res.error)) {
        res = await client
          .from('investments')
          .update({
            name,
            market_value: marketValue,
            currency,
            updated_at: updatedAt,
          })
          .eq('id', id)
          .eq('user_id', targetUserId)
          .select('*')
          .single();
        if (!res.error && res.data) {
          res = {
            ...res,
            data: {
              ...res.data,
              category,
              is_liquid: isLiquid,
            },
          };
        }
      }

      if (activeUserRef.current !== targetUserId) {
        return { data: null, error: { message: 'Active account changed.' } };
      }

      if (res.error) {
        const msg = res.error.message || 'Could not update asset.';
        setError(msg);
        return { data: null, error: res.error };
      }

      const updated = normalizeInvestmentRow(res.data, currency);
      requestIdRef.current += 1;
      setInvestments((prev) =>
        prev.map((item) => (String(item.id) === String(id) ? updated : item)),
      );
      setError('');
      return { data: updated, error: null };
    } catch (err) {
      if (activeUserRef.current !== targetUserId) {
        return { data: null, error: { message: 'Active account changed.' } };
      }
      const msg = err?.message || 'Could not update asset.';
      setError(msg);
      return { data: null, error: { message: msg } };
    }
  };

  const deleteInvestment = async (id) => {
    const targetUserId = userId;
    if (!targetUserId) {
      const msg = 'Sign in before removing an asset.';
      setError(msg);
      return { error: { message: msg } };
    }

    if (id === null || id === undefined || id === '') {
      const msg = 'Asset ID is required.';
      setError(msg);
      return { error: { message: msg } };
    }

    requestIdRef.current += 1;

    try {
      const { error: deleteError } = await client
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', targetUserId);

      if (activeUserRef.current !== targetUserId) {
        return { error: { message: 'Active account changed.' } };
      }

      if (deleteError) {
        const msg = deleteError.message || 'Could not remove asset.';
        setError(msg);
        return { error: deleteError };
      }

      requestIdRef.current += 1;
      setInvestments((prev) => prev.filter((item) => String(item.id) !== String(id)));
      setError('');
      return { error: null };
    } catch (err) {
      if (activeUserRef.current !== targetUserId) {
        return { error: { message: 'Active account changed.' } };
      }
      const msg = err?.message || 'Could not remove asset.';
      setError(msg);
      return { error: { message: msg } };
    }
  };

  return {
    investments,
    loading,
    error,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    reloadInvestments: () => loadInvestments(false),
  };
}
