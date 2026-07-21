import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Menu, Bell, Calendar, ChevronRight } from 'lucide-react';
import { getUpcomingBillingAlerts, formatNextBilling } from '../../utils/subscriptions';
import { formatCurrency } from '../../utils/finance';

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
  else if (location.pathname === '/notifications') title = 'Notifications';

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
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-headline-md text-[var(--on-surface)]">{title}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 relative" ref={dropdownRef}>
        {/* Notification Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[rgba(255,255,255,0.05)] transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--tertiary)] shadow-[0_0_8px_var(--tertiary)]" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card p-4 rounded-xl shadow-2xl border border-[var(--outline-variant)] bg-[var(--surface-container-high)] z-50 animate-in fade-in zoom-in-95 duration-150">
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
                    <div key={sub.id} className="p-2.5 rounded-lg bg-[var(--surface-container-low)] border border-white/5 flex items-center justify-between">
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

        {/* Search */}
        <div className="hidden sm:block relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--outline)]" />
          <input
            type="text"
            placeholder="Search..."
            className="input-shell pl-9 py-1.5 min-h-0 h-9 w-64 text-label-md bg-[rgba(255,255,255,0.05)] border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </div>
    </header>
  );
}
