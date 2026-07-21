import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

export default function CommentDrawer({ open, onClose, expense, comments, onSubmitComment, role }) {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const canSubmitComment = role === 'reviewer' || role === 'owner';

  useEffect(() => {
    if (open) {
      setDraft('');
    }
  }, [open, expense?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmitComment || !draft.trim() || !expense) return;
    onSubmitComment(draft.trim());
    setDraft('');
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
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--outline-variant)] bg-[var(--surface-container-highest)] shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--outline-variant)] px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-container)] text-[var(--on-primary)]">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <p className="text-label-md text-[var(--on-surface-variant)]">Expense comments</p>
                  <h3 className="mt-1 text-headline-md text-[var(--on-surface)]">
                    {expense?.note || expense?.category || 'Selected expense'}
                  </h3>
                  {expense ? (
                    <p className="mt-2 text-label-sm text-[var(--on-surface-variant)]">
                      {expense.category} • {expense.date}
                    </p>
                  ) : null}
                </div>
              </div>

              <button type="button" onClick={onClose} className="btn-secondary px-3 py-1 text-label-md rounded-full">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const isReviewer = comment.author_role === 'reviewer';

                    return (
                      <div
                        key={comment.id}
                        className={`max-w-[88%] rounded-[22px] border px-4 py-3 ${
                          isReviewer
                            ? 'ml-auto border-[var(--tertiary)]/30 bg-[var(--tertiary)]/10 text-[var(--on-surface)]'
                            : 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--on-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-label-sm font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
                            {isReviewer ? 'Reviewer' : 'Owner'}
                          </p>
                          <span className="text-label-sm text-[var(--on-surface-variant)]">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-body-md leading-6 text-[var(--on-surface)]">{comment.body}</p>
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
              <form onSubmit={handleSubmit} className="border-t border-[var(--outline-variant)] px-5 py-5 sm:px-6">
                <label className="block">
                  <span className="mb-2 block text-label-md text-[var(--on-surface-variant)]">
                    {role === 'reviewer' ? 'Leave a note for this expense' : 'Reply or leave context'}
                  </span>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    placeholder={
                      role === 'reviewer'
                        ? 'Was this really necessary on a Monday?'
                        : 'Add context for this purchase'
                    }
                    className="input-shell min-h-[100px] resize-none w-full p-4"
                  />
                </label>

                <div className="mt-4 flex justify-end">
                  <button type="submit" className="btn-primary py-2 px-6" disabled={!expense || !draft.trim()}>
                    Leave comment
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
