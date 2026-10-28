import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  isLoading = false,
  ...props
}) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans';

  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-blue-900 active:bg-blue-950 shadow-sm hover:shadow-md disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-gray-100 border border-border active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'border border-border text-foreground hover:bg-secondary active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-destructive text-destructive-foreground hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow-md disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed',
    ghost: 'text-foreground hover:bg-secondary active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-base h-10',
    lg: 'px-6 py-3 text-base h-11 font-medium',
    xl: 'px-8 py-4 text-base h-12 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
