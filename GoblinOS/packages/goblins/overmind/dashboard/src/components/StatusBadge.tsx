import { type Status, statusConfig } from '../lib/status'
import { cn } from '../lib/utils'

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
      role="status"
      aria-label={`Status: ${config.description}`}
      title={config.description}
    >
      {config.label}
    </span>
  )
}
