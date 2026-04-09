import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

const spring = {
  type: 'spring',
  bounce: 0.15,
  duration: 0.5,
};

function ChevronIcon({ open }) {
  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ rotate: open ? 180 : 0 }}
      transition={spring}
      className="text-neutral-400"
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

function CalendarIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7 3V6M17 3V6M4 9H20M5 5H19C19.5523 5 20 5.44772 20 6V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V6C4 5.44772 4.44772 5 5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnimatedSelect({ options, value, onChange, onSelectCustom }) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const defaultOption = options[0];
  const secondaryOptions = options.slice(1);
  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        className="premium-panel flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-neutral-400 outline-none transition duration-200 hover:bg-white/10 hover:text-neutral-200 focus:ring-2 focus:ring-white/15 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${selectedOption.accent}22`, color: selectedOption.accent }}
          >
            {selectedOption.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">
              {selectedOption.label}
            </span>
            <span className="block truncate text-xs text-neutral-400">
              {selectedOption.description}
            </span>
          </span>
        </span>

        <ChevronIcon open={open || triggerHovered} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : spring}
            className="absolute left-0 right-0 z-[110] mt-3 overflow-hidden rounded-2xl border border-white/8 bg-neutral-900/95 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <LayoutGroup>
              <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: reduceMotion ? 0 : 0.04,
                    },
                  },
                }}
                className="p-2"
              >
                {[defaultOption].map((option) => {
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
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                      }}
                      className="relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
                    >
                      {showHighlight ? (
                        <motion.div
                          layoutId="period-select-highlight"
                          transition={reduceMotion ? { duration: 0.1 } : spring}
                          className="absolute inset-0 rounded-xl bg-white/8"
                        />
                      ) : null}
                      <motion.span
                        animate={{
                          scale: hoveredValue === option.value ? 1.08 : 1,
                          color: hoveredValue === option.value ? option.accent : option.accent,
                        }}
                        transition={reduceMotion ? { duration: 0 } : spring}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${option.accent}22` }}
                      >
                        {option.icon}
                      </motion.span>
                      <span className="relative">
                        <span className="block text-sm font-medium text-white">{option.label}</span>
                        <span className="block text-xs text-neutral-400">{option.description}</span>
                      </span>
                    </motion.button>
                  );
                })}

                <div className="mx-3 my-2 h-px bg-white/8" />

                {secondaryOptions.map((option) => {
                  const showHighlight = hoveredValue === option.value || value === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onMouseEnter={() => setHoveredValue(option.value)}
                      onMouseLeave={() => setHoveredValue(null)}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                      }}
                      className="relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
                    >
                      {showHighlight ? (
                        <motion.div
                          layoutId="period-select-highlight"
                          transition={reduceMotion ? { duration: 0.1 } : spring}
                          className="absolute inset-0 rounded-xl bg-white/8"
                        />
                      ) : null}
                      <motion.span
                        animate={{
                          scale: hoveredValue === option.value ? 1.08 : 1,
                          color: hoveredValue === option.value ? option.accent : option.accent,
                        }}
                        transition={reduceMotion ? { duration: 0 } : spring}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${option.accent}22` }}
                      >
                        {option.icon}
                      </motion.span>
                      <span className="relative">
                        <span className="block text-sm font-medium text-white">{option.label}</span>
                        <span className="block text-xs text-neutral-400">{option.description}</span>
                      </span>
                    </motion.button>
                  );
                })}

              </motion.div>
            </LayoutGroup>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedSelect;
