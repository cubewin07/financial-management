import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Custom hook to manage the receipt queue for the current budget owner:
 * - Fetches pending and ready-for-review receipts
 * - Provides 1-tap Approve All and per-receipt approval
 * - Provides rejection/dismissal
 * - Subscribes to real-time changes so agent processing reflects instantly
 */
export default function useReceiptQueue({ userId, onExpensesAdded }) {
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!userId) {
      setQueueItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('receipt_queue')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['uploading', 'pending', 'processing', 'ready_for_review'])
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setQueueItems(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load receipt queue:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchQueue();

    if (!userId) return;

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
        (payload) => {
          fetchQueue();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Realtime] receipt_queue channel warning:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchQueue]);

  // Window focus and visibility listener to re-sync immediately on tab switch
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
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

  const totalReadyAmount = useMemo(() => {
    return readyReceipts.reduce((sum, item) => {
      const data = item.extracted_data;
      if (!data) return sum;
      if (typeof data.total === 'number') return sum + data.total;
      if (Array.isArray(data.items)) {
        const itemsSum = data.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        return sum + itemsSum;
      }
      return sum;
    }, 0);
  }, [readyReceipts]);

  // Approve a single receipt
  const approveReceipt = useCallback(
    async (receiptId, modifiedItems) => {
      const target = readyReceipts.find((r) => r.id === receiptId);
      if (!target) return;

      const itemsToInsert = (modifiedItems || target.extracted_data?.items || []).map((i) => ({
        amount: Number(i.amount) || 0,
        category: i.category || 'Other',
        date: i.date || new Date().toISOString().slice(0, 10),
        note: (i.note || i.item || target.extracted_data?.vendor || 'Receipt').trim(),
      })).filter((i) => i.amount > 0);

      if (itemsToInsert.length === 0) {
        throw new Error('No valid expense items found in receipt to approve.');
      }

      setIsApproving(true);
      try {
        if (onExpensesAdded) {
          await onExpensesAdded(itemsToInsert);
        }

        const { error: updateError } = await supabase
          .from('receipt_queue')
          .update({ status: 'completed' })
          .eq('id', receiptId);

        if (updateError) {
          console.error('Failed to mark queue item completed:', updateError);
        }

        // Optimistically remove from state
        setQueueItems((prev) => prev.filter((r) => r.id !== receiptId));
      } catch (err) {
        console.error('Error approving receipt:', err);
        setError(err.message);
        throw err;
      } finally {
        setIsApproving(false);
      }
    },
    [readyReceipts, onExpensesAdded]
  );

  // 1-Tap Approve All ready receipts
  const approveAll = useCallback(async () => {
    if (readyReceipts.length === 0) return;

    setIsApproving(true);
    try {
      const allItems = [];
      const receiptIds = [];

      for (const receipt of readyReceipts) {
        const vendor = receipt.extracted_data?.vendor || 'Receipt';
        const rawItems = receipt.extracted_data?.items || [];
        const validItems = rawItems
          .map((i) => ({
            amount: Number(i.amount) || 0,
            category: i.category || 'Other',
            date: i.date || new Date().toISOString().slice(0, 10),
            note: (i.note || i.item || vendor).trim(),
          }))
          .filter((i) => i.amount > 0);

        if (validItems.length > 0) {
          allItems.push(...validItems);
          receiptIds.push(receipt.id);
        }
      }

      if (allItems.length > 0 && onExpensesAdded) {
        await onExpensesAdded(allItems);
      }

      if (receiptIds.length > 0) {
        const { error: batchError } = await supabase
          .from('receipt_queue')
          .update({ status: 'completed' })
          .in('id', receiptIds);

        if (batchError) {
          console.error('Failed to batch update receipt queue items:', batchError);
        }
      }

      setQueueItems((prev) => prev.filter((r) => !receiptIds.includes(r.id)));
    } catch (err) {
      console.error('Error in approveAll:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsApproving(false);
    }
  }, [readyReceipts, onExpensesAdded]);

  // Dismiss / drop a receipt queue item
  const dismissReceipt = useCallback(async (receiptId) => {
    try {
      const { error: dismissError } = await supabase
        .from('receipt_queue')
        .update({ status: 'failed', error_message: 'Dismissed by user' })
        .eq('id', receiptId);

      if (dismissError) {
        throw dismissError;
      }

      setQueueItems((prev) => prev.filter((r) => r.id !== receiptId));
    } catch (err) {
      console.error('Failed to dismiss receipt:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    queueItems,
    readyReceipts,
    pendingCount,
    totalReadyAmount,
    loading,
    error,
    isApproving,
    approveReceipt,
    approveAll,
    dismissReceipt,
    refreshQueue: fetchQueue,
  };
}
