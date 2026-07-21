import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/finance';
import { getSubscriptionBudgetShare } from '../utils/subscriptions';
import SubscriptionCard from '../components/subscriptions/SubscriptionCard';
import SubscriptionDetailModal from '../components/subscriptions/SubscriptionDetailModal';
import AddSubscriptionModal from '../components/subscriptions/AddSubscriptionModal';

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
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  
  const budgetShare = getSubscriptionBudgetShare(subscriptions, budget);

  return (
    <main className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wider text-[var(--primary)] uppercase mb-2">Subscriptions</p>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--on-surface)] sm:text-5xl">
            Your fixed costs
          </h1>
          <p className="max-w-xl text-base leading-6 text-[var(--on-surface-variant)] mt-4">
            Keep recurring essentials visible so your real free-spend budget is easier to trust.
          </p>
        </div>
        
        {canManage && (
          <div className="shrink-0">
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(true)} 
              className="btn-primary"
            >
              Add subscription
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl">
        <div className="glass-card p-6 flex flex-col justify-center">
          <p className="text-xs uppercase font-semibold tracking-widest text-[var(--on-surface-variant)]">
            Monthly obligation
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-[var(--primary)] shadow-sm">
            {formatCurrency(totalMonthlyBurden)}
          </p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center">
          <p className="text-xs uppercase font-semibold tracking-widest text-[var(--on-surface-variant)]">
            Budget impact
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-[var(--tertiary)] shadow-sm">
            {budgetShare.toFixed(1)}%
          </p>
        </div>
      </div>

      <section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subscriptions.length > 0 ? (
            subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onClick={setSelectedSubscription}
                onToggle={onToggleSubscription}
                canManage={canManage}
              />
            ))
          ) : (
            <div className="glass-card p-8 text-center text-[var(--on-surface-variant)] md:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center min-h-[200px]">
              {canManage
                ? 'No subscriptions yet. Add a fixed cost to start projecting your monthly burden.'
                : 'No subscriptions have been added by the owner yet.'}
            </div>
          )}
        </div>
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
            onRemove={onRemoveSubscription}
            canManage={canManage}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default SubscriptionsPage;
