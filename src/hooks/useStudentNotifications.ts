import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, writeBatch, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification } from '@/types'

export function useStudentNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'notifications'),
      where('studentId', '==', user.uid)
    )

    const unsub = onSnapshot(q, snap => {
      const items: AppNotification[] = snap.docs.map(d => {
        const data = d.data()
        return {
          id:        d.id,
          studentId: data.studentId,
          classId:   data.classId,
          className: data.className,
          message:   data.message,
          type:      data.type,
          read:      data.read,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt),
        }
      })
      // Sort newest first in JS (avoids composite Firestore index)
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setNotifications(items)
      setLoading(false)
    })

    return unsub
  }, [user])

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true })
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
  }

  return { notifications, loading, markRead, markAllRead }
}
