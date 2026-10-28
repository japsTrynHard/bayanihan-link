import React from 'react';

const colors = [
  'bg-blue-100 text-blue-700',
  'bg-cyan-100 text-cyan-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
];

export default function Avatar({ initials, size = 'md', className = '', variant = 'default' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const colorIndex = initials ? initials.charCodeAt(0) % colors.length : 0;
  const colorClass = variant === 'default' ? 'bg-primary text-primary-foreground' : colors[colorIndex];

  return (
    <div
      className={`
        rounded-full
        flex items-center justify-center font-bold
        transition-transform duration-200
        ${sizes[size]} ${colorClass} ${className}
      `}
    >
      {initials}
    </div>
  );
}
