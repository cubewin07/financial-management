function RoleSwitcher({ role, onSwitchToOwner, onSwitchToReviewer }) {
  const isReviewer = role === 'reviewer';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium ${
          isReviewer
            ? 'border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.12)] text-[var(--accent-amber)]'
            : 'border-[rgba(45,212,191,0.24)] bg-[rgba(45,212,191,0.12)] text-[var(--accent-teal)]'
        }`}
      >
        Viewing as: {isReviewer ? 'Dad' : 'Owner'}
      </div>

      <button
        type="button"
        onClick={isReviewer ? onSwitchToOwner : onSwitchToReviewer}
        className="btn-secondary"
      >
        {isReviewer ? 'Switch back' : 'Switch to reviewer mode'}
      </button>
    </div>
  );
}

export default RoleSwitcher;

