import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToStudentEnrollments,
  subscribeToStudentPayments,
  getPayment,
} from '@/lib/payments'
import { getClass } from '@/lib/classes'
import { currentMonth } from '@/lib/utils'
import type { Enrollment, Payment, TuitionClass, PaymentStatus } from '@/types'

// ─── All enrollments for the logged-in student ───────────────────────────────

export function useStudentEnrollments() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToStudentEnrollments(user.uid, (data) => {
      setEnrollments(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { enrollments, loading }
}

// ─── Full data for a single enrollment (class + current payment) ─────────────

export interface EnrollmentDetail {
  enrollment: Enrollment
  cls:        TuitionClass
  payment:    Payment | null
  status:     PaymentStatus
  dueDate:    Date
  daysLeft:   number   // negative = days overdue
}

export function useEnrollmentDetail(_enrollmentId: string | null) {
  // Reserved for future use — real-time per-enrollment detail
  return { detail: null as EnrollmentDetail | null, loading: false }
}

// ─── Payments for one (student, class) pair ───────────────────────────────────

export function useStudentPayments(classId: string | null) {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user || !classId) return
    const unsub = subscribeToStudentPayments(user.uid, classId, (data) => {
      setPayments(data)
      setLoading(false)
    })
    return unsub
  }, [user, classId])

  return { payments, loading }
}

// ─── Compute current-month status from class settings ────────────────────────

export function computeCurrentStatus(
  cls: TuitionClass,
  payment: Payment | null
): { status: PaymentStatus; dueDate: Date; daysLeft: number } {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()  // 0-indexed

  const dueDate     = new Date(year, month, cls.dueDay)
  const overdueDate = new Date(year, month, cls.dueDay + cls.gracePeriodDays)
  const msPerDay    = 1000 * 60 * 60 * 24
  const daysLeft    = Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay)

  if (payment?.status === 'active')     return { status: 'active',     dueDate, daysLeft }
  if (payment?.status === 'pending')    return { status: 'pending',    dueDate, daysLeft }
  if (payment?.status === 'restricted') return { status: 'restricted', dueDate, daysLeft }

  // No payment — determine from date
  if (now > overdueDate) return { status: 'overdue', dueDate, daysLeft }
  return { status: 'overdue', dueDate, daysLeft }  // default until paid
}

// ─── Full student dashboard data ──────────────────────────────────────────────

export interface StudentDashboard {
  enrollment: Enrollment
  cls:        TuitionClass
  payment:    Payment | null
  status:     PaymentStatus
  dueDate:    Date
  daysLeft:   number
}

export function useStudentDashboard() {
  const { user }           = useAuth()
  const { enrollments, loading: enrollLoading } = useStudentEnrollments()
  const [dashboard, setDashboard] = useState<StudentDashboard[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (enrollLoading) return
    if (enrollments.length === 0) { setLoading(false); return }

    let cancelled = false

    Promise.all(
      enrollments.map(async (enrollment) => {
        const [cls, payment] = await Promise.all([
          getClass(enrollment.classId),
          user ? getPayment(enrollment.classId, user.uid, currentMonth()) : null,
        ])
        if (!cls) return null
        const { status, dueDate, daysLeft } = computeCurrentStatus(cls, payment)
        return { enrollment, cls, payment, status, dueDate, daysLeft }
      })
    ).then((results) => {
      if (cancelled) return
      setDashboard(results.filter((r): r is StudentDashboard => r !== null))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [enrollments, enrollLoading, user])

  return { dashboard, loading }
}
