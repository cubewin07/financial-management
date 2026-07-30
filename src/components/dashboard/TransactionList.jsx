import { ShoppingBag, Coffee, Car, Film, Receipt, Heart, Book, CircleDollarSign, MessageCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatCurrency, formatShortDate } from '../../utils/finance';
import EmptyState from '../shell/EmptyState';

const getIconForCategory = (category) => {
  const normalized = category?.toLowerCase() || '';
  if (normalized.includes('grocer') || normalized.includes('food')) return <Coffee size={18} />;
  if (normalized.includes('transport') || normalized.includes('travel') || normalized.includes('car')) return <Car size={18} />;
  if (normalized.includes('entertain')) return <Film size={18} />;
  if (normalized.includes('shop')) return <ShoppingBag size={18} />;
  if (normalized.includes('bill') || normalized.includes('utilit')) return <Receipt size={18} />;
  if (normalized.includes('health')) return <Heart size={18} />;
  if (normalized.includes('educat')) return <Book size={18} />;
  return <CircleDollarSign size={18} />;
};

export default function TransactionList({ expenses, maxItems = 3, onOpenComments, commentCounts, defaultCurrency }) {
  const displayExpenses = (expenses || []).slice(0, maxItems);

  return (
    <motion.div 
      layout
      className="glass-card p-6 flex flex-col relative group transition-all duration-300 shadow-[0_0_15px_rgba(208,188,255,0.05)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)]"
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-headline-md text-[var(--on-surface)] font-bold tracking-tight">Recent Transactions</h3>
          <p className="text-overline text-[var(--outline)]">Latest Activity</p>
        </div>
        <Link 
          to="/breakdown" 
          className="text-label-sm text-[var(--primary)] hover:text-white flex items-center gap-0.5 font-semibold transition-colors group/link shrink-0"
        >
          View Breakdown <ChevronRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      
      {displayExpenses.length > 0 ? (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {displayExpenses.map((expense, idx) => {
              const count = commentCounts?.[expense.id] || 0;
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  onClick={() => onOpenComments?.(expense)}
                  className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl transition-all duration-200 bg-white/[0.02] border border-white/[0.06] hover:border-white/15 shadow-sm cursor-pointer hover:bg-white/[0.05] hover:scale-[1.005]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(208,188,255,0.12)] text-[var(--primary)] border border-[rgba(208,188,255,0.25)] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(208,188,255,0.15)]">
                      {getIconForCategory(expense.category)}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-label-md text-white truncate font-bold">{expense.note || expense.category}</p>
                        {count > 0 && (
                          <span className="badge-pill bg-[var(--tertiary)]/20 text-[var(--tertiary)] border border-[var(--tertiary)]/30 shrink-0">
                            <MessageCircle size={10} /> {count}
                          </span>
                        )}
                      </div>
                      <p className="text-label-sm text-[var(--on-surface-variant)] truncate">{expense.category}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-label-md text-[var(--on-surface)] font-extrabold px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 inline-block">
                      {formatCurrency(expense.amount, defaultCurrency || 'NZD')}
                    </span>
                    <p className="text-[11px] text-[var(--outline)] mt-0.5 font-medium">{formatShortDate(expense.date)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-2 flex items-center justify-center">
          <EmptyState type="transactions" />
        </div>
      )}
    </motion.div>
  );
}
