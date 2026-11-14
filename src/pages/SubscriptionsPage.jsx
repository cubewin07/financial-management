import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency } from '../utils/finance';
import {
  getBillingAmount,
  getNextBillingDate,
  getSubscriptionBudgetShare,
  projectSubscriptionCost,
} from '../utils/subscriptions';
import SubscriptionCard from '../components/subscriptions/SubscriptionCard';
import SubscriptionDetailModal from '../components/subscriptions/SubscriptionDetailModal';
import AddSubscriptionModal from '../components/subscriptions/AddSubscriptionModal';
import EmptyState from '../components/shell/EmptyState';
import { CustomSelect } from '../components/ui/forms';
import { Plus, CreditCard, PieChart, CheckCircle2 } from 'lucide-react';

function SubscriptionsPage({
  subscriptions = [],
  totalMonthlyBurden = 0,
  budget,
  onToggleSubscription,
  onAddSubscription,
  onUpdateSubscription,
  onRemoveSubscription,
  defaultCurrency = 'NZD',
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);
  // Looked up from live data so the open modal reflects a skip or toggle straight away.
  const selectedSubscription = subscriptions.find((s) => s.id === selectedSubscriptionId) || null;
  const nextBillingTime = (s) => {
    if (s.active === false) return Infinity;
    return getNextBillingDate({ startDate: s.start_date, frequency: s.frequency })?.getTime() ?? Infinity;
  };

  const [sortBy, setSortBy] = useState('cost'); // 'cost' | 'name' | 'date'
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active'

  const activeSubs = useMemo(() => subscriptions.filter((s) => s.active !== false), [subscriptions]);
  const activeCount = activeSubs.length;
  const missingConversionCount = useMemo(
    () => activeSubs.filter((s) => s.conversion_missing).length,
    [activeSubs]
  );

  const hasBudget = Number.isFinite(Number(budget)) && Number(budget) > 0;
  const budgetShare = hasBudget ? getSubscriptionBudgetShare(subscriptions, budget) : null;

  const activeConvertedSubs = useMemo(
    () => activeSubs.filter((s) => !s.conversion_missing),
    [activeSubs]
  );
  const annualBurden = useMemo(() => {
    if (activeConvertedSubs.length > 0) {
      const sum = activeConvertedSubs.reduce((acc, s) => {
        const amt = getBillingAmount(s);
        return acc + (s.frequency === 'weekly' ? amt * 52 : amt * 12);
      }, 0);
      return Math.round(sum * 100) / 100;
    }
    return Math.round((Number(totalMonthlyBurden) || 0) * 12 * 100) / 100;
  }, [activeConvertedSubs, totalMonthlyBurden]);

  const filteredSubscriptions = useMemo(() => {
    let list = [...subscriptions];
    if (filterActive === 'active') {
      list = list.filter((s) => s.active !== false);
    }
    list.sort((a, b) => {
      if (sortBy === 'cost') return projectSubscriptionCost(b) - projectSubscriptionCost(a);
      if (sortBy === 'name') {
        return (a.label || a.service_name || a.name || '').localeCompare(
          b.label || b.service_name || b.name || ''
        );
      }
      if (sortBy === 'date') return nextBillingTime(a) - nextBillingTime(b);
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

  const resolvedCurrency = defaultCurrency || 'NZD';
  const clampedBudgetBar = budgetShare !== null ? Math.min(Math.max(budgetShare, 0), 100) : 0;
  const isBudgetExceeded = budgetShare !== null && budgetShare > 100;

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-3.5 sm:gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label-md font-extrabold tracking-widest text-[var(--primary)] uppercase mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
            Subscriptions
          </p>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100">
            Fixed Obligations
          </h2>
          <p className="max-w-xl text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Project recurring services so your remaining discretionary budget is clear and accurate.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary w-full sm:w-auto justify-center min-h-[44px] py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add subscription
          </button>
        </div>
      </header>

      {/* Top Stat Cards Grid — Compact 2-up + slim status row on < sm, spacious cards on >= sm */}
      <div className="grid gap-2.5 sm:gap-5 grid-cols-2 lg:grid-cols-3">
        <div className="glass-card p-3.5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent min-w-0">
          <div className="hidden sm:block absolute top-0 right-0 w-36 h-36 bg-[var(--primary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider sm:tracking-widest text-slate-400 truncate">
              Monthly <span className="hidden sm:inline">obligation</span>
            </p>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 min-w-0">
            <p className="text-xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-100 break-words">
              {formatCurrency(totalMonthlyBurden, resolvedCurrency)}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">
              Annual: <span className="text-purple-300 font-bold">{formatCurrency(annualBurden, resolvedCurrency)}</span>/yr
            </p>
            {missingConversionCount > 0 && (
              <p className="text-[10px] text-amber-300 mt-1 font-medium">
                Excludes {missingConversionCount} service{missingConversionCount === 1 ? '' : 's'} without FX rate
              </p>
            )}
          </div>
        </div>

        <div className="glass-card p-3.5 sm:p-6 flex flex-col justify-between relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent min-w-0">
          <div className="hidden sm:block absolute bottom-0 right-0 w-36 h-36 bg-[var(--tertiary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider sm:tracking-widest text-slate-400 truncate">
              Budget impact
            </p>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[var(--tertiary)]/10 text-[var(--tertiary)] border border-[var(--tertiary)]/20 shrink-0">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 min-w-0">
            <p className={`text-xl sm:text-3xl font-black tracking-tight tabular-nums ${
              isBudgetExceeded ? 'text-rose-400' : 'text-[var(--tertiary)]'
            }`}>
              {budgetShare !== null ? `${budgetShare.toFixed(1)}%` : '—'}
            </p>
            {budgetShare !== null ? (
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 sm:mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isBudgetExceeded
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                      : 'bg-[var(--tertiary)] shadow-[0_0_10px_var(--tertiary)]'
                  }`}
                  style={{ width: `${clampedBudgetBar}%` }}
                />
              </div>
            ) : (
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium">Set budget in Settings</p>
            )}
          </div>
        </div>

        <div className="glass-card p-3 sm:p-6 flex sm:flex-col items-center sm:items-stretch justify-between relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent col-span-2 lg:col-span-1">
          <div className="hidden sm:block absolute top-0 right-0 w-36 h-36 bg-[var(--secondary)] opacity-10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider sm:tracking-widest text-slate-400">
              Active subscriptions
            </p>
            <div className="hidden sm:flex p-2 rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="sm:mt-4 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-lg sm:text-3xl font-black tracking-tight tabular-nums text-slate-100">
                {activeCount} <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {subscriptions.length} total</span>
              </p>
              <p className="hidden sm:block text-xs text-slate-400 mt-1 font-medium">Tracking recurring services</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Filter & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs self-start">
          <button
            type="button"
            aria-pressed={filterActive === 'all'}
            onClick={() => setFilterActive('all')}
            className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterActive === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            All ({subscriptions.length})
          </button>
          <button
            type="button"
            aria-pressed={filterActive === 'active'}
            onClick={() => setFilterActive('active')}
            className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-2 sm:py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterActive === 'active' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-400 w-full sm:w-auto">
          <span className="shrink-0 font-medium">Sort by:</span>
          <div className="flex-1 sm:flex-initial sm:w-44">
            <CustomSelect
              ariaLabel="Sort subscriptions by"
              options={[
                { label: 'Highest Cost', value: 'cost' },
                { label: 'Service Name', value: 'name' },
                { label: 'Billing Date', value: 'date' },
              ]}
              value={sortBy}
              onChange={setSortBy}
            />
          </div>
        </div>
      </div>

      <section>
        {filteredSubscriptions.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-2.5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredSubscriptions.map((subscription) => (
              <motion.div key={subscription.id} variants={itemVariants}>
                <SubscriptionCard
                  subscription={subscription}
                  onClick={(sub) => setSelectedSubscriptionId(sub.id)}
                  onToggle={onToggleSubscription}
                  onUpdate={onUpdateSubscription}
                  defaultCurrency={resolvedCurrency}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="glass-card">
            <EmptyState
              title={subscriptions.length > 0 ? 'No active subscriptions' : 'No subscriptions yet'}
              description={
                subscriptions.length > 0
                  ? 'All tracked subscriptions are currently disabled. Switch to All to review or re-enable them.'
                  : 'Add a fixed cost to start projecting your monthly burden.'
              }
              action={
                subscriptions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFilterActive('all')}
                    className="btn-primary min-h-[44px] py-2.5 px-5 text-sm font-bold cursor-pointer"
                  >
                    Show All Subscriptions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary min-h-[44px] py-2.5 px-5 text-sm font-bold cursor-pointer"
                  >
                    Add First Subscription
                  </button>
                )
              }
            />
          </div>
        )}
        {subscriptions.some((s) => s.currency && s.currency !== resolvedCurrency) && (
          <p className="mt-3 text-[11px] text-slate-400">
            Other currencies are converted to {resolvedCurrency} at the latest available rate.{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline hover:text-slate-200">
              Rates By Exchange Rate API
            </a>
          </p>
        )}
      </section>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddSubscriptionModal
            onClose={() => setIsAddModalOpen(false)}
            onAdd={onAddSubscription}
            defaultCurrency={resolvedCurrency}
          />
        )}

        {selectedSubscription && (
          <SubscriptionDetailModal
            subscription={selectedSubscription}
            budget={budget}
            defaultCurrency={resolvedCurrency}
            onClose={() => setSelectedSubscriptionId(null)}
            onToggle={onToggleSubscription}
            onUpdate={onUpdateSubscription}
            onRemove={onRemoveSubscription}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default SubscriptionsPage;

