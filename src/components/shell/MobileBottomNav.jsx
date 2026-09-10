import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PieChart,
  CreditCard,
  Plus,
  MoreHorizontal,
  Target,
  TrendingUp,
  Sliders,
  Bell,
  X,
} from 'lucide-react';

export default function MobileBottomNav({ onAddExpense, canManageBudget = false }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();

  const moreNavItems = [
    { name: 'Savings Goals', path: '/savings', icon: Target, desc: 'Targets & Carry-over' },
    { name: 'Investments', path: '/investments', icon: TrendingUp, desc: 'Net worth & assets' },
    { name: 'Budget Settings', path: '/settings', icon: Sliders, desc: 'Income & category limits' },
    { name: 'Notifications', path: '/notifications', icon: Bell, desc: 'Bill alerts & activity' },
  ];

  const isMoreActive = moreNavItems.some((item) => item.path === location.pathname);

  return (
    <>
      {/* "More" Slide-up Drawer */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-[var(--surface-container-high)] border-t border-[var(--outline-variant)]/60 p-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                  <h3 className="text-base font-bold text-[var(--on-surface)]">More Features</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1.5 rounded-full text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-white/5"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {moreNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)] shadow-sm'
                          : 'bg-white/[0.03] border-white/5 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <item.icon size={20} className={isActive ? 'text-[var(--primary)]' : 'text-slate-400'} />
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Glass Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--surface-container-lowest)]/92 backdrop-blur-2xl border-t border-[var(--outline-variant)]/40 px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(0,0,0,0.4)]"
      >
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          {/* Home */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative p-1">
                  <LayoutDashboard size={20} />
                  {isActive && (
                    <motion.div
                      layoutId="mobile-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-0.5">Home</span>
              </>
            )}
          </NavLink>

          {/* Breakdown */}
          <NavLink
            to="/breakdown"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative p-1">
                  <PieChart size={20} />
                  {isActive && (
                    <motion.div
                      layoutId="mobile-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-0.5">Analytics</span>
              </>
            )}
          </NavLink>

          {/* Center Add Action Button */}
          {canManageBudget && (
            <div className="flex-1 flex justify-center -mt-5">
              <button
                type="button"
                onClick={onAddExpense}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--primary)] via-purple-500 to-[var(--secondary)] text-[var(--background)] flex items-center justify-center shadow-[0_4px_20px_rgba(208,188,255,0.45)] hover:scale-105 active:scale-95 transition-transform"
                aria-label="Add transaction"
              >
                <Plus size={24} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Subscriptions */}
          <NavLink
            to="/subscriptions"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative p-1">
                  <CreditCard size={20} />
                  {isActive && (
                    <motion.div
                      layoutId="mobile-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-0.5">Subs</span>
              </>
            )}
          </NavLink>

          {/* More Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isMoreActive || isMoreOpen ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
            }`}
            aria-label="More navigation options"
          >
            <div className="relative p-1">
              <MoreHorizontal size={20} />
              {(isMoreActive || isMoreOpen) && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
              )}
            </div>
            <span className="text-[10px] font-semibold mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
