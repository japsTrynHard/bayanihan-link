import React, { forwardRef } from 'react';
import '../styles/components/Input.css';

const Input = forwardRef(({
  label,
  error,
  hint,
  required = false,
  className = '',
  type = 'text',
  icon: Icon = null,
  ...props
}, ref) => {
  return (
    <div className="input-group">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" size={20} />}
        <input
          ref={ref}
          type={type}
          className={`input ${Icon ? 'input-with-icon' : ''} ${error ? 'input-error' : ''} ${className}`}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="input-hint">
          {hint}
        </p>
      )}
      {error && (
        <p className="input-error-message">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
