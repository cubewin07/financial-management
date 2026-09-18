import React from 'react';
import { DollarSign, Plus, Minus } from 'lucide-react';

export function CustomNumberInput({
  label,
  value,
  onChange,
  placeholder = '0.00',
  min = 0,
  step = 1,
  prefix = '$',
  error,
  disabled = false,
  className = '',
  ...props
}) {
  const handleIncrement = () => {
    const current = parseFloat(value) || 0;
    const updated = (current + step).toFixed(2);
    onChange({ target: { value: updated } });
  };

  const handleDecrement = () => {
    const current = parseFloat(value) || 0;
    const updated = Math.max(min, current - step).toFixed(2);
    onChange({ target: { value: updated } });
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3.5 text-cyan-400 font-semibold text-sm flex-shrink-0 pointer-events-none">
            {prefix}
          </span>
        )}

        <input
          type="number"
          step={step}
          min={min}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-11 no-spinners ${
            prefix ? 'pl-8' : 'pl-3.5'
          } pr-16 rounded-xl text-sm font-medium bg-slate-900/60 border text-slate-100 placeholder-slate-500 transition-all duration-200 focus:bg-slate-900/90 focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,238,252,0.15)] focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
          }`}
          {...props}
        />

        {/* Stepper Buttons */}
        {!disabled && (
          <div className="absolute right-2 flex items-center gap-1 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={handleDecrement}
              className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleIncrement}
              className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
