import { useId } from 'react';
import { motion } from 'framer-motion';

export function CustomSwitch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) {
  const switchId = useId();
  const labelId = `${switchId}-label`;
  const descId = `${switchId}-desc`;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              id={labelId}
              htmlFor={switchId}
              className={`text-sm font-medium text-slate-200 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {label}
            </label>
          )}
          {description && (
            <span id={descId} className="text-xs text-slate-400 mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        className={`inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors duration-300 ease-in-out ${
            checked ? 'bg-cyan-500 border-transparent shadow-[0_0_12px_rgba(0,238,252,0.4)]' : 'bg-slate-800 border-white/10'
          }`}
        >
          <motion.span
            animate={{ x: checked ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0"
          />
        </span>
      </button>
    </div>
  );
}
