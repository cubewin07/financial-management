import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

const spring = {
  type: 'spring',
  bounce: 0.15,
  duration: 0.45,
};

function ChevronIcon({ open }) {
  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: open ? 180 : 0 }}
      transition={spring}
      className="text-[var(--text-secondary)]"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

function AnimatedSelect({ options, value, onChange, onSelectCustom }) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={ref} className="relative z-[120] overflow-visible">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="surface-panel flex min-h-[60px] w-full items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-left outline-none transition hover:border-[rgba(124,111,224,0.24)] focus-visible:border-[rgba(124,111,224,0.28)] focus-visible:shadow-[0_0_0_4px_rgba(124,111,224,0.12)]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${selectedOption.accent}22`, color: selectedOption.accent }}
          >
            {selectedOption.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
              {selectedOption.label}
            </span>
            <span className="block truncate text-xs text-[var(--text-secondary)]">
              {selectedOption.description}
            </span>
          </span>
        </span>

        <ChevronIcon open={open} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0.12 } : spring}
            className="absolute left-0 right-0 top-full z-[240] mt-3 overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.09)] bg-[rgba(19,19,26,0.98)] shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          >
            <LayoutGroup>
              <div className="p-2">
                {options.map((option) => {
                  const showHighlight = hoveredValue === option.value || value === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onMouseEnter={() => setHoveredValue(option.value)}
                      onMouseLeave={() => setHoveredValue(null)}
                      onClick={() => {
                        onChange(option.value);
                        if (option.value === 'custom') {
                          onSelectCustom?.();
                        }
                        setOpen(false);
                      }}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      className="relative flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition"
                    >
                      {showHighlight ? (
                        <motion.div
                          layoutId="period-option-highlight"
                          transition={reduceMotion ? { duration: 0.1 } : spring}
                          className="absolute inset-0 rounded-[18px] bg-[rgba(124,111,224,0.12)]"
                        />
                      ) : null}
                      <span
                        className="relative flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${option.accent}22`, color: option.accent }}
                      >
                        {option.icon}
                      </span>
                      <span className="relative">
                        <span className="block text-sm font-medium text-[var(--text-primary)]">
                          {option.label}
                        </span>
                        <span className="block text-xs text-[var(--text-secondary)]">
                          {option.description}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </LayoutGroup>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedSelect;
