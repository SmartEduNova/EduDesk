import { useEffect, useState } from 'react'
import { subscribeToTeacherClasses } from '@/lib/classes'
import { useAuth } from '@/contexts/AuthContext'
import type { TuitionClass } from '@/types'

export function useTeacherClasses() {
  const { user } = useAuth()
  const [classes, setClasses]   = useState<TuitionClass[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const unsub = subscribeToTeacherClasses(
      user.uid,
      (data) => {
        setClasses(data)
        setLoading(false)
      },
      () => {
        setError('Failed to load classes.')
        setLoading(false)
      }
    )

    return unsub
  }, [user])

  return { classes, loading, error }
}
