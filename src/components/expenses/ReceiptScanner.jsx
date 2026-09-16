import React, { useMemo } from 'react';
import { CustomFileInput } from '../ui/forms';
import { Sparkles, Clock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatStorageMb } from '../../utils/finance';

export default function ReceiptScanner({
  files = [],
  onFilesChange,
  onScan,
  onQueue,
  onCancel,
  isProcessing = false,
  isQueueing = false,
  queueStatus = '',
  queueSuccess = false,
  error = '',
}) {
  const isBusy = isProcessing || isQueueing;
  const count = files.length;

  const totalBytes = useMemo(() => {
    return (files || []).reduce((sum, f) => sum + (f.size || 0), 0);
  }, [files]);

  const formattedMb = useMemo(() => formatStorageMb(totalBytes), [totalBytes]);

  return (
    <div className="flex flex-col gap-5 items-center text-center py-2">
      <div>
        <h3 className="text-xl font-bold text-slate-100">Scan or Queue Receipt</h3>
        <p className="text-sm text-slate-400 mt-1">
          Drag & drop receipt image(s) here, or click to choose from your device.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div className="w-full">
        <CustomFileInput
          files={files}
          onChange={onFilesChange}
          accept="image/*,.pdf"
          disabled={isBusy}
          error={error}
        />
      </div>

      {/* Status banner if queueing or queued */}
      {queueStatus && (
        <div
          className={`w-full p-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border ${
            queueSuccess
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30'
          }`}
        >
          {queueSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : isQueueing ? (
            <span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          ) : (
            <Clock className="w-4 h-4 text-indigo-400" />
          )}
          <span>{queueStatus}</span>
        </div>
      )}

      {/* Two Action Paths when file(s) are present */}
      <div className="flex flex-col w-full gap-3 mt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {/* Option 1: Instant AI OCR */}
          <button
            type="button"
            onClick={() => onScan && onScan(files)}
            disabled={count === 0 || isBusy}
            className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 shadow-[0_0_20px_rgba(0,238,252,0.3)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                <span className="text-xs">Analyzing with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span className="text-xs sm:text-sm">
                  {count > 1 ? `Instant AI Scan (${count} Receipts)` : 'Instant AI Scan'}
                </span>
              </>
            )}
          </button>

          {/* Option 2: Queue for Scheduled Agent */}
          <button
            type="button"
            onClick={() => onQueue && onQueue(files)}
            disabled={count === 0 || isBusy || !onQueue}
            className="w-full py-3 px-4 rounded-xl font-semibold bg-indigo-950/50 hover:bg-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-200 border border-indigo-500/40 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isQueueing ? (
              <>
                <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                <span className="text-xs">Compressing & Queueing...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-indigo-300" />
                <span className="text-xs sm:text-sm">
                  {count > 1 ? `Queue All (${count} Receipts) (${formattedMb})` : `Queue for Agent (${formattedMb})`}
                </span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 py-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Manual Form</span>
        </button>
      </div>
    </div>
  );
}
