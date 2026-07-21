export default function SummaryMetricCard({ label, value, hint }) {
  return (
    <div className="glass-card p-6 flex flex-col gap-2 relative overflow-hidden">
      {/* Subtle glow behind the card content */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-[var(--primary)] opacity-5 blur-2xl pointer-events-none rounded-full" />
      
      <h3 className="text-label-md text-[var(--on-surface-variant)] uppercase tracking-wider">{label}</h3>
      <p className="text-headline-lg text-[var(--on-surface)]">{value}</p>
      {hint && (
        <p className="text-label-sm text-[var(--secondary)]">{hint}</p>
      )}
    </div>
  );
}
