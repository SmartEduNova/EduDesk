import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function Landing() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!user) return
    if (profile?.role === 'teacher') navigate('/teacher/dashboard', { replace: true })
    else if (profile?.role === 'student') navigate('/student/status', { replace: true })
  }, [user, profile, navigate])

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8 pb-12">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="w-20 h-20 rounded-3xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">EduSync</h1>
            <p className="text-sm text-gray-500 mt-1">Tuition Payment Manager</p>
          </div>
        </div>

        {/* Value props */}
        <div className="flex flex-col gap-3 w-full">
          {[
            { icon: '✅', text: 'Track tuition payments effortlessly' },
            { icon: '📱', text: 'Telegram reminders for students' },
            { icon: '📄', text: 'Receipt upload & approval in seconds' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
              <span className="text-xl">{icon}</span>
              <span className="text-sm text-gray-700 font-medium">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            size="lg"
            fullWidth
            onClick={() => navigate('/auth/register')}
          >
            Get Started
          </Button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/auth/login')}
              className="text-primary-600 font-semibold"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </AppShell>
  )
}
