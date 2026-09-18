import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isValid, addMonths, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS_HEADER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CustomDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  error,
  disabled = false,
  className = '',
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Parse current value into a Date object or null
  const selectedDate = useMemo(() => {
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : null;
    }
    return null;
  }, [value]);

  // Calendar view state (year and month)
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Position calculation for portal popover
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 280;
      const height = 330;

      let top = rect.bottom + 6;
      // Auto flip if near bottom of screen
      if (top + height > window.innerHeight - 10 && rect.top - height - 6 > 10) {
        top = rect.top - height - 6;
      }

      let left = rect.right - width;
      if (left < 10) left = 10;
      if (left + width > window.innerWidth - 10) {
        left = window.innerWidth - width - 10;
      }

      setCoords({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();

      const handleClickOutside = (e) => {
        if (
          buttonRef.current && !buttonRef.current.contains(e.target) &&
          popoverRef.current && !popoverRef.current.contains(e.target)
        ) {
          setIsOpen(false);
        }
      };

      const handleScroll = () => updateCoords();

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Generate 42 calendar grid cells
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, dayNum);
      cells.push({ dayNum, dateObj, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({ dayNum: d, dateObj, isCurrentMonth: true });
    }

    // Next month padding to fill grid
    const remaining = 42 - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const dateObj = new Date(year, month + 1, n);
      cells.push({ dayNum: n, dateObj, isCurrentMonth: false });
    }

    return cells;
  }, [year, month]);

  const handleSelectDate = (dateObj) => {
    const formatted = format(dateObj, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  const handleQuickPreset = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    handleSelectDate(d);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide">
          {label} {required && <span className="text-cyan-400">*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all duration-200 text-left border ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${isOpen
            ? 'border-cyan-400/50 bg-slate-900/90 shadow-[0_0_15px_rgba(0,238,252,0.15)] ring-2 ring-cyan-400/20'
            : error
              ? 'border-red-500/50 bg-slate-900/60'
              : 'border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/80'
          }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <CalendarIcon className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className={`truncate ${selectedDate ? 'text-slate-100 font-semibold' : 'text-slate-400'}`}>
            {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : placeholder}
          </span>
        </div>
        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Render custom date picker portal directly into document.body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: '280px',
                }}
                className="z-[9999] p-3.5 rounded-2xl border border-cyan-400/30 bg-slate-950/98 backdrop-blur-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] text-slate-100 select-none"
              >
                {/* Quick Presets Bar */}
                <div className="flex items-center gap-1.5 pb-2 mb-2.5 border-b border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(-1)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(30)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    +1 Month
                  </button>
                </div>

                {/* Header: Month Year Nav */}
                <div className="flex items-center justify-between px-1 mb-2.5">
                  <span className="text-sm font-bold text-slate-100">
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {DAYS_HEADER.map((day) => (
                    <span key={day} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider py-1">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarCells.map(({ dayNum, dateObj, isCurrentMonth }, idx) => {
                    const formattedCell = format(dateObj, 'yyyy-MM-dd');
                    const isSelected = formattedCell === selectedStr;
                    const isToday = formattedCell === todayStr;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDate(dateObj)}
                        className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${isSelected
                            ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-extrabold shadow-[0_0_12px_rgba(0,238,252,0.5)] scale-105'
                            : isToday
                              ? 'border border-cyan-400/60 text-cyan-300 font-bold bg-cyan-500/10 hover:bg-cyan-500/25'
                              : isCurrentMonth
                                ? 'text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-200'
                                : 'text-slate-600 opacity-40 hover:bg-white/5'
                          }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
