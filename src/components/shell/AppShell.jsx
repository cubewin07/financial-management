import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import useModalDialog from '../../hooks/useModalDialog';

export default function AppShell({
  children,
  userEmail,
  subscriptions,
  defaultCurrency,
  isProMember,
  onAddExpense,
  revieweeCandidates = [],
  unreadFeedbackCount = 0,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mobileMenuDialogRef = useModalDialog(isMobileMenuOpen, () => setIsMobileMenuOpen(false));

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Global desktop keyboard shortcut: Press 'E' or Cmd+E to quickly open Add Expense
  useEffect(() => {
    if (!onAddExpense) return;

    const handleKeyDown = (e) => {
      // Ignore if user is actively typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement?.isContentEditable) {
        return;
      }

      // Ignore if a modal or dialog is already open
      if (document.querySelector('[role="dialog"]') || document.querySelector('[aria-modal="true"]')) {
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
  }, [onAddExpense]);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[260px] fixed inset-y-0 left-0 z-20">
        <Sidebar
          userEmail={userEmail}
          isProMember={isProMember}
          onAddExpense={onAddExpense}
          revieweeCandidates={revieweeCandidates}
          unreadFeedbackCount={unreadFeedbackCount}
        />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
            />
            <motion.div
              ref={mobileMenuDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[80] w-[260px] lg:hidden focus:outline-none"
            >
              <Sidebar
                userEmail={userEmail}
                isProMember={isProMember}
                onAddExpense={() => {
                  setIsMobileMenuOpen(false);
                  onAddExpense?.();
                }}
                onNavigate={() => setIsMobileMenuOpen(false)}
                revieweeCandidates={revieweeCandidates}
                unreadFeedbackCount={unreadFeedbackCount}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-h-[100dvh] min-w-0">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} subscriptions={subscriptions} defaultCurrency={defaultCurrency} />
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* iPhone-Optimized Mobile Bottom Bar */}
      <MobileBottomNav
        onAddExpense={onAddExpense}
        unreadFeedbackCount={unreadFeedbackCount}
        isSidebarOpen={isMobileMenuOpen}
      />
    </div>
  );
}
