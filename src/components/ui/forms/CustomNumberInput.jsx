import { useId } from 'react';
import { Plus, Minus } from 'lucide-react';
import { getCurrencySymbol } from '../../../utils/finance';

export function CustomNumberInput({
  label,
  value,
  onChange,
  placeholder = '0.00',
  min = 0,
  step = 1,
  prefix,
  currency,
  error,
  disabled = false,
  className = '',
  id,
  showStepper = true,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const resolvedPrefix = prefix !== undefined ? prefix : (currency ? getCurrencySymbol(currency) : '$');

  const stepBy = (delta) => {
    const current = parseFloat(value) || 0;
    const stepped = Math.max(min, current + delta);
    const clamped = props.max !== undefined ? Math.min(Number(props.max), stepped) : stepped;
    onChange({ target: { value: String(Number(clamped.toFixed(2))) } });
  };

  const stepSize = Number(step) || 1;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {resolvedPrefix && (
          <span className="absolute left-3.5 text-cyan-400 font-semibold text-sm flex-shrink-0 pointer-events-none">
            {resolvedPrefix}
          </span>
        )}

        <input
          id={inputId}
          style={resolvedPrefix ? { paddingLeft: `${0.875 + String(resolvedPrefix).length * 0.6 + 0.375}rem` } : undefined}
          type="number"
          inputMode="decimal"
          // `step` only sizes the +/- buttons: a native step would reject amounts with cents on submit.
          step="any"
          min={min}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-11 no-spinners ${
            resolvedPrefix ? '' : 'pl-3.5'
          } ${showStepper ? 'pr-20' : 'pr-3'} rounded-xl text-sm font-medium bg-slate-900/60 border text-slate-100 placeholder-slate-500 transition-all duration-200 focus:bg-slate-900/90 focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,238,252,0.15)] focus:ring-2 focus:ring-cyan-400/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
          }`}
          {...props}
        />

        {/* Stepper Buttons */}
        {!disabled && showStepper && (
          <div className="absolute right-2 flex items-center gap-1 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={() => stepBy(-stepSize)}
              aria-label={`Decrease ${label || 'value'}`}
              className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepBy(stepSize)}
              aria-label={`Increase ${label || 'value'}`}
              className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
