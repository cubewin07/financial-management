import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Bell, Calendar, ChevronRight, Activity } from 'lucide-react';
import { getUpcomingBillingAlerts, formatNextBilling } from '../../utils/subscriptions';
import { formatCurrency, formatMonthLabel } from '../../utils/finance';

export default function Topbar({ onMenuClick, subscriptions, defaultCurrency }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const alerts = getUpcomingBillingAlerts(subscriptions || [], { today: new Date(), daysAhead: 30 });
  const hasAlerts = alerts.length > 0;

  let title = 'Dashboard';
  if (location.pathname === '/subscriptions') title = 'Subscriptions';
  else if (location.pathname === '/breakdown') title = 'Spending Breakdown';
  else if (location.pathname === '/investments') title = 'Investments';
  else if (location.pathname === '/savings') title = 'Savings Goals';
  else if (location.pathname === '/settings') title = 'Budget Settings';
  else if (location.pathname === '/notifications') title = 'Notifications';

  const currentMonthName = formatMonthLabel(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 glass-card border-x-0 border-t-0 rounded-none z-30 relative">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
          aria-label="Open sidebar navigation"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-headline-md text-[var(--on-surface)] font-extrabold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4 relative" ref={dropdownRef}>
        {/* Live Month Tracking Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse" />
          <span className="font-semibold">{currentMonthName}</span>
          <span className="text-[10px] text-slate-400 font-medium">• Live</span>
        </div>

        {/* Notification Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[rgba(255,255,255,0.05)] transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--secondary-container)] shadow-[0_0_8px_rgba(0,238,252,0.8)]" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm glass-card p-4 rounded-2xl shadow-2xl border border-[var(--outline-variant)] bg-[var(--surface-container-high)] z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--outline-variant)]">
                <h3 className="text-label-md font-bold text-[var(--on-surface)]">Notifications</h3>
                {hasAlerts && (
                  <span className="text-label-sm px-2 py-0.5 rounded-full bg-[var(--tertiary)]/20 text-[var(--tertiary)] font-bold">
                    {alerts.length} new
                  </span>
                )}
              </div>

              {hasAlerts ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {alerts.slice(0, 4).map((sub) => (
                    <div key={sub.id} className="p-2.5 rounded-xl bg-[var(--surface-container-low)] border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-label-md font-semibold text-[var(--on-surface)]">{sub.label}</p>
                        <p className="text-label-sm text-[var(--secondary)] flex items-center gap-1">
                          <Calendar size={10} /> {formatNextBilling(sub.nextBilling)}
                        </p>
                      </div>
                      <span className="text-label-md font-bold text-[var(--primary)]">
                        {formatCurrency(sub.amount, sub.currency || defaultCurrency || 'NZD')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body-md text-[var(--on-surface-variant)] text-center py-6">
                  No pending notifications
                </p>
              )}

              <div className="mt-3 pt-2 border-t border-[var(--outline-variant)] text-center">
                <Link
                  to="/notifications"
                  className="inline-flex items-center gap-1 text-label-md text-[var(--primary)] hover:underline font-semibold"
                >
                  View all notifications <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
