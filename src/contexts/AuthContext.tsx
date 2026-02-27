import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      // Clean up previous profile listener
      if (unsubProfile) {
        unsubProfile()
        unsubProfile = null
      }

      if (firebaseUser) {
        // Real-time listener on user profile — picks up role changes after RoleSelect
        unsubProfile = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
            setLoading(false)
          },
          () => {
            setProfile(null)
            setLoading(false)
          }
        )
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
    } catch {
      // silently fail — onSnapshot will still be active
    }
  }, [user])

  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
