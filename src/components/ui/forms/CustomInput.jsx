import React, { useState } from 'react';
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
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;

  // Determine right padding depending on whether clearable or password toggle buttons are shown
  let paddingRight = 'pr-3.5';
  const hasClear = clearable && value && !disabled;
  const hasEye = isPassword && showPasswordToggle && !disabled;

  if (hasClear && hasEye) {
    paddingRight = 'pr-16';
  } else if (hasClear || hasEye) {
    paddingRight = 'pr-10';
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-cyan-400 flex-shrink-0 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          type={effectiveType}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-11 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${paddingRight} rounded-xl text-sm font-medium bg-slate-900/60 border text-slate-100 placeholder-slate-500 transition-all duration-200 focus:bg-slate-900/90 focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,238,252,0.15)] focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
          }`}
          {...props}
        />

        {hasClear && (
          <button
            type="button"
            onClick={() => onChange({ target: { value: '' } })}
            className={`absolute ${hasEye ? 'right-9' : 'right-3'} p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer`}
            aria-label="Clear input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {hasEye && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-cyan-400"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
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

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
