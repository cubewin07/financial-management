import { formatCurrency } from '../utils/finance';
import { getSubscriptionBudgetShare } from '../utils/subscriptions';
import SubscriptionCard from '../components/SubscriptionCard';
import SubscriptionForm from '../components/SubscriptionForm';

function SectionShell({ children, className = '' }) {
  return (
    <section className={`section-shell section-shell-amber ${className}`}>
      {children}
    </section>
  );
}

function SubscriptionsPage({
  subscriptions,
  totalMonthlyBurden,
  budget,
  onToggleSubscription,
  onAddSubscription,
  canManage = true,
}) {
  const budgetShare = getSubscriptionBudgetShare(subscriptions, budget);
  const obligationTone =
    budgetShare > 50 ? 'text-[var(--accent-coral)]' : 'text-[var(--accent-amber)]';

  return (
    <main>
      <div className="space-y-6">
        <SectionShell>
          <div className="p-7 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">Subscriptions</p>
                <h2 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                  Your fixed costs
                </h2>
                <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Keep recurring essentials visible so your real free-spend budget is easier to trust.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface-panel rounded-[24px] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Monthly obligation
                  </p>
                  <p
                    className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${obligationTone}`}
                  >
                    {formatCurrency(totalMonthlyBurden)}
                  </p>
                </div>
                <div className="surface-panel rounded-[24px] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Share of base budget
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
                    {budgetShare.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell>
          <div className="p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {subscriptions.length > 0 ? (
                subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onToggle={onToggleSubscription}
                    canToggle={canManage}
                  />
                ))
              ) : (
                <div className="surface-card rounded-[28px] p-6 text-[var(--text-secondary)]">
                  {canManage
                    ? 'No subscriptions yet. Add a fixed cost below to start projecting your monthly burden.'
                    : 'No subscriptions have been added by the owner yet.'}
                </div>
              )}
            </div>
          </div>
        </SectionShell>

        {canManage ? (
          <SectionShell className="p-0">
            <SubscriptionForm onSubmit={onAddSubscription} />
          </SectionShell>
        ) : (
          <SectionShell className="p-0">
            <div className="surface-card rounded-[28px] p-6 text-sm text-[var(--text-secondary)] sm:p-7">
              This section is read-only for your role. Only the owner account can add or update subscriptions.
            </div>
          </SectionShell>
        )}
      </div>
    </main>
  );
}

export default SubscriptionsPage;
