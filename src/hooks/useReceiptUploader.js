import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { compressReceiptImage } from '../utils/imageCompression';

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Custom hook implementing the Two-Phase Receipt Upload Handshake:
 * 1. Client-side WebP compression (~250KB) or PDF pass-through
 * 2. Pre-insert queue item with status = 'uploading'
 * 3. Upload file to Supabase Storage receipts/{userId}/{receiptId}.{webp|pdf}
 * 4. Update queue item to status = 'pending'
 * 5. Automatic rollback on failure (purges storage or deletes queue record)
 */
export default function useReceiptUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [lastUploaded, setLastUploaded] = useState(null);

  const uploadReceipt = useCallback(async (file, userId) => {
    if (!file) {
      throw new Error('No file provided for upload');
    }
    if (!userId) {
      throw new Error('User ID required for receipt upload');
    }

    setIsUploading(true);
    setError(null);
    setStatusMessage('Preparing document...');

    let receiptId = null;
    let filePath = null;
    let dbRowCreated = false;
    let storageUploaded = false;

    try {
      // 1. Client-side compression or PDF pass-through
      const { file: compressedFile, originalSize, compressedSize, isPdf } = await compressReceiptImage(file);
      const isDocumentPdf = Boolean(isPdf || file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'));
      const ext = isDocumentPdf ? 'pdf' : (compressedFile.type === 'image/webp' ? 'webp' : 'jpg');
      const contentType = isDocumentPdf ? 'application/pdf' : (compressedFile.type || 'image/webp');

      receiptId = generateUuid();
      filePath = `${userId}/${receiptId}.${ext}`;

      // 2. Pre-insert queue row with status 'uploading'
      setStatusMessage('Registering upload in queue...');
      const { error: insertError } = await supabase
        .from('receipt_queue')
        .insert({
          id: receiptId,
          user_id: userId,
          file_path: filePath,
          status: 'uploading',
          extracted_data: {
            file_size: compressedSize,
            original_size: originalSize,
            is_pdf: isDocumentPdf,
          },
        });

      if (insertError) {
        throw new Error(`Queue registration failed: ${insertError.message}`);
      }
      dbRowCreated = true;

      // 3. Upload image to Supabase Storage
      setStatusMessage('Uploading compressed receipt...');
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .upload(filePath, compressedFile, {
          contentType,
          upsert: false,
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }
      storageUploaded = true;

      // 4. Update status to 'pending'
      setStatusMessage('Queueing for agent processing...');
      const { error: updateError } = await supabase
        .from('receipt_queue')
        .update({ status: 'pending' })
        .eq('id', receiptId);

      if (updateError) {
        throw new Error(`Status update failed: ${updateError.message}`);
      }

      const result = {
        receiptId,
        filePath,
        originalSize,
        compressedSize,
        status: 'pending',
      };

      setLastUploaded(result);
      setStatusMessage('Queued successfully!');
      return result;
    } catch (err) {
      console.error('Receipt upload handshake error:', err);
      const message = err.message || 'Upload failed';
      setError(message);

      // Rollback handling
      if (storageUploaded && filePath) {
        try {
          await supabase.storage.from('receipts').remove([filePath]);
        } catch (storageCleanupErr) {
          console.error('Rollback storage cleanup error:', storageCleanupErr);
        }
      }

      if (dbRowCreated && receiptId) {
        try {
          await supabase.from('receipt_queue').delete().eq('id', receiptId);
        } catch (dbCleanupErr) {
          console.error('Rollback database cleanup error:', dbCleanupErr);
        }
      }

      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setStatusMessage('');
    setLastUploaded(null);
  }, []);

  return {
    uploadReceipt,
    isUploading,
    statusMessage,
    error,
    lastUploaded,
    reset,
  };
}
