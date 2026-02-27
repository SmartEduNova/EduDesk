import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Card } from '@/components/ui/Card'
import { useStudentNotifications } from '@/hooks/useStudentNotifications'
import { formatDistanceToNow } from 'date-fns'
import type { NotificationType } from '@/types'

const TYPE_ICON: Record<NotificationType, string> = {
  custom:   '📢',
  approved: '✅',
  rejected: '❌',
  reminder: '🔔',
}

const TYPE_LABEL: Record<NotificationType, string> = {
  custom:   'Message',
  approved: 'Approved',
  rejected: 'Rejected',
  reminder: 'Reminder',
}

export default function StudentNotifications() {
  const { notifications, loading, markRead, markAllRead } = useStudentNotifications()
  const unread = notifications.filter(n => !n.read).length

  return (
    <AppShell>
      <TopBar
        title="Notifications"
        right={
          unread > 0 ? (
            <button
              onClick={markAllRead}
              className="text-xs text-primary-600 font-medium hover:underline"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 p-4 pb-24 flex flex-col gap-2">

        {loading && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="text-4xl">🔔</span>
            <p className="text-sm font-medium text-gray-600">No notifications yet</p>
            <p className="text-xs text-gray-400">Reminders and messages from your teacher will appear here.</p>
          </div>
        )}

        {notifications.map(n => (
          <button
            key={n.id}
            onClick={() => { if (!n.read) markRead(n.id) }}
            className="w-full text-left"
          >
            <Card className={n.read ? 'opacity-70' : 'border-primary-200 bg-primary-50/30'}>
              <div className="flex gap-3">
                {/* Icon */}
                <span className="text-xl leading-none mt-0.5 shrink-0">
                  {TYPE_ICON[n.type]}
                </span>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {TYPE_LABEL[n.type]}
                    </span>
                    <span className="text-xs text-gray-400 truncate">{n.className}</span>
                    {!n.read && (
                      <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-snug">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </main>

      <BottomNav />
    </AppShell>
  )
}
