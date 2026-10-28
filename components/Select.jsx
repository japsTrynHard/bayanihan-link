import React from 'react';

export default function Select({
  options,
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  className = ''
}) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          hover:border-muted disabled:opacity-50 disabled:cursor-not-allowed
          appearance-none cursor-pointer
          ${error ? 'border-destructive focus:ring-destructive' : ''}
          ${className}
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
