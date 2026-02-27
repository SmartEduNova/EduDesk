import type { PaymentStatus } from '@/types'

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  active:     'Paid',
  pending:    'Pending Approval',
  overdue:    'Overdue',
  restricted: 'Restricted',
}

export const STATUS_COLORS: Record<PaymentStatus, string> = {
  active:     'text-status-active   bg-green-50  border-green-200',
  pending:    'text-status-pending  bg-amber-50  border-amber-200',
  overdue:    'text-status-overdue  bg-red-50    border-red-200',
  restricted: 'text-status-restricted bg-gray-50 border-gray-200',
}

export const STATUS_DOT: Record<PaymentStatus, string> = {
  active:     'bg-status-active',
  pending:    'bg-status-pending',
  overdue:    'bg-status-overdue',
  restricted: 'bg-status-restricted',
}

export const REMINDER_DEFAULTS = {
  before_due: '📅 Reminder: Your tuition payment of {fee} is due on {dueDate}. Please upload your receipt.',
  on_due:     '⚠️ Your tuition payment of {fee} is due TODAY. Please upload your receipt as soon as possible.',
  overdue:    '🔴 Your tuition payment is OVERDUE. Please contact your teacher immediately.',
}
