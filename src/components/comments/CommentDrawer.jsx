import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, ArrowRight, Zap } from 'lucide-react';
import { CustomTextarea } from '../ui/forms';
import { displayName } from '../../utils/reviewInsights';

export default function CommentDrawer({
  open,
  onClose,
  expense,
  comments = [],
  onSubmitComment,
  role,
  quickReplies = [],
  onNextExpense = null,
  hasNextExpense = false,
}) {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Role-based comment permission gating (owner or reviewer only)
  const canSubmitComment = role === 'reviewer' || role === 'owner';

  // Esc key, body scroll lock, and cleanup
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setDraft('');
      setSubmitError('');
    }
  }, [open, expense?.id]);

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    if (!canSubmitComment || !draft.trim() || !expense || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onSubmitComment(draft.trim());
      setDraft('');
    } catch (err) {
      setSubmitError(err?.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickReplyTap = async (reply) => {
    const text = typeof reply === 'string' ? reply : reply.text;
    const isAutoSend = typeof reply === 'object' ? reply.autoSend : text === 'Looks fine';

    if (isAutoSend && canSubmitComment && expense && !isSubmitting) {
      setIsSubmitting(true);
      setSubmitError('');
      try {
        await onSubmitComment(text);
        setDraft('');
      } catch (err) {
        setSubmitError(err?.message || 'Failed to post quick reply.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setDraft(text);
      if (submitError) setSubmitError('');
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[170] bg-[var(--surface-container-lowest)]/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          onClick={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-drawer-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--outline-variant)] bg-[var(--surface-container-highest)] shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--outline-variant)] px-5 py-5 sm:px-6">
              <div className="space-y-1.5 min-w-0">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-container)] text-[var(--on-primary)]">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <p className="text-label-md text-[var(--on-surface-variant)]">Expense comments</p>
                  <h3 id="comment-drawer-title" className="mt-1 text-headline-md text-[var(--on-surface)] truncate">
                    {expense?.item || expense?.note || expense?.category || 'Selected expense'}
                  </h3>
                  {expense ? (
                    <p className="mt-1 text-label-sm text-[var(--on-surface-variant)] truncate">
                      {expense.category} • {expense.date}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onNextExpense && hasNextExpense && (
                  <button
                    type="button"
                    onClick={onNextExpense}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight size={13} />
                  </button>
                )}
                <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-label-md rounded-full">
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const isReviewer = comment.author_role === 'reviewer';
                    const authorTitle = isReviewer
                      ? (comment.author_email ? displayName(comment.author_email) : 'Reviewer')
                      : 'Owner';

                    return (
                      <div
                        key={comment.id}
                        className={`max-w-[88%] rounded-[22px] border px-4 py-3 ${
                          isReviewer
                            ? 'ml-auto border-[var(--tertiary)]/30 bg-[var(--tertiary)]/10 text-[var(--on-surface)]'
                            : 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--on-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <p className="text-label-sm font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
                            {authorTitle}
                          </p>
                          <span className="text-label-sm text-[var(--on-surface-variant)]">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-body-md leading-6 text-[var(--on-surface)] whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-card rounded-[24px] p-5 text-body-md text-[var(--on-surface-variant)]">
                    No comments yet.
                  </div>
                )}
              </div>
            </div>

            {canSubmitComment ? (
              <form onSubmit={handleSubmit} className="border-t border-[var(--outline-variant)] px-5 py-5 sm:px-6 space-y-3">
                {quickReplies && quickReplies.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {quickReplies.map((reply) => {
                      const text = typeof reply === 'string' ? reply : reply.text;
                      const isAuto = typeof reply === 'object' ? reply.autoSend : text === 'Looks fine';

                      return (
                        <button
                          key={text}
                          type="button"
                          onClick={() => handleQuickReplyTap(reply)}
                          disabled={isSubmitting}
                          title={isAuto ? 'Tap to instantly send this note' : 'Tap to insert text'}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                            isAuto
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] border border-[var(--outline-variant)]/60'
                          }`}
                        >
                          {isAuto && <Zap size={11} className="text-emerald-400" />}
                          <span>{text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <CustomTextarea
                  label={role === 'reviewer' ? 'Leave a note for this expense' : 'Reply or leave context'}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (submitError) setSubmitError('');
                  }}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder={
                    role === 'reviewer'
                      ? 'e.g. Looks good, or was this a one-off?'
                      : 'Add context for this purchase'
                  }
                />

                {submitError ? (
                  <p className="text-xs text-rose-400">{submitError}</p>
                ) : null}

                <div className="flex items-center justify-between pt-1">
                  {onNextExpense && hasNextExpense ? (
                    <button
                      type="button"
                      onClick={onNextExpense}
                      className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Skip to next unreviewed →
                    </button>
                  ) : <span />}

                  <button
                    type="submit"
                    className="btn-primary py-2 px-5 text-xs sm:text-sm font-bold"
                    disabled={!expense || !draft.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Posting...' : 'Post comment'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-[var(--outline-variant)] px-5 py-5 text-body-md text-[var(--on-surface-variant)] sm:px-6">
                Comments are read-only for your role.
              </div>
            )}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
