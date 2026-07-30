import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  error,
  icon: Icon,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || (typeof value === 'string' ? { label: value, value } : null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
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
          {Icon && <Icon className="w-4 h-4 text-purple-300 flex-shrink-0" />}
          <span className={`truncate ${selectedOption ? 'text-slate-100' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-purple-300' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-60 overflow-y-auto py-1"
          >
            {options.length === 0 ? (
              <div className="px-3.5 py-2.5 text-xs text-slate-400">No options available</div>
            ) : (
              options.map((option) => {
                const optValue = typeof option === 'string' ? option : option.value;
                const optLabel = typeof option === 'string' ? option : option.label;
                const isSelected = value === optValue;

                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => handleSelect(optValue)}
                    className={`w-full px-3.5 py-2.5 text-sm flex items-center justify-between text-left transition-colors duration-150 ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-200 font-semibold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-slate-100'
                    }`}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
