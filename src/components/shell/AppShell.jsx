import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function AppShell({ children, userEmail, subscriptions, defaultCurrency, isProMember, onAddExpense, canManageBudget }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Global desktop keyboard shortcut: Press 'E' or Cmd+E to quickly open Add Expense
  useEffect(() => {
    if (!canManageBudget || !onAddExpense) return;

    const handleKeyDown = (e) => {
      // Ignore if user is actively typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement?.isContentEditable) {
        return;
      }

      if ((e.key === 'e' || e.key === 'E') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onAddExpense();
      } else if ((e.key === 'e' || e.key === 'E') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onAddExpense();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canManageBudget, onAddExpense]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[260px] fixed inset-y-0 left-0 z-20">
        <Sidebar userEmail={userEmail} isProMember={isProMember} onAddExpense={onAddExpense} canManageBudget={canManageBudget} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-40 w-[260px] lg:hidden"
            >
              <Sidebar userEmail={userEmail} isProMember={isProMember} onAddExpense={onAddExpense} canManageBudget={canManageBudget} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-h-screen min-w-0">
        <Topbar
          onMenuClick={() => setIsMobileMenuOpen(true)}
          subscriptions={subscriptions}
          defaultCurrency={defaultCurrency}
          onAddExpense={onAddExpense}
          canManageBudget={canManageBudget}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-24 sm:pb-24 lg:pb-10 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* iPhone-Optimized Mobile Bottom Bar */}
      <MobileBottomNav onAddExpense={onAddExpense} canManageBudget={canManageBudget} />
    </div>
  );
}
