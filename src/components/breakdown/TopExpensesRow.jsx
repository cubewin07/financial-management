import {
  CarFront,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  Receipt,
  ShoppingBag,
  Utensils,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { formatCurrency, formatShortDate, getCategoryColor } from '../../utils/finance';

function getCategoryIcon(categoryName) {
  const normalized = String(categoryName || '').trim().toLowerCase();
  
  if (normalized.includes('food') || normalized.includes('dining')) return Utensils;
  if (normalized.includes('groceries')) return ShoppingBag;
  if (normalized.includes('transport') || normalized.includes('transit')) return CarFront;
  if (normalized.includes('entertainment')) return Clapperboard;
  if (normalized.includes('shopping')) return ShoppingBag;
  if (normalized.includes('bills') || normalized.includes('utilities')) return Receipt;
  if (normalized.includes('health') || normalized.includes('medical')) return HeartPulse;
  if (normalized.includes('education')) return GraduationCap;
  if (normalized.includes('home') || normalized.includes('rent')) return Home;

  return Wallet;
}

function TopExpensesRow({ expenses, limit = 5, onOpenComments, commentCounts, defaultCurrency }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-sm text-[var(--on-surface-variant)] py-4">
        No expenses found
      </div>
    );
  }

  // Sort by amount descending
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, limit);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide">
      {topExpenses.map((expense) => {
        const Icon = getCategoryIcon(expense.category);
        const color = getCategoryColor(expense.category);
        const count = commentCounts?.[expense.id] || 0;

        return (
          <div
            key={expense.id}
            onClick={() => onOpenComments?.(expense)}
            className={`glass-card flex-shrink-0 w-64 p-4 snap-start flex flex-col justify-between hover:-translate-y-1 transition-transform ${onOpenComments ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}20`, color: color }}
              >
                <Icon size={20} />
              </div>
              <span className="text-xs font-medium text-[var(--on-surface-variant)] px-2 py-1 rounded-full bg-[var(--surface-container-high)]">
                {formatShortDate(expense.date)}
              </span>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-[var(--on-surface)] truncate" title={expense.note || expense.category}>
                  {expense.note || expense.category}
                </p>
                {count > 0 && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[var(--tertiary)] bg-[var(--tertiary)]/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <MessageCircle size={10} /> {count}
                  </span>
                )}
              </div>
              <p className="text-lg font-bold tracking-tight text-[var(--on-surface)]">
                {formatCurrency(expense.amount, defaultCurrency || 'USD')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TopExpensesRow;
