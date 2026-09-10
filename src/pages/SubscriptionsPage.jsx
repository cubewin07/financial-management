import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency } from '../utils/finance';
import { getSubscriptionBudgetShare } from '../utils/subscriptions';
import SubscriptionCard from '../components/subscriptions/SubscriptionCard';
import SubscriptionDetailModal from '../components/subscriptions/SubscriptionDetailModal';
import AddSubscriptionModal from '../components/subscriptions/AddSubscriptionModal';
import { EmptyState } from '../components/common/States';
import { Plus, CreditCard, PieChart, CheckCircle2 } from 'lucide-react';

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

  const [sortBy, setSortBy] = useState('cost'); // 'cost' | 'name' | 'date'
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active'

  const activeCount = subscriptions.filter(s => s.active).length;
  const budgetShare = getSubscriptionBudgetShare(subscriptions, budget);
  const annualBurden = totalMonthlyBurden * 12;

  const filteredSubscriptions = useMemo(() => {
    let list = [...subscriptions];
    if (filterActive === 'active') {
      list = list.filter((s) => s.active);
    }
    list.sort((a, b) => {
      if (sortBy === 'cost') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'name') return (a.service_name || a.name || '').localeCompare(b.service_name || b.name || '');
      if (sortBy === 'date') return (a.start_date || '').localeCompare(b.start_date || '');
      return 0;
    });
    return list;
  }, [subscriptions, filterActive, sortBy]);

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
    <main className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label-md font-extrabold tracking-widest text-[var(--primary)] uppercase mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
            Subscriptions
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100">
            Fixed Obligations
          </h1>
          <p className="max-w-xl text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            Project recurring services so your remaining discretionary budget is clear and accurate.
          </p>
        </div>

        {canManage && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add subscription
            </button>
          </div>
        )}
      </header>

      {/* Top Stat Cards Grid */}
      <div className="grid gap-3 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">
              Monthly obligation
            </p>
            <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-100">
              {formatCurrency(totalMonthlyBurden, defaultCurrency || 'NZD')}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Annual impact: <span className="text-purple-300 font-bold">{formatCurrency(annualBurden, defaultCurrency || 'NZD')}</span>/yr
            </p>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="absolute bottom-0 right-0 w-36 h-36 bg-[var(--tertiary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">
              Budget impact
            </p>
            <div className="p-2 rounded-xl bg-[var(--tertiary)]/10 text-[var(--tertiary)] border border-[var(--tertiary)]/20">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-[var(--tertiary)]">
              {budgetShare.toFixed(1)}%
            </p>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div 
                className="bg-[var(--tertiary)] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_var(--tertiary)]"
                style={{ width: `${Math.min(budgetShare, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400">
              Active subscriptions
            </p>
            <div className="p-2 rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-100">
                {activeCount} <span className="text-sm font-semibold text-slate-400">/ {subscriptions.length} total</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Tracking recurring services</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Filter & Sort Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setFilterActive('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterActive === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive('active')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterActive === 'active' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-purple-400"
          >
            <option value="cost">Highest Cost</option>
            <option value="name">Service Name</option>
            <option value="date">Billing Date</option>
          </select>
        </div>
      </div>

      <section>
        {filteredSubscriptions.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredSubscriptions.map((subscription) => (
              <motion.div key={subscription.id} variants={itemVariants}>
                <SubscriptionCard
                  subscription={subscription}
                  onClick={setSelectedSubscription}
                  onToggle={onToggleSubscription}
                  onUpdate={onUpdateSubscription}
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
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2.5 px-5 text-sm font-bold">
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

