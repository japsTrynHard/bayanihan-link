import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  hint,
  required = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-muted ${error ? 'border-destructive focus:ring-destructive' : ''} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
