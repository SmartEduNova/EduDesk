import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { createUserProfile } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface RoleOption {
  role: UserRole
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  color: string
}

const roles: RoleOption[] = [
  {
    role: 'teacher',
    title: 'I am a Teacher',
    description: 'Manage classes, track payments and approve receipts',
    icon: BookOpen,
    features: ['Create classes', 'Set fees & due dates', 'Approve receipts', 'Send reminders'],
    color: 'border-primary-400 bg-primary-50',
  },
  {
    role: 'student',
    title: 'I am a Student',
    description: 'View your payment status and upload receipts',
    icon: GraduationCap,
    features: ['Join classes', 'Upload receipts', 'Track due dates', 'View status'],
    color: 'border-emerald-400 bg-emerald-50',
  },
]

export default function RoleSelect() {
  const navigate          = useNavigate()
  const { user }          = useAuth()
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleConfirm = async () => {
    if (!selected || !user) return
    setLoading(true)
    setError('')
    try {
      await createUserProfile(user, selected)
      // Resume pending join flow if student came from an invite link
      const pendingCode = sessionStorage.getItem('pendingJoinCode')
      if (selected === 'student' && pendingCode) {
        sessionStorage.removeItem('pendingJoinCode')
        navigate(`/join/${pendingCode}`, { replace: true })
      } else if (selected === 'teacher') {
        navigate('/teacher/dashboard', { replace: true })
      } else {
        navigate('/student/status', { replace: true })
      }
    } catch {
      setError('Failed to save your role. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col flex-1 px-6 pt-12 pb-8 gap-8">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">Who are you?</h1>
          <p className="text-sm text-gray-500">
            Choose your role — you can't change this later.
          </p>
        </div>

        {/* Role cards */}
        <div className="flex flex-col gap-4">
          {roles.map(({ role, title, description, icon: Icon, features, color }) => (
            <button
              key={role}
              onClick={() => setSelected(role)}
              className={cn(
                'w-full text-left rounded-2xl border-2 p-4 transition-all duration-150',
                selected === role
                  ? color
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  role === 'teacher' ? 'bg-primary-100' : 'bg-emerald-100'
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    role === 'teacher' ? 'text-primary-600' : 'text-emerald-600'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{title}</p>
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      selected === role
                        ? role === 'teacher' ? 'border-primary-600 bg-primary-600' : 'border-emerald-600 bg-emerald-600'
                        : 'border-gray-300'
                    )}>
                      {selected === role && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className={cn(
                          'w-1 h-1 rounded-full flex-shrink-0',
                          role === 'teacher' ? 'bg-primary-400' : 'bg-emerald-400'
                        )} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Button
          size="lg"
          fullWidth
          disabled={!selected}
          loading={loading}
          onClick={handleConfirm}
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>

      </div>
    </AppShell>
  )
}
