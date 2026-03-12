import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { BookOpen, Mail, Eye, EyeOff } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signInWithEmail, getUserProfile } from '@/lib/auth'

interface LoginForm {
  identifier: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>()

  const redirectUser = async (uid: string) => {
    const profile = await getUserProfile(uid)
    if (!profile?.role) {
      navigate('/auth/role-select', { replace: true })
    } else if (profile.role === 'teacher') {
      navigate('/teacher/dashboard', { replace: true })
    } else {
      navigate('/student/status', { replace: true })
    }
  }

  const onSubmit = async ({ identifier, password }: LoginForm) => {
    setError('')
    try {
      const isPhone = /^\+?[0-9\s-]+$/.test(identifier)
      const authEmail = isPhone
        ? `${identifier.replace(/\D/g, '')}@phone.edusync.app`
        : identifier

      const user = await signInWithEmail(authEmail, password)
      await redirectUser(user.uid)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attemptss. Please try again later.')
      } else {
        setError('Sign in failed. Please try again.')
      }
    }
  }

  // Google sign-in removed


  return (
    <AppShell>
      <div className="flex flex-col flex-1 px-6 pt-12 pb-8 gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-200">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in to EduSync</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email or Phone Number"
            type="text"
            placeholder="you@example.com or +1234567890"
            autoComplete="username"
            error={errors.identifier?.message}
            {...register('identifier', {
              required: 'Email or phone number is required',
            })}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-[2.15rem] text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            <Mail className="w-4 h-4" />
            Sign In with Email
          </Button>
        </form>

        {/* Phone sign-in can be added here or as a toggle */}


        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-primary-600 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </AppShell>
  )
}


