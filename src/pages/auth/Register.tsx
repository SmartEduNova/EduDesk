import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { BookOpen, UserPlus, Eye, EyeOff } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { registerWithEmail, signInWithGoogle, getUserProfile } from '@/lib/auth'

interface RegisterForm {
  displayName: string
  email: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const [showPass, setShowPass]           = useState(false)
  const [error, setError]                 = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>()
  const passwordValue = watch('password')

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

  const onSubmit = async ({ email, password, displayName }: RegisterForm) => {
    setError('')
    try {
      const user = await registerWithEmail(email, password, displayName)
      await redirectUser(user.uid)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in.')
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.')
      } else {
        setError('Registration failed. Please try again.')
      }
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const user = await signInWithGoogle()
      await redirectUser(user.uid)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col flex-1 px-6 pt-10 pb-8 gap-7">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-200">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500">Join EduSync today</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Full name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            error={errors.displayName?.message}
            {...register('displayName', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name is too short' },
            })}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
            })}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
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

          <Input
            label="Confirm password"
            type={showPass ? 'text' : 'password'}
            placeholder="Repeat your password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: v => v === passwordValue || 'Passwords do not match',
            })}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            <UserPlus className="w-4 h-4" />
            Create Account
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google */}
        <Button
          variant="outline"
          size="lg"
          fullWidth
          loading={googleLoading}
          onClick={handleGoogle}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary-600 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </AppShell>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
