import { motion } from 'framer-motion';
import { formatCurrency, formatLongDate } from '../utils/finance';
import { projectSubscriptionCost } from '../utils/subscriptions';

function SubscriptionCard({ subscription, onToggle }) {
  const projectedMonthlyCost = projectSubscriptionCost(subscription);
  const isActive = subscription.active !== false;

  return (
    <article className="surface-card rounded-[26px] p-5 sm:p-6">
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

        <button
          type="button"
          onClick={() => onToggle(subscription.id)}
          className={
            isActive
              ? 'rounded-full bg-[var(--accent-teal)] px-3 py-1 text-xs font-medium text-[#07120f]'
              : 'rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-tertiary)]'
          }
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
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
