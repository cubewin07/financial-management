import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isValid, parseISO } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { shouldTriggerVisibilitySync } from '../lib/connectionHealth';
import { computeReadyReceiptsTotal, formatStorageMb, getLocalDateString, roundCurrency } from '../utils/finance';

function normalizeReceiptDate(rawDate, fallbackDate = null) {
  for (const candidate of [rawDate, fallbackDate]) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && isValid(parseISO(trimmed))) {
        return trimmed;
      }
    }
  }
  return getLocalDateString();
}

/**
 * Custom hook to manage the receipt queue for the current budget owner:
 * - Fetches pending and ready-for-review receipts
 * - Dynamically loads exact storage bytes retained in Supabase Storage
 * - Provides 1-tap Approve All and per-receipt approval
 * - Provides rejection/dismissal
 * - Subscribes to real-time changes so agent processing reflects instantly
 */
export default function useReceiptQueue({ userId, onExpensesAdded }) {
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const activeUserRef = useRef(userId);
  const inFlightIdsRef = useRef(new Set());
  const approvingAllRef = useRef(false);

  useEffect(() => {
    activeUserRef.current = userId;
    inFlightIdsRef.current.clear();
    approvingAllRef.current = false;
    setQueueItems([]);
    setError(null);
    setLoading(Boolean(userId));
  }, [userId]);

  const fetchQueue = useCallback(async () => {
    const targetUserId = userId;
    if (!targetUserId) {
      setQueueItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('receipt_queue')
        .select('*')
        .eq('user_id', targetUserId)
        .in('status', ['uploading', 'pending', 'processing', 'ready_for_review', 'failed'])
        .order('created_at', { ascending: false });

      if (activeUserRef.current !== targetUserId) return;

      if (queryError) {
        throw queryError;
      }

      setQueueItems(data || []);
      setError(null);
    } catch (err) {
      if (activeUserRef.current !== targetUserId) return;
      console.error('Failed to load receipt queue:', err);
      setError(err.message);
    } finally {
      if (activeUserRef.current === targetUserId) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchQueue();

    if (!userId) return;

    let debounceTimer = null;
    const triggerDebouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchQueue();
      }, 300);
    };

    const channel = supabase
      .channel(`receipt_queue:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipt_queue',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          triggerDebouncedFetch();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Realtime] receipt_queue channel warning:', err);
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchQueue]);

  // Window focus and visibility listener to re-sync immediately on tab switch
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible' && shouldTriggerVisibilitySync('receiptQueue')) {
        fetchQueue();
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [fetchQueue]);

  // Split receipts into ready for review vs still pending processing
  const readyReceipts = useMemo(() => {
    return queueItems.filter((item) => item.status === 'ready_for_review' && item.extracted_data);
  }, [queueItems]);

  const pendingCount = useMemo(() => {
    return queueItems.filter((item) =>
      ['uploading', 'pending', 'processing'].includes(item.status)
    ).length;
  }, [queueItems]);

  const failedReceipts = useMemo(() => {
    return queueItems.filter(
      (item) => item.status === 'failed' && item.error_message !== 'Dismissed by user'
    );
  }, [queueItems]);

  const totalReadyAmount = useMemo(() => computeReadyReceiptsTotal(readyReceipts), [readyReceipts]);

  // Approve a single receipt
  const approveReceipt = useCallback(
    async (receiptId, modifiedItems) => {
      const lockKey = String(receiptId);
      if (approvingAllRef.current || inFlightIdsRef.current.has(lockKey)) return false;

      const target = readyReceipts.find((r) => String(r.id) === lockKey);
      if (!target) return false;

      const itemsToInsert = (modifiedItems || target.extracted_data?.items || []).map((i) => {
        const itemTitle = (i.item || i.name || '').trim();
        const itemNote = (i.note || '').trim();
        let finalNote = 'Receipt';

        if (itemTitle && itemNote && itemTitle.toLowerCase() !== itemNote.toLowerCase()) {
          finalNote = `${itemTitle} • ${itemNote}`;
        } else if (itemTitle) {
          finalNote = itemTitle;
        } else if (itemNote) {
          finalNote = itemNote;
        } else if (target.extracted_data?.vendor) {
          finalNote = target.extracted_data.vendor;
        }

        const parsedAmt = Number(i.amount);
        return {
          amount: Number.isFinite(parsedAmt) ? roundCurrency(parsedAmt) : 0,
          category: i.category || 'Other',
          date: normalizeReceiptDate(i.date, target.extracted_data?.date),
          note: finalNote,
        };
      }).filter((i) => i.amount > 0);

      if (itemsToInsert.length === 0) {
        throw new Error('No valid expense items found in receipt to approve.');
      }

      inFlightIdsRef.current.add(lockKey);
      setIsApproving(true);
      try {
        const { data: claimed, error: claimError } = await supabase
          .from('receipt_queue')
          .update({ status: 'completed' })
          .eq('id', receiptId)
          .eq('status', 'ready_for_review')
          .select('id');

        if (claimError) {
          throw new Error(`Could not lock receipt for approval: ${claimError.message}`);
        }
        if (!claimed?.length) {
          void fetchQueue();
          throw new Error('This receipt was already approved or dismissed.');
        }

        if (onExpensesAdded) {
          try {
            await onExpensesAdded(itemsToInsert);
          } catch (insertErr) {
            await supabase
              .from('receipt_queue')
              .update({ status: 'ready_for_review' })
              .eq('id', receiptId)
              .eq('status', 'completed');
            throw insertErr;
          }
        }

        // Only remove once confirmed saved
        setQueueItems((prev) => prev.filter((r) => String(r.id) !== lockKey));
        setError(null);
        return true;
      } catch (err) {
        console.error('Error approving receipt:', err);
        setError(err.message);
        throw err;
      } finally {
        inFlightIdsRef.current.delete(lockKey);
        setIsApproving(false);
      }
    },
    [readyReceipts, onExpensesAdded, fetchQueue]
  );

  // 1-Tap Approve All ready receipts
  const approveAll = useCallback(async () => {
    if (readyReceipts.length === 0 || approvingAllRef.current || inFlightIdsRef.current.size > 0) {
      return false;
    }

    approvingAllRef.current = true;
    setIsApproving(true);
    try {
      const itemsByReceiptId = new Map();
      const receiptIds = [];

      for (const receipt of readyReceipts) {
        const vendor = receipt.extracted_data?.vendor || 'Receipt';
        const rawItems = receipt.extracted_data?.items || [];
        const validItems = rawItems
          .map((i) => {
            const itemTitle = (i.item || i.name || '').trim();
            const itemNote = (i.note || '').trim();
            let finalNote = vendor;

            if (itemTitle && itemNote && itemTitle.toLowerCase() !== itemNote.toLowerCase()) {
              finalNote = `${itemTitle} • ${itemNote}`;
            } else if (itemTitle) {
              finalNote = itemTitle;
            } else if (itemNote) {
              finalNote = itemNote;
            }

            const parsedAmt = Number(i.amount);
            return {
              amount: Number.isFinite(parsedAmt) ? roundCurrency(parsedAmt) : 0,
              category: i.category || 'Other',
              date: normalizeReceiptDate(i.date, receipt.extracted_data?.date),
              note: finalNote,
            };
          })
          .filter((i) => i.amount > 0);

        if (validItems.length > 0) {
          itemsByReceiptId.set(String(receipt.id), validItems);
          receiptIds.push(receipt.id);
        }
      }

      if (itemsByReceiptId.size === 0 || receiptIds.length === 0) {
        const msg = 'No valid receipt items with amounts greater than $0 were found to approve.';
        setError(msg);
        throw new Error(msg);
      }

      const { data: claimed, error: batchClaimError } = await supabase
        .from('receipt_queue')
        .update({ status: 'completed' })
        .in('id', receiptIds)
        .eq('status', 'ready_for_review')
        .select('id');

      if (batchClaimError) {
        throw new Error(`Could not claim receipts for batch approval: ${batchClaimError.message}`);
      }
      if (!claimed?.length) {
        void fetchQueue();
        throw new Error('These receipts were already approved or dismissed.');
      }

      const claimedIds = claimed.map((row) => row.id);
      const claimedIdSet = new Set(claimedIds.map(String));
      const claimedItems = [];
      for (const rid of claimedIds) {
        const items = itemsByReceiptId.get(String(rid));
        if (items) claimedItems.push(...items);
      }

      if (onExpensesAdded && claimedItems.length > 0) {
        try {
          await onExpensesAdded(claimedItems);
        } catch (insertErr) {
          await supabase
            .from('receipt_queue')
            .update({ status: 'ready_for_review' })
            .in('id', claimedIds)
            .eq('status', 'completed');
          throw insertErr;
        }
      }

      setQueueItems((prev) => prev.filter((r) => !claimedIdSet.has(String(r.id))));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error in approveAll:', err);
      setError(err.message);
      throw err;
    } finally {
      approvingAllRef.current = false;
      setIsApproving(false);
    }
  }, [readyReceipts, onExpensesAdded, fetchQueue]);

  // Dismiss / drop a receipt queue item (delete DB row first, then purge storage best-effort)
  const dismissReceipt = useCallback(async (receiptId) => {
    try {
      const target = queueItems.find((r) => String(r.id) === String(receiptId));
      const { error: dismissError } = await supabase
        .from('receipt_queue')
        .delete()
        .eq('id', receiptId);

      if (dismissError) {
        throw dismissError;
      }

      setQueueItems((prev) => prev.filter((r) => String(r.id) !== String(receiptId)));

      if (target?.file_path) {
        try {
          const { error: storageErr } = await supabase.storage.from('receipts').remove([target.file_path]);
          if (storageErr) {
            console.warn('Storage purge on dismissal warning:', storageErr);
          }
        } catch (storageErr) {
          console.warn('Storage purge on dismissal warning:', storageErr);
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to dismiss receipt:', err);
      setError(err.message);
      throw err;
    }
  }, [queueItems]);

  // Permanently delete or dismiss a failed receipt item
  const dismissFailedReceipt = useCallback(async (receiptId) => {
    try {
      const target = queueItems.find((r) => String(r.id) === String(receiptId));
      const { error: delError } = await supabase
        .from('receipt_queue')
        .delete()
        .eq('id', receiptId);

      if (delError) throw delError;

      setQueueItems((prev) => prev.filter((r) => String(r.id) !== String(receiptId)));

      if (target?.file_path) {
        try {
          const { error: storageErr } = await supabase.storage.from('receipts').remove([target.file_path]);
          if (storageErr) {
            console.warn('Storage purge on dismissal warning:', storageErr);
          }
        } catch (storageErr) {
          console.warn('Storage purge on dismissal warning:', storageErr);
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to delete failed receipt record:', err);
      setError(err.message);
      throw err;
    }
  }, [queueItems]);

  const pendingStorageBytes = useMemo(() => {
    return queueItems.reduce((sum, item) => {
      if (['uploading', 'pending', 'processing'].includes(item.status)) {
        return sum + (item.extracted_data?.file_size || item.extracted_data?.compressed_size || 0);
      }
      return sum;
    }, 0);
  }, [queueItems]);

  const pendingStorageSize = useMemo(() => {
    if (pendingCount === 0 || pendingStorageBytes === 0) return '0 MB';
    return formatStorageMb(pendingStorageBytes);
  }, [pendingCount, pendingStorageBytes]);

  const clearError = useCallback(() => setError(null), []);

  return {
    queueItems,
    readyReceipts,
    pendingCount,
    failedReceipts,
    totalReadyAmount,
    pendingStorageBytes,
    pendingStorageSize,
    loading,
    error,
    clearError,
    isApproving,
    approveReceipt,
    approveAll,
    dismissReceipt,
    dismissFailedReceipt,
    refreshQueue: fetchQueue,
  };
}
