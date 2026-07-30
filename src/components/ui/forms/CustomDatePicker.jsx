import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import 'react-day-picker/dist/style.css';

export function CustomDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date...',
  error,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse string or Date object safely
  let selectedDate = null;
  if (value) {
    if (value instanceof Date) {
      selectedDate = value;
    } else if (typeof value === 'string') {
      const parsed = parseISO(value);
      if (isValid(parsed)) selectedDate = parsed;
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (date) => {
    if (!date) return;
    const formatted = format(date, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickPreset = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    handleSelect(d);
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all duration-200 text-left border ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          isOpen
            ? 'border-purple-400/50 bg-slate-900/90 shadow-[0_0_15px_rgba(208,188,255,0.15)] ring-2 ring-purple-400/20'
            : error
            ? 'border-red-500/50 bg-slate-900/60'
            : 'border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/80'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <CalendarIcon className="w-4 h-4 text-purple-300 flex-shrink-0" />
          <span className={`truncate ${selectedDate ? 'text-slate-100' : 'text-slate-400'}`}>
            {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : placeholder}
          </span>
        </div>
        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 z-50 mt-1.5 p-3 rounded-2xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl finance-range-picker"
          >
            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-white/10 text-xs">
              <button
                type="button"
                onClick={() => handleQuickPreset(0)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 text-slate-300 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(-1)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 text-slate-300 transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(30)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 text-slate-300 transition-colors"
              >
                +1 Month
              </button>
            </div>

            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              components={{
                IconLeft: () => <ChevronLeft className="w-4 h-4 text-purple-300" />,
                IconRight: () => <ChevronRight className="w-4 h-4 text-purple-300" />,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
