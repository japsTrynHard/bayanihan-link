import React from 'react';

export default function Card({ children, className = '', variant = 'default', elevated = false }) {
  const baseStyles = 'bg-card text-card-foreground rounded-lg border border-border transition-all duration-200';
  const shadowStyles = elevated ? 'shadow-md hover:shadow-lg' : 'shadow-sm hover:shadow-md';
  const variantStyles = variant === 'minimal' ? 'border-0' : '';

  return (
    <div className={`${baseStyles} ${shadowStyles} ${variantStyles} p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-6 -mt-2 -mx-2 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', subtitle = '' }) {
  return (
    <div className={className}>
      <h3 className="text-lg font-bold tracking-tight text-foreground mb-1">
        {children}
      </h3>
      {subtitle && (
        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-6 pt-6 border-t border-border flex gap-3 justify-end ${className}`}>
      {children}
    </div>
  );
}
