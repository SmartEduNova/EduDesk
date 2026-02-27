import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Assignment, AssignmentBlock, AssignmentSubmission, SubmissionFile, SubmissionStatus } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAssignment(id: string, data: Record<string, unknown>): Assignment {
  return {
    id,
    classId:         data.classId as string,
    className:       data.className as string,
    teacherId:       data.teacherId as string,
    title:           data.title as string,
    blocks:          (data.blocks as AssignmentBlock[] | undefined) ?? [],
    dueDate:         data.dueDate as string | null | undefined,
    allowFileUpload: (data.allowFileUpload as boolean) ?? false,
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
    files:        (data.files as SubmissionFile[] | undefined) ?? [],
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
  blocks:          AssignmentBlock[]
  dueDate?:        string | null
  allowFileUpload: boolean
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
    blocks:          input.blocks,
    allowFileUpload: input.allowFileUpload,
    dueDate:         input.dueDate ?? null,
    createdAt:       serverTimestamp(),
    updatedAt:       serverTimestamp(),
  }
  const docRef = await addDoc(collection(db, 'assignments'), data)
  return docRef.id
}

/** Upload a file for an assignment content block (image or file block). */
export async function uploadAssignmentBlockFile(
  classId: string,
  blockId: string,
  file: File,
): Promise<{ url: string; name: string }> {
  const ext     = file.name.split('.').pop() ?? 'bin'
  const path    = `assignmentBlocks/${classId}/${blockId}.${ext}`
  const storRef = ref(storage, path)
  await uploadBytes(storRef, file)
  const url = await getDownloadURL(storRef)
  return { url, name: file.name }
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'assignments', assignmentId))
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

/**
 * Upload one or more files and append them to the student's submission.
 * Uses arrayUnion so concurrent uploads from the same student don't overwrite each other.
 */
export async function addSubmissionFiles(
  assignmentId: string,
  classId: string,
  studentId: string,
  studentName: string,
  files: File[],
): Promise<void> {
  const docRef = doc(db, 'assignmentSubmissions', `${assignmentId}_${studentId}`)

  const uploaded: SubmissionFile[] = []
  for (const file of files) {
    const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `assignmentSubmissions/${classId}/${assignmentId}/${studentId}/${Date.now()}_${safeName}`
    const storRef     = ref(storage, storagePath)
    await uploadBytes(storRef, file)
    const url = await getDownloadURL(storRef)
    uploaded.push({ url, name: file.name, storagePath })
  }

  await setDoc(docRef, {
    assignmentId,
    classId,
    studentId,
    studentName,
    status:      'submitted',
    files:       arrayUnion(...uploaded),
    submittedAt: serverTimestamp(),
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  }, { merge: true })
}

/** Remove one file from the student's submission and delete it from Storage. */
export async function removeSubmissionFile(
  assignmentId: string,
  studentId: string,
  file: SubmissionFile,
): Promise<void> {
  const docRef = doc(db, 'assignmentSubmissions', `${assignmentId}_${studentId}`)
  await updateDoc(docRef, {
    files:     arrayRemove(file),
    updatedAt: serverTimestamp(),
  })
  try {
    await deleteObject(ref(storage, file.storagePath))
  } catch {
    // ignore — file may already be gone
  }
}
