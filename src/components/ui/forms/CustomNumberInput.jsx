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
  hasError = false,
  disabled = false,
  className = '',
  id,
  showStepper = true,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const isInvalid = Boolean(error) || Boolean(hasError);
  const resolvedPrefix = prefix !== undefined ? prefix : (currency ? getCurrencySymbol(currency) : '$');
  const { max, onWheel: userOnWheel, 'aria-describedby': userDescribedBy, ...inputProps } = props;

  const parseBound = (bound, fallback) => {
    if (bound === undefined || bound === null || bound === '') return fallback;
    const n = Number(bound);
    return Number.isNaN(n) ? fallback : n;
  };

  const stepSize = Number(step) || 1;
  const getStepDecimals = (stepInput) => {
    const str = String(stepInput ?? '1');
    const expMatch = /e-(\d+)$/i.exec(str);
    if (expMatch) return Math.min(6, Number(expMatch[1]) || 0);
    const dot = str.indexOf('.');
    return dot === -1 ? 0 : Math.min(6, str.length - dot - 1);
  };
  const stepDecimals = Math.max(getStepDecimals(step), getStepDecimals(stepSize));

  const stepBy = (delta) => {
    const parsed = parseFloat(value);
    const current = Number.isFinite(parsed) ? parsed : 0;
    const minVal = parseBound(min, -Infinity);
    const maxVal = parseBound(max, Infinity);
    const stepped = Math.max(minVal, current + delta);
    const clamped = Math.min(maxVal, stepped);
    const factor = 10 ** Math.max(2, stepDecimals);
    const rounded = Math.round(clamped * factor) / factor;
    onChange({ target: { value: String(rounded) } });
  };

  const describedBy = [userDescribedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <div
        className={`flex items-center h-11 rounded-xl bg-slate-900/60 border transition-all duration-200 overflow-hidden focus-within:bg-slate-900/90 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_15px_rgba(0,238,252,0.15)] focus-within:ring-2 focus-within:ring-cyan-400/20 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isInvalid ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
      >
        {resolvedPrefix && (
          <span className="pl-3 pr-1.5 text-cyan-400 font-semibold text-base sm:text-sm shrink-0 select-none pointer-events-none">
            {resolvedPrefix}
          </span>
        )}

        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          // `step` only sizes the +/- buttons: a native step would reject amounts with cents on submit.
          step="any"
          min={min}
          max={max}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          onWheel={(e) => {
            if (document.activeElement === e.currentTarget) {
              e.currentTarget.blur();
            }
            userOnWheel?.(e);
          }}
          className={`flex-1 min-w-0 h-full bg-transparent no-spinners ${
            resolvedPrefix ? 'pl-0.5' : 'pl-3.5'
          } ${!disabled && showStepper ? 'pr-1.5' : 'pr-3'} text-base sm:text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed`}
          {...inputProps}
        />

        {/* Stepper Buttons */}
        {!disabled && showStepper && (
          <div className="flex items-center gap-0.5 border-l border-white/10 pl-1 pr-1 shrink-0">
            <button
              type="button"
              onClick={() => stepBy(-stepSize)}
              aria-label={`Decrease ${label || 'value'}`}
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => stepBy(stepSize)}
              aria-label={`Increase ${label || 'value'}`}
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <span id={errorId} role="alert" className="text-xs text-red-400 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
