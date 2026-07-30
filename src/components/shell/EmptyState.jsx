import { motion } from 'framer-motion';
import { FolderOpen, PieChart, Receipt, CreditCard, Plus } from 'lucide-react';

export default function EmptyState({
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
}) {
  const defaultConfigs = {
    category: {
      title: 'No Category Data Yet',
      description: 'Add expenses this month to visualize your category breakdown.',
      icon: PieChart,
      color: 'var(--primary)',
      accentBg: 'rgba(208,188,255,0.12)',
      borderColor: 'rgba(208,188,255,0.25)',
      glow: 'shadow-[0_0_30px_rgba(208,188,255,0.2)]',
    },
    transactions: {
      title: 'No Recent Transactions',
      description: 'Your logged purchases and payments for this month will appear here.',
      icon: Receipt,
      color: 'var(--secondary)',
      accentBg: 'rgba(0,238,252,0.12)',
      borderColor: 'rgba(0,238,252,0.25)',
      glow: 'shadow-[0_0_30px_rgba(0,238,252,0.2)]',
    },
    subscriptions: {
      title: 'No Active Subscriptions',
      description: 'Track recurring monthly bills, software, and streaming services.',
      icon: CreditCard,
      color: 'var(--tertiary)',
      accentBg: 'rgba(255,176,202,0.12)',
      borderColor: 'rgba(255,176,202,0.25)',
      glow: 'shadow-[0_0_30px_rgba(255,176,202,0.2)]',
    },
    default: {
      title: 'No Data Available',
      description: 'There are no records to display at this time.',
      icon: FolderOpen,
      color: 'var(--primary)',
      accentBg: 'rgba(208,188,255,0.12)',
      borderColor: 'rgba(208,188,255,0.25)',
      glow: 'shadow-[0_0_30px_rgba(208,188,255,0.2)]',
    },
  };

  const config = defaultConfigs[type] || defaultConfigs.default;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const DisplayIcon = Icon || config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full relative p-4 z-10"
    >
      {/* Animated Glowing Icon Badge */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative ${config.glow}`}
        style={{
          backgroundColor: config.accentBg,
          border: `1px solid ${config.borderColor}`,
          color: config.color,
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl blur-md opacity-50 pointer-events-none"
          style={{ backgroundColor: config.accentBg }}
        />
        <DisplayIcon size={28} className="relative z-10" />
      </motion.div>

      {/* Title & Description */}
      <h4 className="text-headline-md text-[var(--on-surface)] font-bold mb-1.5 tracking-tight">
        {displayTitle}
      </h4>
      <p className="text-label-md text-[var(--on-surface-variant)] max-w-xs mb-4 leading-relaxed">
        {displayDescription}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary py-2 px-4 text-label-md inline-flex items-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:shadow-[0_0_30px_rgba(208,188,255,0.5)] transition-all"
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
