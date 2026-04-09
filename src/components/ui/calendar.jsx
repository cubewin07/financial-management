import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '../../lib/utils';

function ChevronLeft(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
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

function ChevronRight(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
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

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2 text-white', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-4',
        caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'text-sm font-medium text-white',
        nav: 'flex items-center gap-1',
        nav_button:
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'w-9 text-[0.8rem] font-medium text-neutral-500',
        row: 'mt-2 flex w-full',
        cell: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-xl [&:has([aria-selected].day-range-start)]:rounded-l-xl [&:has([aria-selected].day-range-middle)]:bg-emerald-300/8',
        day: 'h-9 w-9 rounded-xl p-0 font-normal text-neutral-200 transition hover:bg-white/8 hover:text-white',
        day_selected:
          'bg-emerald-400/85 text-emerald-950 shadow-[0_10px_20px_rgba(52,211,153,0.22)] hover:bg-emerald-400/85 hover:text-emerald-950 focus:bg-emerald-400/85 focus:text-emerald-950',
        day_today: 'border border-white/12 bg-white/6 text-white',
        day_outside: 'text-neutral-600 opacity-50',
        day_disabled: 'text-neutral-700 opacity-50',
        day_range_start:
          'day-range-start bg-emerald-400/85 text-emerald-950 hover:bg-emerald-400/85 hover:text-emerald-950',
        day_range_end:
          'day-range-end bg-emerald-400/85 text-emerald-950 hover:bg-emerald-400/85 hover:text-emerald-950',
        day_range_middle:
          'day-range-middle rounded-none bg-emerald-400/16 text-emerald-100 hover:bg-emerald-400/20',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === 'left' ? (
            <ChevronLeft {...iconProps} />
          ) : (
            <ChevronRight {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
