import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BookOpen, UserCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getClassByInviteCode } from '@/lib/classes'
import { getEnrollment, createEnrollment } from '@/lib/payments'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { TuitionClass } from '@/types'

export default function JoinClass() {
  const { code }    = useParams<{ code: string }>()
  const navigate    = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  const [cls, setCls]               = useState<TuitionClass | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [joining, setJoining]       = useState(false)
  const [alreadyJoined, setAlreadyJoined] = useState(false)
  const [error, setError]           = useState('')

  // Load class by invite code
  useEffect(() => {
    if (!code) { setError('Invalid invite link.'); setPageLoading(false); return }
    getClassByInviteCode(code).then((found) => {
      if (!found) setError('This invite link is invalid or has expired.')
      else setCls(found)
      setPageLoading(false)
    })
  }, [code])

  // Check if student already enrolled
  useEffect(() => {
    if (!cls || !user) return
    getEnrollment(cls.id, user.uid).then((e) => {
      if (e) setAlreadyJoined(true)
    })
  }, [cls, user])

  const handleJoin = async () => {
    if (!cls || !user || !profile) return

    // Teachers can't join as students
    if (profile.role === 'teacher') {
      setError('Teachers cannot join classes as students. Sign in with a student account.')
      return
    }

    setJoining(true)
    setError('')
    try {
      await createEnrollment(
        cls.id,
        user.uid,
        profile.displayName,
        profile.email,
        profile.telegramId
      )
      navigate('/student/status', { replace: true })
    } catch {
      setError('Failed to join class. Please try again.')
      setJoining(false)
    }
  }

  const handleAuthRedirect = (mode: 'login' | 'register') => {
    // Store code so we come back after auth
    sessionStorage.setItem('pendingJoinCode', code ?? '')
    navigate(`/auth/${mode}`)
  }

  if (authLoading || pageLoading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col flex-1 px-6 pt-12 pb-8 gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">You've been invited to join</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">EduSync</h1>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Class info card */}
        {cls && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{cls.name}</p>
                {cls.subject && <p className="text-sm text-gray-500">{cls.subject}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <InfoItem label="Monthly Fee" value={formatCurrency(cls.monthlyFee, cls.currency)} />
              <InfoItem label="Due Day" value={`${cls.dueDay}${ordinal(cls.dueDay)} of month`} />
              <InfoItem label="Grace Period" value={`${cls.gracePeriodDays} day${cls.gracePeriodDays !== 1 ? 's' : ''}`} />
            </div>
          </div>
        )}

        {/* Action area */}
        {cls && !error && (
          <>
            {alreadyJoined ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium text-sm">You're already enrolled in this class</p>
                </div>
                <Button fullWidth onClick={() => navigate('/student/status')}>
                  Go to My Status
                </Button>
              </div>
            ) : user && profile?.role === 'student' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
                  <UserCheck className="w-4 h-4" />
                  <span>Joining as <strong>{profile.displayName}</strong></span>
                </div>
                <Button size="lg" fullWidth loading={joining} onClick={handleJoin}>
                  Join Class
                </Button>
              </div>
            ) : user && profile?.role === 'teacher' ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
                  You're signed in as a teacher. Sign in with a student account to join.
                </p>
                <Button variant="outline" fullWidth onClick={() => navigate('/auth/login')}>
                  Sign in as Student
                </Button>
              </div>
            ) : (
              // Not logged in
              <div className="flex flex-col gap-3">
                <p className="text-center text-sm text-gray-500">
                  Sign in or create an account to join this class
                </p>
                <Button size="lg" fullWidth onClick={() => handleAuthRedirect('register')}>
                  Create Account & Join
                </Button>
                <Button variant="outline" size="lg" fullWidth onClick={() => handleAuthRedirect('login')}>
                  Sign In & Join
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2.5">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}
