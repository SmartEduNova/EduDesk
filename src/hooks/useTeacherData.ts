import { useEffect, useState } from 'react'
import { subscribeToClassEnrollments, subscribeToClassPayments } from '@/lib/payments'
import { currentMonth } from '@/lib/utils'
import type { Enrollment, Payment, PaymentStatus, TuitionClass } from '@/types'

// ─── Per-class student row ────────────────────────────────────────────────────

export interface StudentRow {
  enrollment: Enrollment
  payment:    Payment | null
  status:     PaymentStatus
}

/** Real-time subscription to all students in a class with their current-month payment. */
export function useClassStudents(classId: string | null) {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!classId) return

    let enrollments: Enrollment[] = []
    let payments: Payment[]       = []
    let enrollReady   = false
    let paymentsReady = false

    const merge = () => {
      if (!enrollReady || !paymentsReady) return
      const paymentMap = new Map(payments.map(p => [p.studentId, p]))
      const order: Record<PaymentStatus, number> = { pending: 0, overdue: 1, restricted: 2, active: 3 }
      const rows: StudentRow[] = enrollments
        .map(e => {
          const payment = paymentMap.get(e.studentId) ?? null
          const status: PaymentStatus = payment?.status ?? 'overdue'
          return { enrollment: e, payment, status }
        })
        .sort((a, b) => order[a.status] - order[b.status])
      setStudents(rows)
      setLoading(false)
    }

    const unsubE = subscribeToClassEnrollments(classId, (data) => {
      enrollments = data
      enrollReady = true
      merge()
    })

    const month = currentMonth()
    const unsubP = subscribeToClassPayments(classId, month, (data) => {
      payments = data
      paymentsReady = true
      merge()
    })

    return () => { unsubE(); unsubP() }
  }, [classId])

  return { students, loading }
}

// ─── Dashboard stats: pending count per class ──────────────────────────────

export interface ClassStats {
  pending:    number
  overdue:    number
  active:     number
  restricted: number
}

/** Subscribes to current-month payments for each class and returns aggregated stats. */
export function useTeacherDashboardStats(classes: TuitionClass[]) {
  const [stats, setStats] = useState<Map<string, ClassStats>>(new Map())

  useEffect(() => {
    if (classes.length === 0) { setStats(new Map()); return }

    const month = currentMonth()
    const unsubs: (() => void)[] = []

    classes.forEach(cls => {
      const unsub = subscribeToClassPayments(cls.id, month, (payments) => {
        setStats(prev => {
          const next = new Map(prev)
          next.set(cls.id, {
            pending:    payments.filter(p => p.status === 'pending').length,
            overdue:    payments.filter(p => p.status === 'overdue').length,
            active:     payments.filter(p => p.status === 'active').length,
            restricted: payments.filter(p => p.status === 'restricted').length,
          })
          return next
        })
      })
      unsubs.push(unsub)
    })

    return () => unsubs.forEach(u => u())
  }, [classes])

  return stats
}
