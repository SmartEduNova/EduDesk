import { NavLink } from 'react-router-dom'
import { ComponentType } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  User,
  CreditCard,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationCount } from '@/contexts/NotificationContext'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const teacherNav: NavItem[] = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/classes',   label: 'Classes',   icon: BookOpen },
  { to: '/teacher/reminders', label: 'Reminders', icon: Bell },
  { to: '/teacher/profile',   label: 'Profile',   icon: User },
]

const studentNav: NavItem[] = [
  { to: '/student/status',        label: 'Status',      icon: CreditCard },
  { to: '/student/assignments',   label: 'Assignments', icon: FileText },
  { to: '/student/notifications', label: 'Alerts',      icon: Bell },
  { to: '/student/profile',       label: 'Profile',     icon: User },
]

export function BottomNav() {
  const { profile } = useAuth()
  const { unreadCount } = useNotificationCount()
  const items = profile?.role === 'teacher' ? teacherNav : studentNav

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 z-20 safe-bottom">
      <div className="flex">
        {items.map(({ to, label, icon: Icon }) => {
          const isAlerts = to === '/student/notifications'
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                    {isAlerts && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
