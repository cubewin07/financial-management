import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Menu,
  Bell,
  Calendar,
  ChevronRight,
  Compass,
  LayoutDashboard,
  PieChart,
  PiggyBank,
  Repeat,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { getUpcomingBillingAlerts, formatNextBilling } from '../../utils/subscriptions';
import { formatCurrency, formatMonthLabel } from '../../utils/finance';

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Parse "YYYY-MM-DD" as a LOCAL date (new Date('2026-10-25') would be UTC)
function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return isNaN(d) ? null : d;
}

function daysUntil(value) {
  const d = parseLocalDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function dueLabel(d) {
  if (d === null) return '';
  if (d <= 0) return 'Due today';
  if (d === 1) return 'Tomorrow';
  return `in ${d} days`;
}

function dueTone(d) {
  if (d === null) return 'text-slate-300 bg-white/5 border-white/10';
  if (d <= 1) return 'text-rose-300 bg-rose-400/10 border-rose-400/25';
  if (d <= 3) return 'text-amber-300 bg-amber-400/10 border-amber-400/25';
  return 'text-teal-300 bg-teal-400/10 border-teal-400/25';
}

/* ------------------------------------------------------------------ *
 *  Component
 * ------------------------------------------------------------------ */
export default function Topbar({ onMenuClick, subscriptions, defaultCurrency }) {
  const location = useLocation();
  const reduce = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const now = new Date();
  const currency = defaultCurrency || 'NZD';

  // Soonest bill first
  const alerts = [...getUpcomingBillingAlerts(subscriptions || [], { today: now, daysAhead: 30 })].sort(
    (a, b) => (daysUntil(a.nextBilling) ?? Infinity) - (daysUntil(b.nextBilling) ?? Infinity)
  );
  const hasAlerts = alerts.length > 0;
  const nextBill = alerts[0];
  const nextBillDays = nextBill ? daysUntil(nextBill.nextBilling) : null;

  // Total due is only shown when every upcoming bill shares one currency
  const currencies = new Set(alerts.map((a) => a.currency || currency));
  const totalDue =
    currencies.size === 1 ? alerts.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) : null;

  // Month progress (local time, so the label never flips a day early/late)
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct = Math.round((day / daysInMonth) * 100);
  const currentMonthName = formatMonthLabel(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const PAGES = {
    '/': {
      title: 'Dashboard',
      icon: LayoutDashboard,
      subtitle: `${greeting(now.getHours())}, here's your financial snapshot`,
    },
    '/subscriptions': { title: 'Subscriptions', icon: Repeat, subtitle: 'Recurring payments at a glance' },
    '/breakdown': { title: 'Spending Breakdown', icon: PieChart, subtitle: 'Where your money is going' },
    '/investments': { title: 'Investments', icon: TrendingUp, subtitle: 'Track how your portfolio is growing' },
    '/savings': { title: 'Savings Goals', icon: PiggyBank, subtitle: 'Progress toward what matters' },
    '/settings': { title: 'Budget Settings', icon: Settings, subtitle: 'Budgets and preferences' },
    '/notifications': { title: 'Notifications', icon: Bell, subtitle: 'Upcoming bills and alerts' },
    '/review-hub': { title: 'Review Hub', icon: Users, subtitle: 'Give and get feedback on budgets' },
  };
  const page =
    PAGES[location.pathname] ||
    (location.pathname.startsWith('/review-hub/')
      ? PAGES['/review-hub']
      : {
          title: 'Page Not Found',
          icon: Compass,
          subtitle: 'This route is off the map',
        });
  const PageIcon = page.icon;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="h-16 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 glass-card border-x-0 border-t-0 rounded-none z-30 relative">
      {/* ---------- Left: menu + animated page title ---------- */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
          aria-label="Open sidebar navigation"
        >
          <Menu size={22} />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 min-w-0"
          >
            <span className="hidden sm:flex w-9 h-9 shrink-0 rounded-xl items-center justify-center bg-gradient-to-tr from-[var(--primary)]/25 to-[var(--tertiary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] shadow-[0_0_18px_rgba(208,188,255,0.18)]">
              <PageIcon size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-headline-md text-[var(--on-surface)] font-extrabold tracking-tight leading-tight truncate">
                {page.title}
              </h1>
              <p className="hidden sm:block text-label-sm text-[var(--on-surface-variant)] truncate leading-tight">
                {page.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ---------- Right: month progress, next bill, bell ---------- */}
      <div className="flex items-center gap-2.5 sm:gap-3 relative shrink-0" ref={dropdownRef}>
        {/* Month progress pill */}
        <div
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs text-slate-300"
          title={`${monthPct}% of ${currentMonthName} has passed`}
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse" />
          <span className="font-semibold">{currentMonthName}</span>
          <span className="hidden md:block w-14 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.span
              className="block h-full rounded-full bg-gradient-to-r from-teal-400 to-[var(--primary)]"
              initial={{ width: 0 }}
              animate={{ width: `${monthPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </span>
          <span className="text-[10px] text-slate-400 font-medium tabular-nums">
            Day {day}/{daysInMonth}
          </span>
        </div>

        {/* Next bill chip */}
        {nextBill && (
          <Link
            to="/subscriptions"
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors hover:brightness-125 ${dueTone(nextBillDays)}`}
            title="Next upcoming bill"
          >
            <Calendar size={12} />
            <span className="font-semibold max-w-[110px] truncate">{nextBill.label}</span>
            <span className="opacity-80">{dueLabel(nextBillDays) || formatNextBilling(nextBill.nextBilling)}</span>
          </Link>
        )}

        {/* Notification bell & dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[rgba(255,255,255,0.05)] transition-colors relative"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <motion.span
              className="block"
              style={{ transformOrigin: '50% 10%' }}
              animate={hasAlerts && !reduce ? { rotate: [0, -14, 12, -8, 5, 0] } : { rotate: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 6 }}
            >
              <Bell size={20} />
            </motion.span>

            {hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 flex">
                {!reduce && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-[var(--secondary-container)]"
                    animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <span className="relative min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--secondary-container)] text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(0,238,252,0.8)]">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{ transformOrigin: 'top right' }}
                className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm glass-card p-4 rounded-2xl shadow-2xl border border-[var(--outline-variant)] bg-[var(--surface-container-high)] z-50"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--outline-variant)]">
                  <div>
                    <h3 className="text-label-md font-bold text-[var(--on-surface)]">Notifications</h3>
                    {hasAlerts && totalDue !== null && (
                      <p className="text-label-sm text-[var(--on-surface-variant)]">
                        {formatCurrency(totalDue, [...currencies][0])} due in the next 30 days
                      </p>
                    )}
                  </div>
                  {hasAlerts && (
                    <span className="text-label-sm px-2 py-0.5 rounded-full bg-[var(--tertiary)]/20 text-[var(--tertiary)] font-bold">
                      {alerts.length} new
                    </span>
                  )}
                </div>

                {hasAlerts ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {alerts.slice(0, 4).map((sub, i) => {
                      const d = daysUntil(sub.nextBilling);
                      return (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 + i * 0.05 }}
                          className="p-2.5 rounded-xl bg-[var(--surface-container-low)] border border-white/5 hover:border-white/15 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-label-md font-semibold text-[var(--on-surface)] truncate">{sub.label}</p>
                            <p className="text-label-sm text-[var(--secondary)] flex items-center gap-1">
                              <Calendar size={10} /> {formatNextBilling(sub.nextBilling)}
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-label-md font-bold text-[var(--primary)]">
                              {formatCurrency(sub.amount, sub.currency || currency)}
                            </span>
                            {d !== null && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${dueTone(d)}`}>
                                {dueLabel(d)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---------- Month progress line along the bottom edge ---------- */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.04] pointer-events-none" aria-hidden="true">
        <motion.div
          className="relative h-full bg-gradient-to-r from-teal-400 via-[var(--primary)] to-[var(--tertiary)]"
          initial={{ width: 0 }}
          animate={{ width: `${monthPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-[4px] rounded-full bg-white/70 blur-[3px]" />
        </motion.div>
      </div>
    </header>
  );
}
