import { useState, useRef, useEffect, useId, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const spring = {
  type: 'spring',
  bounce: 0.15,
  duration: 0.45,
};

function Select({ options, value, onChange, className, name }) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value]
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
        className={twMerge(
          "input-shell flex min-h-[56px] w-full items-center justify-between gap-3 text-left outline-none transition",
          className
        )}
      >
        <span className="block truncate text-base text-[var(--text-primary)]">
          {selectedOption?.label || 'Select an option'}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring}
          className="text-[var(--text-secondary)]"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduceMotion ? { duration: 0.12 } : spring}
            className="absolute left-0 right-0 top-full z-[240] mt-2 overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.09)] bg-[rgba(19,19,26,0.98)] shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          >
            <LayoutGroup>
              <div className="p-2 max-h-[300px] overflow-y-auto">
                {options.map((option) => {
                  const showHighlight = hoveredValue === option.value || value === option.value;

                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onMouseEnter={() => setHoveredValue(option.value)}
                      onMouseLeave={() => setHoveredValue(null)}
                      onClick={() => {
                        onChange({ target: { name, value: option.value } }, option.value);
                        setOpen(false);
                      }}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      className="relative flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition"
                    >
                      {showHighlight ? (
                        <motion.div
                          layoutId="select-option-highlight"
                          transition={reduceMotion ? { duration: 0.1 } : spring}
                          className="absolute inset-0 rounded-[14px] bg-[rgba(124,111,224,0.12)]"
                        />
                      ) : null}
                      <span className="relative block text-base font-medium text-[var(--text-primary)] z-10">
                        {option.label}
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

export default Select;
