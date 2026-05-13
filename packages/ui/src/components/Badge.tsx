import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  dot?: boolean;
  className?: string;
}

/**
 * Badge component for displaying status labels, tags, and counts.
 * Supports color variants and optional status dot indicator.
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  label,
  dot = false,
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const dotStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`-ml-0.5 mr-1.5 h-2 w-2 rounded-full ${dotStyles[variant]}`}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
};
