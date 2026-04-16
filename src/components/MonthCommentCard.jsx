function MonthCommentCard({ comment, monthLabel, onEdit, isReviewer }) {
  if (!comment) {
    return null;
  }

  return (
    <section className="section-shell section-shell-amber rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Monthly note from Dad</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {monthLabel}
          </h2>
        </div>
        {isReviewer ? (
          <button type="button" onClick={onEdit} className="btn-secondary">
            Edit note
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-[24px] border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.1)] px-5 py-4">
        <p className="text-sm leading-7 text-[var(--text-primary)]">{comment.body}</p>
      </div>
    </section>
  );
}

export default MonthCommentCard;
