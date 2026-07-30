import { motion } from 'framer-motion';

export default function SummaryMetricCard({ label, value, delta, hint }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col gap-2 relative overflow-hidden group hover:border-purple-400/30 shadow-lg transition-colors"
    >
      {/* Subtle glow behind the card content */}
      <div className="absolute -top-4 -right-4 w-28 h-28 bg-purple-500/10 opacity-0 group-hover:opacity-100 blur-2xl pointer-events-none rounded-full transition-opacity duration-300" />

      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</h3>
      <p className="text-3xl font-extrabold text-slate-100">{value}</p>

      {delta && (
        <div className={`text-xs font-bold flex items-center gap-1 ${delta.startsWith('+') || delta.startsWith('↑') ? 'text-teal-400' : 'text-amber-400'}`}>
          <span>{delta}</span>
        </div>
      )}

      {hint && (
        <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
      )}
    </motion.div>
  );
}
