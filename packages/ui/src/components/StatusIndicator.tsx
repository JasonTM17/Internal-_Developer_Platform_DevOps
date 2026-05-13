import React from 'react';

export type StatusType = 'healthy' | 'degraded' | 'down' | 'unknown' | 'deploying';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { color: string; pulseColor: string; text: string }> = {
  healthy: { color: 'bg-green-500', pulseColor: 'bg-green-400', text: 'Healthy' },
  degraded: { color: 'bg-yellow-500', pulseColor: 'bg-yellow-400', text: 'Degraded' },
  down: { color: 'bg-red-500', pulseColor: 'bg-red-400', text: 'Down' },
  unknown: { color: 'bg-gray-400', pulseColor: 'bg-gray-300', text: 'Unknown' },
  deploying: { color: 'bg-blue-500', pulseColor: 'bg-blue-400', text: 'Deploying' },
};

/**
 * StatusIndicator displays a colored dot with optional label
 * to represent the health/state of a service or resource.
 * Includes pulse animation for active states (deploying).
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const config = STATUS_CONFIG[status];
  const displayLabel = label || config.text;

  const sizeStyles: Record<string, { dot: string; text: string }> = {
    sm: { dot: 'h-2 w-2', text: 'text-xs' },
    md: { dot: 'h-2.5 w-2.5', text: 'text-sm' },
    lg: { dot: 'h-3 w-3', text: 'text-base' },
  };

  const isPulsing = status === 'deploying';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={displayLabel}>
      <span className="relative inline-flex">
        {isPulsing && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75 animate-ping`}
            aria-hidden="true"
          />
        )}
        <span className={`relative inline-flex rounded-full ${sizeStyles[size].dot} ${config.color}`} />
      </span>
      {showLabel && <span className={`${sizeStyles[size].text} text-gray-700`}>{displayLabel}</span>}
    </span>
  );
};
