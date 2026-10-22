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

  /**
   * Internal helper to execute the two-phase upload handshake for a single file.
   */
  const executeSingleUpload = useCallback(async (file, userId, onStatusUpdate) => {
    if (!file) throw new Error('No file provided for upload');
    if (!userId || userId === 'local-owner') {
      throw new Error('Please sign in to queue receipts for agent processing');
    }

    onStatusUpdate?.('Compressing & preparing...');

    let receiptId = null;
    let filePath = null;
    let dbRowCreated = false;
    let storageUploaded = false;

    try {
      // 1. Client-side compression or pass-through
      const { file: compressedFile, originalSize, compressedSize, isPdf } = await compressReceiptImage(file);
      const isDocumentPdf = Boolean(isPdf || file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'));

      let ext = 'webp';
      if (isDocumentPdf) {
        ext = 'pdf';
      } else if (compressedFile.type === 'image/webp') {
        ext = 'webp';
      } else if (compressedFile.type === 'image/jpeg' || compressedFile.type === 'image/jpg') {
        ext = 'jpg';
      } else if (compressedFile.type === 'image/png') {
        ext = 'png';
      } else if (compressedFile.type === 'image/heic' || file.name?.toLowerCase().endsWith('.heic')) {
        ext = 'heic';
      } else if (compressedFile.type === 'image/heif' || file.name?.toLowerCase().endsWith('.heif')) {
        ext = 'heif';
      } else if (file.name && file.name.includes('.')) {
        ext = file.name.split('.').pop().toLowerCase();
      }

      const contentType = isDocumentPdf
        ? 'application/pdf'
        : (compressedFile.type || (ext === 'heic' ? 'image/heic' : ext === 'heif' ? 'image/heif' : ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp'));

      const fileId = generateUuid();
      filePath = `${userId}/${fileId}.${ext}`;

      // 2. Pre-insert queue row with status 'uploading'
      onStatusUpdate?.('Registering in queue...');
      const { data: insertedRow, error: insertError } = await supabase
        .from('receipt_queue')
        .insert({
          user_id: userId,
          file_path: filePath,
          status: 'uploading',
          extracted_data: {
            file_size: compressedSize,
            original_size: originalSize,
            is_pdf: isDocumentPdf,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Queue registration failed: ${insertError.message}`);
      }
      receiptId = insertedRow.id;
      dbRowCreated = true;

      // 3. Upload image to Supabase Storage
      onStatusUpdate?.('Uploading document...');
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
      onStatusUpdate?.('Finalizing queue status...');
      const { error: updateError } = await supabase
        .from('receipt_queue')
        .update({ status: 'pending' })
        .eq('id', receiptId);

      if (updateError) {
        throw new Error(`Status update failed: ${updateError.message}`);
      }

      return {
        receiptId,
        filePath,
        originalSize,
        compressedSize,
        status: 'pending',
      };
    } catch (err) {
      console.error('Receipt upload handshake error:', err);

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
    }
  }, []);

  /**
   * Batch uploader that holds isUploading = true across all files to prevent UI flickering
   * and blocks duplicate clicks, returning a detailed summary of successful and failed files.
   */
  const uploadReceipts = useCallback(async (files, userId, onProgress) => {
    if (!files || files.length === 0) {
      return { successCount: 0, failCount: 0, failedFiles: [], totalUploadedBytes: 0, lastErrorMessage: '', results: [] };
    }
    if (!userId || userId === 'local-owner') {
      throw new Error('Please sign in to queue receipts for agent processing');
    }

    setIsUploading(true);
    setError(null);

    const summary = {
      successCount: 0,
      failCount: 0,
      failedFiles: [],
      totalUploadedBytes: 0,
      lastErrorMessage: '',
      results: [],
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePrefix = files.length > 1 ? `[${i + 1}/${files.length}] ` : '';
        setStatusMessage(`${filePrefix}Preparing...`);

        if (onProgress) {
          onProgress({ current: i + 1, total: files.length, file });
        }

        try {
          const res = await executeSingleUpload(file, userId, (subStatus) => {
            setStatusMessage(`${filePrefix}${subStatus}`);
          });

          summary.successCount++;
          summary.totalUploadedBytes += (res.compressedSize || file.size || 0);
          summary.results.push(res);
          setLastUploaded(res);
        } catch (err) {
          summary.failCount++;
          summary.failedFiles.push(file);
          summary.lastErrorMessage = err?.message || 'Upload failed';
          console.error(`Failed to upload ${file.name || 'file'}:`, err);
        }
      }

      if (summary.failCount > 0) {
        setError(summary.lastErrorMessage);
      } else {
        setStatusMessage(files.length > 1 ? `All ${files.length} receipts queued successfully!` : 'Queued successfully!');
      }

      return summary;
    } finally {
      setIsUploading(false);
    }
  }, [executeSingleUpload]);

  /**
   * Single file upload handler (backward-compatible)
   */
  const uploadReceipt = useCallback(async (file, userId) => {
    const summary = await uploadReceipts([file], userId);
    if (summary.failCount > 0) {
      throw new Error(summary.lastErrorMessage || 'Upload failed');
    }
    return summary.results[0];
  }, [uploadReceipts]);

  const reset = useCallback(() => {
    setError(null);
    setStatusMessage('');
    setLastUploaded(null);
  }, []);

  return {
    uploadReceipt,
    uploadReceipts,
    isUploading,
    statusMessage,
    error,
    lastUploaded,
    reset,
  };
}
