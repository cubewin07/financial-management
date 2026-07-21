function MonthCommentCard({ comment, monthLabel, onEdit, isReviewer }) {
  if (!comment) {
    return null;
  }

  return (
    <section className="glass-card rounded-[28px] p-6 sm:p-7 border border-[var(--tertiary)]/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-md text-[var(--on-surface-variant)]">Monthly note from Reviewer</p>
          <h2 className="mt-1 text-headline-md text-[var(--on-surface)]">
            {monthLabel}
          </h2>
        </div>
        {isReviewer ? (
          <button type="button" onClick={onEdit} className="btn-secondary px-4 py-2">
            Edit note
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--tertiary)]/30 bg-[var(--tertiary)]/10 px-5 py-4 text-[var(--on-surface)]">
        <p className="text-body-md leading-7">{comment.body}</p>
      </div>
    </section>
  );
}

export default MonthCommentCard;
