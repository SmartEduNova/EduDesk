import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Assignment, AssignmentSubmission, SubmissionStatus } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAssignment(id: string, data: Record<string, unknown>): Assignment {
  return {
    id,
    classId:         data.classId as string,
    className:       data.className as string,
    teacherId:       data.teacherId as string,
    title:           data.title as string,
    description:     data.description as string | undefined,
    dueDate:         data.dueDate as string | null | undefined,
    allowFileUpload: data.allowFileUpload as boolean,
    blocks:          data.blocks as any[] | undefined,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt as string),
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : new Date(data.updatedAt as string),
  }
}

function toSubmission(id: string, data: Record<string, unknown>): AssignmentSubmission {
  return {
    id,
    assignmentId: data.assignmentId as string,
    classId:      data.classId as string,
    studentId:    data.studentId as string,
    studentName:  data.studentName as string,
    status:       data.status as SubmissionStatus,
    fileUrl:      data.fileUrl as string | undefined,
    fileName:     data.fileName as string | undefined,
    submittedAt:  data.submittedAt instanceof Timestamp
      ? data.submittedAt.toDate()
      : data.submittedAt ? new Date(data.submittedAt as string) : undefined,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt as string),
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate()
      : new Date(data.updatedAt as string),
  }
}

// ─── Teacher — Assignments ────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  title:           string
  description?:    string
  dueDate?:        string | null
  allowFileUpload: boolean
  blocks?:         any[]
}

export async function createAssignment(
  classId: string,
  className: string,
  teacherId: string,
  input: CreateAssignmentInput,
): Promise<string> {
  const data = {
    classId,
    className,
    teacherId,
    title:           input.title.trim(),
    allowFileUpload: input.allowFileUpload,
    createdAt:       serverTimestamp(),
    updatedAt:       serverTimestamp(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.dueDate             ? { dueDate: input.dueDate }                : { dueDate: null }),
    ...(input.blocks              ? { blocks: input.blocks }                  : {}),
  }
  const ref = await addDoc(collection(db, 'assignments'), data)
  return ref.id
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'assignments', assignmentId))
}

export async function updateAssignment(
  assignmentId: string,
  input: Partial<CreateAssignmentInput>
): Promise<void> {
  const data: any = {
    updatedAt: serverTimestamp(),
  }
  if (input.title !== undefined) data.title = input.title.trim()
  if (input.allowFileUpload !== undefined) data.allowFileUpload = input.allowFileUpload
  if (input.description !== undefined) data.description = input.description.trim() || null
  if (input.dueDate !== undefined) data.dueDate = input.dueDate || null
  if (input.blocks !== undefined) data.blocks = input.blocks

  await setDoc(doc(db, 'assignments', assignmentId), data, { merge: true })
}

/** Real-time list of assignments for a class, newest first. */
export function subscribeToClassAssignments(
  classId: string,
  onChange: (items: Assignment[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'assignments'), where('classId', '==', classId))
  return onSnapshot(q, snap => {
    const items = snap.docs
      .map(d => toAssignment(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    onChange(items)
  })
}

/** Fetch all submissions for one assignment (teacher view). */
export async function getAssignmentSubmissions(
  assignmentId: string,
): Promise<AssignmentSubmission[]> {
  const snap = await getDocs(
    query(collection(db, 'assignmentSubmissions'), where('assignmentId', '==', assignmentId))
  )
  return snap.docs.map(d => toSubmission(d.id, d.data() as Record<string, unknown>))
}

// ─── Student — Submissions ────────────────────────────────────────────────────

/** Real-time assignments across all classes the student is enrolled in. */
export function subscribeToStudentAssignments(
  classIds: string[],
  onChange: (items: Assignment[]) => void,
): Unsubscribe {
  if (classIds.length === 0) {
    onChange([])
    // Return a no-op unsubscribe
    return () => {}
  }
  // Firestore 'in' supports up to 30 items — sufficient for typical use
  const q = query(collection(db, 'assignments'), where('classId', 'in', classIds))
  return onSnapshot(q, snap => {
    const items = snap.docs
      .map(d => toAssignment(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    onChange(items)
  })
}

/** Real-time submissions for a specific student. */
export function subscribeToStudentSubmissions(
  studentId: string,
  onChange: (map: Map<string, AssignmentSubmission>) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'assignmentSubmissions'),
    where('studentId', '==', studentId),
  )
  return onSnapshot(q, snap => {
    const map = new Map<string, AssignmentSubmission>()
    snap.docs.forEach(d => {
      const sub = toSubmission(d.id, d.data() as Record<string, unknown>)
      map.set(sub.assignmentId, sub)
    })
    onChange(map)
  })
}

/** Mark assignment as done (no file). */
export async function markAssignmentDone(
  assignmentId: string,
  classId: string,
  studentId: string,
  studentName: string,
): Promise<void> {
  const docRef = doc(db, 'assignmentSubmissions', `${assignmentId}_${studentId}`)
  await setDoc(docRef, {
    assignmentId,
    classId,
    studentId,
    studentName,
    status:      'done',
    submittedAt: serverTimestamp(),
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  }, { merge: true })
}

/** Undo a submission (delete the status record). */
export async function undoAssignmentSubmission(
  assignmentId: string,
  studentId: string
): Promise<void> {
  const docRef = doc(db, 'assignmentSubmissions', `${assignmentId}_${studentId}`)
  await deleteDoc(docRef)
}

/** Upload a file and record submission. */
export async function submitAssignmentFile(
  assignmentId: string,
  classId: string,
  studentId: string,
  studentName: string,
  file: File,
): Promise<void> {
  const id      = `${assignmentId}_${studentId}`
  const docRef  = doc(db, 'assignmentSubmissions', id)
  const ext     = file.name.split('.').pop() ?? 'bin'
  const path    = `assignmentSubmissions/${classId}/${assignmentId}/${studentId}.${ext}`
  const storRef = ref(storage, path)

  await uploadBytes(storRef, file)
  const fileUrl = await getDownloadURL(storRef)

  await setDoc(docRef, {
    assignmentId,
    classId,
    studentId,
    studentName,
    status:      'submitted',
    fileUrl,
    fileName:    file.name,
    submittedAt: serverTimestamp(),
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  }, { merge: true })
}

/** Remove a student's submission file from Storage (best-effort). */
export async function deleteSubmissionFile(fileUrl: string): Promise<void> {
  try {
    const storRef = ref(storage, fileUrl)
    await deleteObject(storRef)
  } catch {
    // ignore — file may not exist
  }
}
