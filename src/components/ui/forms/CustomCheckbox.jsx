import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function CustomCheckbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
}) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange && onChange(e.target.checked)}
          className="sr-only"
          disabled={disabled}
        />
        <motion.div
          animate={{
            scale: checked ? [0.85, 1.08, 1] : 1,
            backgroundColor: checked ? 'rgba(168, 85, 247, 0.9)' : 'rgba(15, 23, 42, 0.6)',
            borderColor: checked ? 'rgba(208, 188, 255, 0.8)' : 'rgba(255, 255, 255, 0.2)',
          }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 rounded-md border flex items-center justify-center shadow-inner transition-colors duration-200"
        >
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
            </motion.div>
          )}
        </motion.div>
      </div>
      {label && <span className="text-sm font-medium text-slate-300">{label}</span>}
    </label>
  );
}
