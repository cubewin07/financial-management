import { Loader2, AlertTriangle, Inbox } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[240px] space-y-3">
      <Loader2 size={32} className="text-[var(--primary)] animate-spin" />
      <p className="text-body-md text-[var(--on-surface-variant)]">{message}</p>
    </div>
  );
}

export function EmptyState({ title = 'No data found', description = 'There are no items to display yet.', action }) {
  return (
    <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[240px] space-y-3">
      <div className="w-12 h-12 rounded-full bg-[rgba(208,188,255,0.1)] text-[var(--primary)] flex items-center justify-center mb-1">
        <Inbox size={24} />
      </div>
      <h3 className="text-headline-md text-[var(--on-surface)]">{title}</h3>
      <p className="text-body-md text-[var(--on-surface-variant)] max-w-sm">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message = 'Failed to load data. Please try again.', onRetry }) {
  return (
    <div className="glass-card p-8 border-[var(--error)]/30 text-center flex flex-col items-center justify-center min-h-[200px] space-y-3">
      <div className="w-10 h-10 rounded-full bg-[var(--error)]/10 text-[var(--error)] flex items-center justify-center">
        <AlertTriangle size={20} />
      </div>
      <h3 className="text-headline-md text-[var(--on-surface)]">{title}</h3>
      <p className="text-body-md text-[var(--on-surface-variant)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-label-md py-1.5 px-4 mt-2">
          Retry
        </button>
      )}
    </div>
  );
}
