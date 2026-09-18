import { LayoutDashboard, CreditCard, PieChart, TrendingUp, Target, Sliders, LogOut, Wallet, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

export default function Sidebar({ userEmail, isProMember = true, onAddExpense, canManageBudget = false }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { name: 'Spending Breakdown', path: '/breakdown', icon: PieChart },
    { name: 'Investments', path: '/investments', icon: TrendingUp },
    { name: 'Savings Goals', path: '/savings', icon: Target },
    { name: 'Budget Settings', path: '/settings', icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-full w-[260px] bg-[var(--surface-container-lowest)] border-r border-[var(--outline-variant)]">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary-container)] flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.3)]">
          <Wallet size={18} className="text-[var(--background)]" />
        </div>
        <span className="text-headline-md text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)]">
          Luminous
        </span>
      </div>

      {/* Add New CTA */}
      {canManageBudget && (
        <div className="px-4 mb-4">
          <button
            type="button"
            onClick={onAddExpense}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] text-[var(--on-primary)] text-label-md font-semibold shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:shadow-[0_0_30px_rgba(208,188,255,0.5)] transition-shadow flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add New
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl text-body-md transition-colors relative overflow-hidden ${
                isActive 
                  ? 'bg-[rgba(208,188,255,0.12)] text-[var(--primary)] font-medium' 
                  : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[rgba(255,255,255,0.05)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bar"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary)] shadow-[0_0_12px_var(--primary)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
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
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <p className="text-label-md text-[var(--on-surface)] truncate">{userEmail}</p>
            {isProMember && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] font-bold">
                Pro
              </span>
            )}
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
