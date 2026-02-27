import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { currentMonth } from '@/lib/utils'
import type { Enrollment, Payment, PaymentStatus, PaymentMonth } from '@/types'

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function getEnrollment(
  classId: string,
  studentId: string
): Promise<Enrollment | null> {
  const q = query(
    collection(db, 'enrollments'),
    where('classId', '==', classId),
    where('studentId', '==', studentId)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Enrollment
}

export async function createEnrollment(
  classId: string,
  studentId: string,
  studentName: string,
  studentEmail: string,
  telegramId?: string
): Promise<string> {
  const data: Record<string, unknown> = {
    classId,
    studentId,
    studentName,
    studentEmail,
    status: 'overdue' as PaymentStatus,  // starts overdue until payment
    joinedAt: serverTimestamp(),
  }
  if (telegramId) data.telegramId = telegramId

  const ref2 = await addDoc(collection(db, 'enrollments'), data)
  return ref2.id
}

export function subscribeToStudentEnrollments(
  studentId: string,
  onChange: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment)))
  })
}

export function subscribeToClassEnrollments(
  classId: string,
  onChange: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const q = query(collection(db, 'enrollments'), where('classId', '==', classId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment)))
  })
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayment(
  classId: string,
  studentId: string,
  month: PaymentMonth
): Promise<Payment | null> {
  const id = `${classId}_${studentId}_${month}`
  const snap = await getDoc(doc(db, 'payments', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Payment) : null
}

export function subscribeToStudentPayments(
  studentId: string,
  classId: string,
  onChange: (payments: Payment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'payments'),
    where('studentId', '==', studentId),
    where('classId', '==', classId)
  )
  return onSnapshot(q, (snap) => {
    const payments = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Payment))
      .sort((a, b) => b.month.localeCompare(a.month))
    onChange(payments)
  })
}

export function subscribeToClassPayments(
  classId: string,
  month: PaymentMonth,
  onChange: (payments: Payment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'payments'),
    where('classId', '==', classId),
    where('month', '==', month)
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)))
  })
}

// ─── Receipt Upload ───────────────────────────────────────────────────────────

export async function uploadReceipt(
  classId: string,
  studentId: string,
  file: File
): Promise<string> {
  const month = currentMonth()
  const ext   = file.name.split('.').pop() ?? 'jpg'
  const path  = `receipts/${classId}/${studentId}/${month}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function submitPayment(
  classId: string,
  studentId: string,
  receiptUrl: string
): Promise<void> {
  const month = currentMonth()
  const id    = `${classId}_${studentId}_${month}`

  await setDoc(
    doc(db, 'payments', id),
    {
      classId,
      studentId,
      month,
      status:             'pending' as PaymentStatus,
      receiptUrl,
      receiptUploadedAt:  serverTimestamp(),
      updatedAt:          serverTimestamp(),
      createdAt:          serverTimestamp(),
    },
    { merge: true }
  )
}

// ─── Teacher actions ──────────────────────────────────────────────────────────

export async function approvePayment(
  paymentId: string,
  teacherId: string
): Promise<void> {
  await setDoc(
    doc(db, 'payments', paymentId),
    { status: 'active' as PaymentStatus, approvedAt: serverTimestamp(), approvedBy: teacherId },
    { merge: true }
  )
}

export async function rejectPayment(
  paymentId: string,
  teacherId: string,
  reason: string
): Promise<void> {
  await setDoc(
    doc(db, 'payments', paymentId),
    {
      status:          'overdue' as PaymentStatus,
      rejectedAt:      serverTimestamp(),
      rejectedBy:      teacherId,
      rejectionReason: reason,
    },
    { merge: true }
  )
}

export async function overridePaymentStatus(
  classId: string,
  studentId: string,
  month: PaymentMonth,
  status: PaymentStatus,
  teacherId: string
): Promise<void> {
  const id = `${classId}_${studentId}_${month}`
  await setDoc(
    doc(db, 'payments', id),
    {
      classId, studentId, month,
      status,
      overriddenBy: teacherId,
      updatedAt:    serverTimestamp(),
      createdAt:    serverTimestamp(),
    },
    { merge: true }
  )
}
