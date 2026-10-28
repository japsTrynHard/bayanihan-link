import React from 'react';
import '../styles/components/Avatar.css';

const colors = [
  'bg-blue-100 text-blue-700',
  'bg-cyan-100 text-cyan-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
];

function Avatar({ initials, src = '', alt = 'Profile picture', size = 'md', className = '', variant = 'default', ...props }) {
  const sizes = { sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg', xl: 'avatar-xl' };
  const colorIndex = initials ? initials.charCodeAt(0) % colors.length : 0;
  const colorClass = variant === 'default' ? 'avatar-primary' : `avatar-color-${colorIndex}`;

  return (
    <div className={`avatar ${sizes[size]} ${colorClass} ${className}`} {...props}>
      {src ? <img src={src} alt={alt} className="avatar-image" /> : initials}
    </div>
  );
}

export default Avatar;
