import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground border border-border',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    info: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    job: 'bg-blue-50 text-blue-700 border border-blue-200',
    help: 'bg-purple-50 text-purple-700 border border-purple-200',
    emergency: 'bg-red-100 text-red-800 border border-red-300 font-semibold',
    lost: 'bg-orange-50 text-orange-700 border border-orange-200',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium transition-colors duration-150 ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
