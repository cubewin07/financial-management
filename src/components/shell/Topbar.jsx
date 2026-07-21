import { useLocation } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  
  let title = 'Dashboard';
  if (location.pathname === '/subscriptions') title = 'Subscriptions';
  else if (location.pathname === '/breakdown') title = 'Spending Breakdown';

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 glass-card border-x-0 border-t-0 rounded-none z-10 relative">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-headline-md text-[var(--on-surface)]">{title}</h1>
      </div>
      
      <div className="hidden sm:block">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--outline)]" />
          <input
            type="text"
            placeholder="Search..."
            className="input-shell pl-9 py-1.5 min-h-0 h-9 w-64 text-label-md bg-[rgba(255,255,255,0.05)] border-transparent"
          />
        </div>
      </div>
    </header>
  );
}
