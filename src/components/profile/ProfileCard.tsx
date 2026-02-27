import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { User, Pencil, Check, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile } from '@/lib/auth'

interface EditForm {
  displayName: string
}

export function ProfileCard() {
  const { user, profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({
    defaultValues: { displayName: profile?.displayName ?? '' },
  })

  const onSave = async ({ displayName }: EditForm) => {
    if (!user) return
    setSaving(true)
    try {
      await updateUserProfile(user.uid, { displayName })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const onCancel = () => {
    reset({ displayName: profile?.displayName ?? '' })
    setEditing(false)
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-primary-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={handleSubmit(onSave)} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="Your name"
                  error={errors.displayName?.message}
                  {...register('displayName', {
                    required: 'Name is required',
                    minLength: { value: 2, message: 'Too short' },
                  })}
                />
              </div>
              <div className="flex gap-1 mt-0.5">
                <button
                  type="submit"
                  disabled={saving}
                  className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{profile?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                  {profile?.role}
                </span>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
