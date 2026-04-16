import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { addMonths, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18L15 12L9 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatHeaderDate(dateString) {
  return dateString ? format(parseISO(dateString), 'EEE, MMM d') : 'Select date';
}

function DateRangePicker({ range, onChange }) {
  const [displayMonth, setDisplayMonth] = useState(() =>
    range?.start ? startOfMonth(parseISO(range.start)) : startOfMonth(new Date()),
  );
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (range?.start) {
      setDisplayMonth(startOfMonth(parseISO(range.start)));
    }
  }, [range?.start]);

  const selectedRange = useMemo(
    () => ({
      from: range?.start ? parseISO(range.start) : undefined,
      to: range?.end ? parseISO(range.end) : undefined,
    }),
    [range],
  );

  const handleSelect = (selected) => {
    onChange({
      start: selected?.from ? format(selected.from, 'yyyy-MM-dd') : '',
      end: selected?.to ? format(selected.to, 'yyyy-MM-dd') : '',
    });
  };

  return (
    <div className="finance-range-picker space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface-panel rounded-[22px] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">From</p>
          <p className="mt-2 text-base font-semibold tracking-tight text-[var(--text-primary)]">
            {formatHeaderDate(range?.start)}
          </p>
        </div>

        <div className="surface-panel rounded-[22px] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">To</p>
          <p className="mt-2 text-base font-semibold tracking-tight text-[var(--text-primary)]">
            {formatHeaderDate(range?.end)}
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="surface-panel inline-flex flex-wrap items-center justify-center gap-2 rounded-full px-2 py-2">
          <button
            type="button"
            onClick={() => setDisplayMonth((month) => subMonths(month, 1))}
            className="btn-secondary flex items-center gap-1.5 rounded-full px-4 py-2 text-sm"
          >
            <ChevronLeft />
            Previous
          </button>

          <div className="min-w-[170px] px-3 text-center text-sm font-medium text-[var(--text-primary)] sm:min-w-[240px]">
            {format(displayMonth, 'MMM yyyy')}
            {isDesktop ? ` – ${format(addMonths(displayMonth, 1), 'MMM yyyy')}` : ''}
          </div>

          <button
            type="button"
            onClick={() => setDisplayMonth((month) => addMonths(month, 1))}
            className="btn-secondary flex items-center gap-1.5 rounded-full px-4 py-2 text-sm"
          >
            Next
            <ChevronRight />
          </button>
        </div>
      </div>

      <DayPicker
        mode="range"
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        numberOfMonths={isDesktop ? 2 : 1}
        selected={selectedRange}
        onSelect={handleSelect}
        showOutsideDays
        fixedWeeks
        className="rounded-[28px] border border-[var(--border)] bg-[rgba(28,28,40,0.66)] p-3 sm:p-4"
        classNames={{
          root: 'rdp-root',
          months: 'flex flex-col gap-4 sm:flex-row sm:justify-center',
          month: 'space-y-4',
          month_caption: 'flex items-center justify-center pb-1',
          caption_label: 'text-lg font-semibold tracking-tight text-[var(--text-primary)]',
          nav: 'hidden',
          weekdays: 'flex',
          weekday:
            'w-11 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-tertiary)]',
          week: 'mt-1 flex w-full',
          day: 'h-11 w-11 p-0 text-center',
          day_button:
            'relative h-11 w-11 rounded-full border-0 bg-transparent p-0 text-sm text-[var(--text-primary)] transition-colors duration-200 hover:bg-[rgba(124,111,224,0.18)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(124,111,224,0.28)]',
          selected:
            'bg-[var(--accent-purple)] text-white hover:bg-[var(--accent-purple)] hover:text-white',
          range_start:
            'bg-[var(--accent-purple)] text-white rounded-full hover:bg-[var(--accent-purple)] hover:text-white',
          range_end:
            'bg-[var(--accent-teal)] text-[#07120f] rounded-full hover:bg-[var(--accent-teal)] hover:text-[#07120f]',
          range_middle:
            'bg-[rgba(124,111,224,0.12)] text-[var(--text-primary)] rounded-none hover:bg-[rgba(124,111,224,0.18)]',
          today: 'after:absolute after:left-1/2 after:top-[calc(50%+0.85rem)] after:h-[6px] after:w-[6px] after:-translate-x-1/2 after:rounded-full after:bg-[var(--accent-teal)]',
          outside: 'text-[var(--text-tertiary)] opacity-35',
          disabled: 'opacity-30',
          hidden: 'invisible',
        }}
      />
    </div>
  );
}

export default DateRangePicker;
