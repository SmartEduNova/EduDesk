import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { BookOpen, UserPlus, Eye, EyeOff } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { registerWithEmail } from '@/lib/auth'

interface RegisterForm {
  displayName: string
  email?: string
  phoneNumber?: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const [showPass, setShowPass]           = useState(false)
  const [error, setError]                 = useState('')

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>()
  const passwordValue = watch('password')

  const onSubmit = async ({ email, password, displayName, phoneNumber }: RegisterForm) => {
    setError('')
    
    if (!email && !phoneNumber) {
      setError('Please provide either an email address or a phone number.')
      return
    }

    try {
      const authEmail = email || `${phoneNumber?.replace(/\D/g, '')}@phone.edusync.app`
      await registerWithEmail(authEmail, password, displayName, phoneNumber)
      navigate('/auth/role-select', { 
        replace: true,
        state: { phoneNumber }
      })
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

  // Google sign-in removed


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
            label="Email (Optional)"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
            })}
          />

          <Input
            label="Phone Number (Optional)"
            type="tel"
            placeholder="+1234567890"
            autoComplete="tel"
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
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

        {/* Phone registration is handled via the field above or a separate toggle */}


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


