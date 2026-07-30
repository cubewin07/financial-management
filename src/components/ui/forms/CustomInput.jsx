import React from 'react';
import { X } from 'lucide-react';

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
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-300 tracking-wide">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-purple-300 flex-shrink-0 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          type={type}
          disabled={disabled}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-11 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${
            clearable && value ? 'pr-9' : 'pr-3.5'
          } rounded-xl text-sm font-medium bg-slate-900/60 border text-slate-100 placeholder-slate-500 transition-all duration-200 focus:bg-slate-900/90 focus:border-purple-400/50 focus:shadow-[0_0_15px_rgba(208,188,255,0.15)] focus:ring-2 focus:ring-purple-400/20 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
          }`}
          {...props}
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange({ target: { value: '' } })}
            className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
}
