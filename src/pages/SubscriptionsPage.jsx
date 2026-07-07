import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  onRemoveSubscription,
  canManage = true,
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const reduceMotion = useReducedMotion();
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
                {canManage && (
                  <div className="pt-2">
                    <button type="button" onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                      Add subscription
                    </button>
                  </div>
                )}
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

        <section>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.length > 0 ? (
              subscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onToggle={onToggleSubscription}
                  onRemove={onRemoveSubscription}
                  canManage={canManage}
                />
              ))
            ) : (
              <div className="surface-panel rounded-[28px] p-8 text-center text-[var(--text-secondary)] md:col-span-2 lg:col-span-3">
                {canManage
                  ? 'No subscriptions yet. Add a fixed cost to start projecting your monthly burden.'
                  : 'No subscriptions have been added by the owner yet.'}
              </div>
            )}
          </div>
        </section>

        <AnimatePresence>
          {isAddModalOpen && canManage ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
              className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
                className="w-full max-w-2xl relative"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="absolute top-4 right-4 z-10">
                   <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary h-10 min-h-[40px] px-4 rounded-full">
                     Close
                   </button>
                </div>
                <SubscriptionForm
                  onSubmit={(data) => {
                    onAddSubscription(data);
                    setIsAddModalOpen(false);
                  }}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default SubscriptionsPage;
