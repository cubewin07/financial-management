import { TrendingUp, Lock } from 'lucide-react';

export default function InvestmentsPage() {
  return (
    <main className="space-y-8 animate-in fade-in duration-500">
      <header>
        <p className="text-label-md text-[var(--primary)] uppercase tracking-wider mb-2">Portfolio</p>
        <h1 className="text-headline-lg text-[var(--on-surface)]">Investments</h1>
        <p className="text-body-md text-[var(--on-surface-variant)] mt-2">
          Track assets, stocks, and long-term portfolio growth.
        </p>
      </header>

      <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[360px] max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-[rgba(208,188,255,0.1)] text-[var(--primary)] flex items-center justify-center">
          <TrendingUp size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-headline-md text-[var(--on-surface)]">Investment Tracking Coming Soon</h3>
          <p className="text-body-md text-[var(--on-surface-variant)] max-w-md">
            Portfolio analytics, stock performance monitoring, and asset allocation views are currently under active development.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(211,251,255,0.1)] text-[var(--secondary)] text-label-md border border-[rgba(211,251,255,0.2)]">
          <Lock size={14} />
          <span>Pro Feature Preview</span>
        </div>
      </div>
    </main>
  );
}
