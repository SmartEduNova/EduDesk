import { type ClassValue, clsx } from 'clsx'

/** Merge Tailwind class names safely */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Generate a random alphanumeric invite code */
export function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Format a number as currency */
export function formatCurrency(amount: number, currency = 'MYR'): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Format a PaymentMonth string ('YYYY-MM') to readable label */
export function formatMonth(month: string): string {
  const [year, mo] = month.split('-').map(Number)
  return new Date(year, mo - 1, 1).toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric',
  })
}

/** Get current PaymentMonth string */
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Build a join URL from an invite code */
export function buildJoinUrl(inviteCode: string): string {
  const base = window.location.origin
  return `${base}/join/${inviteCode}`
}
