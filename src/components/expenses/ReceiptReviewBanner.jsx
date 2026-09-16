import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Check, Eye, Clock, Sparkles, AlertCircle, X } from 'lucide-react';
import { formatCurrency } from '../../utils/finance';

export default function ReceiptReviewBanner({
  readyCount = 0,
  totalAmount = 0,
  pendingCount = 0,
  failedReceipts = [],
  pendingStorageSize = '0 MB',
  defaultCurrency = 'NZD',
  onApproveAll,
  onOpenReview,
  onDismissFailed,
  isApproving = false,
}) {
  if (readyCount === 0 && pendingCount === 0 && failedReceipts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full"
      >
        {/* Unreadable / Failed Receipt Notification Alert */}
        {failedReceipts.length > 0 && (
          <div className="mb-3 rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/60 to-slate-900/80 px-3.5 py-2.5 backdrop-blur-md flex items-center justify-between text-xs text-rose-300 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-rose-200">
                  {failedReceipts.length} receipt{failedReceipts.length > 1 ? 's' : ''} could not be read:
                </span>{' '}
                <span className="text-slate-300 truncate">
                  {failedReceipts[0].error_message || 'Unreadable or blurry docket.'}
                </span>
              </div>
            </div>
            {onDismissFailed && (
              <button
                type="button"
                onClick={() => onDismissFailed(failedReceipts[0].id)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-white px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition-colors shrink-0 ml-3 cursor-pointer"
                title="Dismiss this notification"
              >
                <X className="w-3 h-3" />
                <span>Dismiss</span>
              </button>
            )}
          </div>
        )}

        {readyCount > 0 ? (
          /* Ready For Review State */
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-purple-900/30 p-3.5 sm:p-4 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
            {/* Ambient background glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/15 blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
              {/* Left Side: Summary & Badge */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 shadow-inner">
                  <Receipt className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-300 border border-purple-400/20">
                      <Sparkles className="w-3 h-3 text-purple-300" />
                      Agent Processed
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        +{pendingCount} queued ({pendingStorageSize} retained)
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-100 truncate mt-0.5">
                    {readyCount} Receipt{readyCount > 1 ? 's' : ''} Ready for Review •{' '}
                    <span className="text-purple-300 font-bold">
                      {formatCurrency(totalAmount, defaultCurrency)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Side: Quick 1-Tap Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onOpenReview}
                  disabled={isApproving}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-200 border border-white/10 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Review</span>
                </button>

                <button
                  type="button"
                  onClick={onApproveAll}
                  disabled={isApproving}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white shadow-[0_0_18px_rgba(147,51,234,0.35)] transition-all disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve All (1-Tap)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : pendingCount > 0 ? (
          /* Pending Agent Processing Calm State */
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400/80 animate-pulse" />
              <span>
                <strong className="text-slate-200">{pendingCount}</strong> receipt
                {pendingCount > 1 ? 's' : ''} queued for evening agent processing
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/30">
              {pendingStorageSize} retained
            </span>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
