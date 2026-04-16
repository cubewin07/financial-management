import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10H17M7 14H13M20 12C20 16.4183 16.4183 20 12 20C10.4525 20 9.00755 19.5608 7.78219 18.8008L4 20L5.19922 16.2178C4.43923 14.9924 4 13.5475 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentDrawer({ open, onClose, expense, comments, onSubmitComment, role }) {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const canSubmitReview = role === 'reviewer';

  useEffect(() => {
    if (open) {
      setDraft('');
    }
  }, [open, expense?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSubmitReview || !draft.trim() || !expense) {
      return;
    }

    onSubmitComment(draft.trim());
    setDraft('');
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[170] bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          onClick={onClose}
        >
          <motion.aside
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-[var(--border)] bg-[rgba(19,19,26,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(124,111,224,0.22)] bg-[rgba(124,111,224,0.12)] text-[var(--accent-purple)]">
                  <ChatIcon />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Expense comments</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {expense?.note || expense?.category || 'Selected expense'}
                  </h3>
                  {expense ? (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {expense.category} • {expense.date}
                    </p>
                  ) : null}
                </div>
              </div>

              <button type="button" onClick={onClose} className="btn-secondary">
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
                            ? 'ml-auto border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.12)] text-[var(--text-primary)]'
                            : 'border-[rgba(45,212,191,0.22)] bg-[rgba(45,212,191,0.12)] text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            {isReviewer ? 'Dad' : 'Owner'}
                          </p>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6">{comment.body}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="surface-panel rounded-[24px] p-5 text-sm text-[var(--text-secondary)]">
                    No comments yet.
                  </div>
                )}
              </div>
            </div>

            {canSubmitReview ? (
              <form onSubmit={handleSubmit} className="border-t border-[var(--border)] px-5 py-5 sm:px-6">
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    Leave a note for this expense
                  </span>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    placeholder="Was this really necessary on a Monday?"
                    className="input-shell min-h-[132px] resize-none"
                  />
                </label>

                <div className="mt-4 flex justify-end">
                  <button type="submit" className="btn-primary" disabled={!expense || !draft.trim()}>
                    Leave comment
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-[var(--border)] px-5 py-5 text-sm text-[var(--text-secondary)] sm:px-6">
                Comments are read-only for your role.
              </div>
            )}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default CommentDrawer;

