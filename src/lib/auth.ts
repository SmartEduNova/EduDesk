import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserProfile, UserRole } from '@/types'

const googleProvider = new GoogleAuthProvider()

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  return cred.user
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  return cred.user
}

// ─── Firestore Profile ────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function createUserProfile(
  user: User,
  role: UserRole
): Promise<UserProfile> {
  // Build profile without undefined values — Firestore rejects undefined fields
  const base = {
    uid:         user.uid,
    email:       user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
    role,
    createdAt:   serverTimestamp(),
  }

  // Only include photoURL if it actually exists
  const profile = user.photoURL
    ? { ...base, photoURL: user.photoURL }
    : base

  await setDoc(doc(db, 'users', user.uid), profile)

  return {
    ...base,
    createdAt: new Date(),
  } as UserProfile
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'telegramId'>>
) {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}
