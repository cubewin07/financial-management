import { ShoppingBag, Coffee, Car, Film, Receipt, Heart, Book, CircleDollarSign, MessageCircle, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function TransactionList({ expenses, maxItems = 5, onOpenComments, commentCounts, defaultCurrency }) {
  const displayExpenses = (expenses || []).slice(0, maxItems);

  return (
    <div className="glass-card p-6 flex flex-col h-full relative group transition-all duration-300 hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(208,188,255,0.1)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-headline-md text-[var(--on-surface)]">Recent Transactions</h3>
      </div>
      
      {displayExpenses.length > 0 ? (
        <div className="space-y-3 flex-1">
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
                  className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 bg-[rgba(255,255,255,0.02)] border border-transparent hover:border-[rgba(255,255,255,0.08)] ${
                    onOpenComments ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.05)] hover:scale-[1.01]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(208,188,255,0.1)] text-[var(--primary)] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(208,188,255,0.15)]">
                      {getIconForCategory(expense.category)}
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-label-md text-[var(--on-surface)] truncate font-semibold">{expense.note || expense.category}</p>
                        {count > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[var(--tertiary)] bg-[var(--tertiary)]/15 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <MessageCircle size={10} /> {count}
                          </span>
                        )}
                      </div>
                      <p className="text-label-sm text-[var(--on-surface-variant)] truncate">{expense.category}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-label-md text-[var(--on-surface)] font-bold">{formatCurrency(expense.amount, defaultCurrency || 'NZD')}</p>
                    <p className="text-label-sm text-[var(--on-surface-variant)]">{formatShortDate(expense.date)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="No Transactions"
            description="No recent transactions found for this month."
            icon={CreditCard}
          />
        </div>
      )}
    </div>
  );
}
