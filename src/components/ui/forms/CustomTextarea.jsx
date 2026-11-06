import React, { useId } from 'react';

export function CustomTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  error,
  disabled = false,
  className = '',
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-300 tracking-wide">
            {label}
          </label>
        )}
        {maxLength && (
          <span className="text-xs text-slate-400">
            {(value?.length || 0)} / {maxLength}
          </span>
        )}
      </div>

      <textarea
        id={inputId}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full p-3 rounded-xl text-sm font-medium bg-slate-900/60 border text-slate-100 placeholder-slate-500 transition-all duration-200 resize-none focus:bg-slate-900/90 focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,238,252,0.15)] focus:ring-2 focus:ring-cyan-400/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
        }`}
        {...props}
      />

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
