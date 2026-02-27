import { cn } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants'
import type { PaymentStatus } from '@/types'

interface StatusBadgeProps {
  status: PaymentStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        STATUS_COLORS[status],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', {
        'bg-status-active':     status === 'active',
        'bg-status-pending':    status === 'pending',
        'bg-status-overdue':    status === 'overdue',
        'bg-status-restricted': status === 'restricted',
      })} />
      {STATUS_LABELS[status]}
    </span>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-primary-100 text-primary-700',
    outline: 'border border-gray-300 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger:  'bg-red-100 text-red-700',
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
