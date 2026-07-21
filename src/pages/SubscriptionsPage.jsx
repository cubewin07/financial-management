import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency } from '../utils/finance';
import { getSubscriptionBudgetShare } from '../utils/subscriptions';
import SubscriptionCard from '../components/subscriptions/SubscriptionCard';
import SubscriptionDetailModal from '../components/subscriptions/SubscriptionDetailModal';
import AddSubscriptionModal from '../components/subscriptions/AddSubscriptionModal';
import { EmptyState } from '../components/common/States';

function SubscriptionsPage({
  subscriptions = [],
  totalMonthlyBurden = 0,
  budget,
  onToggleSubscription,
  onAddSubscription,
  onUpdateSubscription,
  onRemoveSubscription,
  canManage = true,
  defaultCurrency = 'NZD',
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const budgetShare = getSubscriptionBudgetShare(subscriptions, budget);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 250 } },
  };

  return (
    <main className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label-md font-semibold tracking-wider text-[var(--primary)] uppercase mb-2">Subscriptions</p>
          <h1 className="text-headline-lg font-bold tracking-tight text-[var(--on-surface)] sm:text-5xl">
            Your fixed costs
          </h1>
          <p className="max-w-xl text-body-md text-[var(--on-surface-variant)] mt-3">
            Keep recurring essentials visible so your real free-spend budget is easier to trust.
          </p>
        </div>

        {canManage && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary py-2.5 px-5"
            >
              Add subscription
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl">
        <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-10 blur-2xl rounded-full pointer-events-none" />
          <p className="text-label-sm uppercase font-semibold tracking-widest text-[var(--on-surface-variant)]">
            Monthly obligation
          </p>
          <p className="mt-2 text-display font-bold tracking-tight tabular-nums text-[var(--primary)]">
            {formatCurrency(totalMonthlyBurden, defaultCurrency || 'NZD')}
          </p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-[var(--tertiary)] opacity-10 blur-2xl rounded-full pointer-events-none" />
          <p className="text-label-sm uppercase font-semibold tracking-widest text-[var(--on-surface-variant)]">
            Budget impact
          </p>
          <p className="mt-2 text-display font-bold tracking-tight tabular-nums text-[var(--tertiary)]">
            {budgetShare.toFixed(1)}%
          </p>
        </div>
      </div>

      <section>
        {subscriptions.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {subscriptions.map((subscription) => (
              <motion.div key={subscription.id} variants={itemVariants}>
                <SubscriptionCard
                  subscription={subscription}
                  onClick={setSelectedSubscription}
                  onToggle={onToggleSubscription}
                  canManage={canManage}
                  defaultCurrency={defaultCurrency}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState
            title="No subscriptions active"
            description={
              canManage
                ? 'Add a fixed cost to start projecting your monthly burden.'
                : 'No subscriptions have been added by the owner yet.'
            }
            action={
              canManage ? (
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-label-md">
                  Add First Subscription
                </button>
              ) : null
            }
          />
        )}
      </section>

      <AnimatePresence>
        {isAddModalOpen && canManage && (
          <AddSubscriptionModal
            onClose={() => setIsAddModalOpen(false)}
            onAdd={onAddSubscription}
          />
        )}

        {selectedSubscription && (
          <SubscriptionDetailModal
            subscription={selectedSubscription}
            budget={budget}
            onClose={() => setSelectedSubscription(null)}
            onToggle={onToggleSubscription}
            onUpdate={onUpdateSubscription}
            onRemove={onRemoveSubscription}
            canManage={canManage}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default SubscriptionsPage;
