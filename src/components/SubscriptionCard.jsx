import { motion } from 'framer-motion';
import { formatCurrency, formatLongDate } from '../utils/finance';
import { projectSubscriptionCost } from '../utils/subscriptions';

function SubscriptionCard({ subscription, onToggle, onRemove, canManage = true }) {
  const projectedMonthlyCost = projectSubscriptionCost(subscription);
  const isActive = subscription.active !== false;

  return (
    <article className="surface-card rounded-[26px] p-5 sm:p-6 group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {subscription.label}
            </h3>
            <span className="inline-flex items-center rounded-full border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.12)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--accent-amber)]">
              {subscription.frequency}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Starts {formatLongDate(subscription.start_date)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (typeof onRemove === 'function') {
                  onRemove(subscription.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1.5 text-[var(--text-tertiary)] hover:bg-[rgba(248,113,113,0.1)] hover:text-[var(--accent-coral)]"
              aria-label="Remove subscription"
              title="Remove subscription"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (canManage && typeof onToggle === 'function') {
                onToggle(subscription.id);
              }
            }}
            disabled={!canManage}
            className={
              isActive
                ? 'rounded-full bg-[var(--accent-teal)] px-3 py-1 text-xs font-medium text-[#07120f] disabled:cursor-not-allowed disabled:opacity-70'
                : 'rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:opacity-70'
            }
          >
            {isActive ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="surface-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Amount</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
            {formatCurrency(subscription.amount)}
          </p>
        </div>

        <div className="surface-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Effective monthly cost
          </p>
          <motion.p
            key={`${subscription.id}-${isActive ? 'active' : 'inactive'}`}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${
              isActive ? 'text-[var(--accent-amber)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            {formatCurrency(projectedMonthlyCost)}
          </motion.p>
        </div>
      </div>
    </article>
  );
}

export default SubscriptionCard;
