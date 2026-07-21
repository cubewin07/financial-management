import { LayoutDashboard, CreditCard, PieChart, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function Sidebar({ userEmail }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { name: 'Spending Breakdown', path: '/breakdown', icon: PieChart },
  ];

  return (
    <div className="flex flex-col h-full w-[260px] bg-[var(--surface-container-lowest)] border-r border-[var(--outline-variant)]">
      {/* Brand */}
      <div className="h-16 flex items-center px-6">
        <span className="text-headline-md text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)]">
          Luminous
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg text-body-md transition-colors relative ${
                isActive 
                  ? 'bg-[rgba(208,188,255,0.1)] text-[var(--primary)]' 
                  : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[rgba(255,255,255,0.05)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--primary)] rounded-r-full shadow-[0_0_8px_var(--primary)]" />
                )}
                <item.icon size={20} className={isActive ? 'text-[var(--primary)]' : 'text-[var(--outline)]'} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--outline-variant)]">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] flex items-center justify-center text-[var(--on-primary)] text-label-md font-bold">
            {userEmail?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-[var(--on-surface)] truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-label-md text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
