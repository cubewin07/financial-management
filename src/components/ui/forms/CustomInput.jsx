import { useState, useId } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

export function CustomInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  clearable = false,
  disabled = false,
  showPasswordToggle = true,
  className = '',
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;

  const hasClear = clearable && value && !disabled;
  const hasEye = isPassword && showPasswordToggle && !disabled;
  const { 'aria-describedby': userDescribedBy, ...inputProps } = props;
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
        } ${error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
      >
        {Icon && (
          <div className="pl-3.5 pr-2 text-cyan-400 flex-shrink-0 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={effectiveType}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`flex-1 min-w-0 h-full bg-transparent ${
            Icon ? 'pl-0.5' : 'pl-3.5'
          } ${hasClear || hasEye ? 'pr-1' : 'pr-3.5'} text-base sm:text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed`}
          {...inputProps}
        />

        {hasClear && (
          <button
            type="button"
            onClick={() => onChange({ target: { value: '' } })}
            className="min-w-[44px] sm:min-w-[34px] h-[42px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Clear input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {hasEye && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="min-w-[44px] sm:min-w-[36px] h-[42px] mr-0.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 shrink-0"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-slate-300" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400 hover:text-slate-300" />
            )}
          </button>
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
