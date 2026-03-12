import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { Check, X, User as UserIcon, Shield } from 'lucide-react'
import { db } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import type { UserProfile } from '@/types'

export default function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const fetchPendingUsers = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'users'), where('isApproved', '==', false))
      const snap = await getDocs(q)
      const users = snap.docs.map(d => ({ ...d.data() } as UserProfile))
      setPendingUsers(users)
    } catch (e) {
      console.error('Failed to fetch pending users:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (uid: string) => {
    setActionLoading(uid)
    try {
      await updateDoc(doc(db, 'users', uid), {
        isApproved: true
      })
      setPendingUsers(prev => prev.filter(u => u.uid !== uid))
    } catch (e) {
      console.error('Failed to approve user:', e)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (uid: string) => {
    // For now, rejection might just keep them pending or delete them.
    // Let's just leave it for now or implement a delete if preferred.
    // For simplicity, we'll just show the option to delete.
    if (!confirm('Are you sure you want to reject and delete this user?')) return
    
    setActionLoading(uid)
    try {
      // In a real app, you might want to call a cloud function to delete the auth user too
      // For now, we'll just remove the profile
      await updateDoc(doc(db, 'users', uid), {
        role: null // Effectively removing their access
      })
      setPendingUsers(prev => prev.filter(u => u.uid !== uid))
    } catch (e) {
      console.error('Failed to reject user:', e)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <AppShell title="User Approvals" back={true}>
      <div className="flex flex-col flex-1 p-4 gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            Pending Users ({pendingUsers.length})
          </h2>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <UserIcon className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No pending user requests</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pendingUsers.map(user => (
              <div key={user.uid} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold">
                    {user.displayName[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.displayName}</h3>
                    <p className="text-xs text-gray-500">{user.email || user.phoneNumber}</p>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0 rounded-xl bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                    onClick={() => handleReject(user.uid)}
                    disabled={!!actionLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl"
                    onClick={() => handleApprove(user.uid)}
                    loading={actionLoading === user.uid}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
