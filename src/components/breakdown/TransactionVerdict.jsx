import { motion } from 'framer-motion';
import { ListOrdered, ArrowUpRight, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { formatCurrency, getExpenseStats } from '../../utils/finance';

export default function TransactionVerdict({ expenses = [], defaultCurrency = 'NZD' }) {
  const stats = getExpenseStats(expenses);
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Compute concentration of top 5 expenses
  const sortedExpenses = [...expenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  const top5Total = sortedExpenses.slice(0, 5).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const top5Percent = totalSpent > 0 ? Math.round((top5Total / totalSpent) * 100) : 0;

  // Recurring subscription count check
  const subCount = expenses.filter((e) => (e.category || '').toLowerCase() === 'subscriptions' || (e.note || '').toLowerCase().includes('sub')).length;

  let verdictMessage = `Top 5 expenses account for ${top5Percent}% (${formatCurrency(top5Total, defaultCurrency)}) of total period spend.`;
  let actionAdvice = stats.maxTransaction
    ? `Largest single outlay: ${formatCurrency(stats.maxTransaction.amount, defaultCurrency)} (${stats.maxTransaction.category}${stats.maxTransaction.note ? ` • ${stats.maxTransaction.note}` : ''}).`
    : 'No transactions recorded.';

  let badgeText = top5Percent >= 60 ? 'High Concentration' : 'Balanced Outlays';
  let badgeColor = top5Percent >= 60 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-teal-500/15 text-teal-300 border-teal-500/30';

  if (totalSpent === 0) {
    verdictMessage = 'No transaction data available for this period.';
    actionAdvice = 'Record transactions to track expenditure concentration.';
  } else if (top5Percent >= 70) {
    actionAdvice = `Your top 5 items consume ${top5Percent}% of all spending. Evaluating these key charges offers the highest savings leverage.`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 sm:p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/80 backdrop-blur-xl shadow-xl relative overflow-hidden space-y-4"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-cyan-400">
            <ListOrdered size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Transaction Insights Verdict
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${badgeColor}`}>
                {badgeText}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 mt-1 leading-tight">
              {verdictMessage}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2.5 font-normal flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-400 shrink-0" />
              <span>{actionAdvice}</span>
            </p>
          </div>
        </div>

        {/* Standardized Right Side Metric Cards */}
        <div className="w-full sm:w-44 grid grid-cols-2 sm:grid-cols-1 gap-2.5 shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Median Size</span>
            <span className="text-base sm:text-lg font-black text-cyan-300">{formatCurrency(stats.median, defaultCurrency)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Top 5 Concentration</span>
            <span className="text-base sm:text-lg font-black text-teal-300">{top5Percent}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
