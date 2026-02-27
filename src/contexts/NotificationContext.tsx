import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

interface NotificationContextValue {
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextValue>({ unreadCount: 0 })

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Only subscribe for students
    if (!user || profile?.role !== 'student') {
      setUnreadCount(0)
      return
    }

    const q = query(
      collection(db, 'notifications'),
      where('studentId', '==', user.uid),
      where('read', '==', false)
    )

    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size))
    return unsub
  }, [user, profile])

  return (
    <NotificationContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationCount() {
  return useContext(NotificationContext)
}
