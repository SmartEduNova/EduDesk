import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateInviteCode } from '@/lib/utils'
import type { TuitionClass, EnforcementSettings } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateClassInput {
  name: string
  subject?: string
  monthlyFee: number
  dueDay: number
  gracePeriodDays: number
  currency: string
  telegramGroupId?: string
  telegramGroupTitle?: string
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function subscribeToTeacherClasses(
  teacherId: string,
  onChange: (classes: TuitionClass[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'classes'),
    where('teacherId', '==', teacherId)
  )

  return onSnapshot(
    q,
    (snap) => {
      // Sort client-side — avoids requiring a Firestore composite index
      const classes = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as TuitionClass))
        .sort((a, b) => {
          const aTime = (a.createdAt as unknown as { seconds: number })?.seconds ?? 0
          const bTime = (b.createdAt as unknown as { seconds: number })?.seconds ?? 0
          return bTime - aTime
        })
      onChange(classes)
    },
    (err) => onError?.(err)
  )
}

export async function getClass(classId: string): Promise<TuitionClass | null> {
  const snap = await getDoc(doc(db, 'classes', classId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as TuitionClass) : null
}

export async function getClassByInviteCode(code: string): Promise<TuitionClass | null> {
  const { getDocs, query: q2, where: w } = await import('firebase/firestore')
  const snap = await getDocs(q2(collection(db, 'classes'), w('inviteCode', '==', code)))
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as TuitionClass
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createClass(
  teacherId: string,
  input: CreateClassInput
): Promise<string> {
  const defaultEnforcement: EnforcementSettings = {
    mutedOverdue: false,
    removeAfterDays: null,
  }

  const data = {
    teacherId,
    name:             input.name.trim(),
    monthlyFee:       input.monthlyFee,
    dueDay:           input.dueDay,
    gracePeriodDays:  input.gracePeriodDays,
    currency:         input.currency,
    inviteCode:       generateInviteCode(),
    enforcement:      defaultEnforcement,
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
    ...(input.subject?.trim()          ? { subject:            input.subject.trim()          } : {}),
    ...(input.telegramGroupId?.trim()  ? { telegramGroupId:    input.telegramGroupId.trim()  } : {}),
    ...(input.telegramGroupTitle?.trim() ? { telegramGroupTitle: input.telegramGroupTitle.trim() } : {}),
  }

  const ref = await addDoc(collection(db, 'classes'), data)
  return ref.id
}

export async function updateClass(
  classId: string,
  input: Partial<CreateClassInput>
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() }

  if (input.name !== undefined)             data.name             = input.name.trim()
  if (input.subject !== undefined)          data.subject          = input.subject?.trim() ?? ''
  if (input.monthlyFee !== undefined)       data.monthlyFee       = input.monthlyFee
  if (input.dueDay !== undefined)           data.dueDay           = input.dueDay
  if (input.gracePeriodDays !== undefined)  data.gracePeriodDays  = input.gracePeriodDays
  if (input.currency !== undefined)         data.currency         = input.currency
  if (input.telegramGroupId !== undefined)  data.telegramGroupId  = input.telegramGroupId?.trim() ?? ''

  await updateDoc(doc(db, 'classes', classId), data)
}

export async function updateEnforcement(
  classId: string,
  enforcement: EnforcementSettings
): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    enforcement,
    updatedAt: serverTimestamp(),
  })
}

export async function regenerateInviteCode(classId: string): Promise<string> {
  const newCode = generateInviteCode()
  await updateDoc(doc(db, 'classes', classId), {
    inviteCode: newCode,
    updatedAt:  serverTimestamp(),
  })
  return newCode
}

export async function updateReminderMessage(
  classId: string,
  reminderMessage: string
): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), {
    reminderMessage: reminderMessage.trim(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', classId))
}
