import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

function getOptionValue(option) {
  return typeof option === 'string' ? option : option?.value;
}

function getOptionLabel(option) {
  return typeof option === 'string' ? option : option?.label;
}

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
  id,
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const listboxRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({
    top: 0,
    left: 0,
    width: 200,
    maxHeight: 240,
    openUpward: false,
  });

  const hasValue = value !== '' && value !== null && value !== undefined;
  const matchedOption = hasValue ? options.find((opt) => getOptionValue(opt) === value) : null;
  const selectedLabel = matchedOption
    ? getOptionLabel(matchedOption)
    : hasValue
      ? String(value)
      : null;

  const updateMenuCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(240, Math.max(52, options.length * 44 + 8));
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUpward = spaceBelow < Math.min(estimatedHeight, 180) && spaceAbove > spaceBelow;
    const available = Math.max(120, openUpward ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(240, available);
    const width = Math.min(rect.width, window.innerWidth - 20);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));

    if (openUpward) {
      setMenuStyle({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width,
        maxHeight,
        openUpward: true,
      });
    } else {
      setMenuStyle({
        top: Math.max(10, Math.min(rect.bottom + 6, window.innerHeight - maxHeight - 10)),
        left,
        width,
        maxHeight,
        openUpward: false,
      });
    }
  }, [options.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    updateMenuCoords();

    function handleClickOutside(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
        !listboxRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      // Close only this popover, not the modal that contains it.
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape, true);
    window.addEventListener('resize', updateMenuCoords);
    window.addEventListener('scroll', updateMenuCoords, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape, true);
      window.removeEventListener('resize', updateMenuCoords);
      window.removeEventListener('scroll', updateMenuCoords, true);
    };
  }, [isOpen, updateMenuCoords]);

  const focusOption = (index = 0) => {
    requestAnimationFrame(() => {
      const items = [...(listboxRef.current?.querySelectorAll('[role="option"]') || [])];
      if (items.length === 0) return;
      if (index === -1) {
        items[items.length - 1]?.focus();
      } else {
        items[index]?.focus();
      }
    });
  };

  const handleListKeyDown = (event) => {
    const items = [...event.currentTarget.querySelectorAll('[role="option"]')];
    if (event.key === 'Tab') {
      setIsOpen(false);
      return;
    }
    if (items.length === 0) return;

    if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const index = items.indexOf(document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  };

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const listboxMenu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={listboxRef}
          initial={{ opacity: 0, y: menuStyle.openUpward ? 6 : -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: menuStyle.openUpward ? 6 : -6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          role="listbox"
          onKeyDown={handleListKeyDown}
          aria-labelledby={label ? `${selectId}-label` : undefined}
          style={{
            position: 'fixed',
            top: menuStyle.top,
            bottom: menuStyle.bottom,
            left: `${menuStyle.left}px`,
            width: `${menuStyle.width}px`,
            maxHeight: `${menuStyle.maxHeight}px`,
          }}
          className="z-[9999] rounded-xl border border-white/15 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-y-auto overscroll-contain py-1"
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-slate-400">No options available</div>
          ) : (
            options.map((option) => {
              const optValue = getOptionValue(option);
              const optLabel = getOptionLabel(option);
              const isSelected = value === optValue;

              return (
                <button
                  key={optValue}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(optValue)}
                  className={`w-full min-h-[44px] sm:min-h-[38px] px-3.5 py-2.5 sm:py-2 text-base sm:text-sm flex items-center justify-between text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-200 font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-slate-100'
                  }`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label id={`${selectId}-label`} htmlFor={selectId} className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) setIsOpen(true);
            focusOption(event.key === 'ArrowUp' ? -1 : 0);
          } else if (isOpen && event.key === 'Tab') {
            setIsOpen(false);
          }
        }}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-11 px-3.5 rounded-xl text-base sm:text-sm font-medium flex items-center justify-between transition-all duration-200 text-left border ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          isOpen
            ? 'border-cyan-400/50 bg-slate-900/90 shadow-[0_0_15px_rgba(0,238,252,0.15)] ring-2 ring-cyan-400/20'
            : error
            ? 'border-red-500/50 bg-slate-900/60'
            : 'border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/80'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {Icon && <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
          <span className={`truncate ${selectedLabel !== null ? 'text-slate-100' : 'text-slate-400'}`}>
            {selectedLabel !== null ? selectedLabel : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {typeof document !== 'undefined' && createPortal(listboxMenu, document.body)}

      {error && (
        <span id={errorId} role="alert" className="text-xs text-red-400 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
