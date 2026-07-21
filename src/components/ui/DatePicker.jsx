import { useState, forwardRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import 'react-day-picker/dist/style.css'; // Basic styles, we will override with Tailwind

const DatePicker = forwardRef(({ name = 'date', value, onChange, className }, ref) => {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : undefined;

  const handleSelect = (date) => {
    if (date) {
      // Format as YYYY-MM-DD to match native input date format
      const formatted = format(date, 'yyyy-MM-dd');
      onChange({ target: { name, value: formatted } }, formatted);
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={twMerge(
            "input-shell flex items-center gap-3 w-full text-left !min-h-[56px]",
            !value && "text-[var(--text-secondary)]",
            className
          )}
        >
          <CalendarIcon size={18} className="text-[var(--text-secondary)]" />
          <span className="flex-grow truncate whitespace-nowrap text-left">
            {value ? format(parseISO(value), 'MMM d, yyyy') : 'Select a date'}
          </span>
        </button>
      </Popover.Trigger>
      
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content
              align="start"
              sideOffset={8}
              asChild
              className="z-[240]"
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-[rgba(19,19,26,0.98)] border border-[rgba(255,255,255,0.09)] rounded-3xl p-4 shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl"
              >
                <style>{`
                  .rdp-root, .rdp {
                    --rdp-cell-size: 40px;
                    --rdp-accent-color: var(--text-primary);
                    --rdp-background-color: rgba(255, 255, 255, 0.08);
                    --rdp-accent-color-dark: var(--text-primary);
                    --rdp-background-color-dark: rgba(255, 255, 255, 0.08);
                    --rdp-outline: 2px solid var(--text-primary);
                    --rdp-outline-selected: 2px solid var(--text-primary);
                    color: var(--text-primary);
                    margin: 0;
                  }
                  .rdp-selected, .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                    background-color: var(--text-primary) !important;
                    color: var(--bg-app) !important;
                    font-weight: 600 !important;
                  }
                  .rdp-today, .rdp-day_today {
                    font-weight: 600 !important;
                    color: var(--text-primary) !important;
                    background-color: rgba(255, 255, 255, 0.1) !important;
                  }
                  .rdp-button:hover:not([disabled]):not(.rdp-selected):not(.rdp-day_selected) {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                  }
                  .rdp-nav_button {
                    border-radius: 12px;
                  }
                  .rdp-day {
                    border-radius: 12px;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                  }
                  .rdp-day:active:not([disabled]) {
                    transform: scale(0.9);
                  }
                  .rdp-head_cell {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    padding-bottom: 0.5rem;
                  }
                  .rdp-caption_label {
                    font-size: 1rem;
                    font-weight: 600;
                  }
                `}</style>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelect}
                  showOutsideDays
                />
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;
