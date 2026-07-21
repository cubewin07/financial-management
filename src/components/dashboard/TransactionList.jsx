import { ShoppingBag, Coffee, Car, Film, Receipt, Heart, Book, CircleDollarSign, MessageCircle } from 'lucide-react';
import { formatCurrency, formatShortDate } from '../../utils/finance';

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

export default function TransactionList({ expenses, maxItems = 5, onOpenComments, commentCounts }) {
  const displayExpenses = expenses.slice(0, maxItems);

  return (
    <div className="glass-card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-headline-md text-[var(--on-surface)]">Recent Transactions</h3>
      </div>
      
      {displayExpenses.length > 0 ? (
        <div className="space-y-4 flex-1">
          {displayExpenses.map(expense => {
            const count = commentCounts?.[expense.id] || 0;
            return (
              <div 
                key={expense.id} 
                onClick={() => onOpenComments?.(expense)}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${onOpenComments ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.03)]' : ''}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[rgba(208,188,255,0.1)] text-[var(--primary)] flex items-center justify-center shrink-0">
                    {getIconForCategory(expense.category)}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-label-md text-[var(--on-surface)] truncate">{expense.note || expense.category}</p>
                      {count > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[var(--tertiary)] bg-[var(--tertiary)]/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          <MessageCircle size={10} /> {count}
                        </span>
                      )}
                    </div>
                    <p className="text-label-sm text-[var(--on-surface-variant)] truncate">{expense.category}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-label-md text-[var(--on-surface)]">{formatCurrency(expense.amount)}</p>
                  <p className="text-label-sm text-[var(--on-surface-variant)]">{formatShortDate(expense.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-body-md text-[var(--on-surface-variant)]">No recent transactions</p>
        </div>
      )}
    </div>
  );
}
