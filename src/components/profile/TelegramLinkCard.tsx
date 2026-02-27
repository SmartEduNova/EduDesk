import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore'
import { Send, CheckCircle, Pencil } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile } from '@/lib/auth'
import { db } from '@/lib/firebase'

interface TelegramForm {
  telegramId: string
}

export function TelegramLinkCard() {
  const { user, profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<TelegramForm>({
    defaultValues: { telegramId: profile?.telegramId ?? '' },
  })

  const onSave = async ({ telegramId }: TelegramForm) => {
    if (!user) return
    setSaving(true)
    try {
      const trimmed = telegramId.trim()

      // 1. Update user profile
      await updateUserProfile(user.uid, { telegramId: trimmed })

      // 2. Sync telegramId onto all enrollment documents so Cloud Functions
      //    that read from enrollments always have the latest value
      const enrollSnap = await getDocs(
        query(collection(db, 'enrollments'), where('studentId', '==', user.uid))
      )
      if (!enrollSnap.empty) {
        const batch = writeBatch(db)
        enrollSnap.docs.forEach(d => batch.update(doc(db, 'enrollments', d.id), { telegramId: trimmed }))
        await batch.commit()
      }

      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const isLinked = !!profile?.telegramId

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-[#229ED9]" />
          <CardTitle>Telegram</CardTitle>
        </div>
        {isLinked && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </CardHeader>

      {isLinked && !editing ? (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-status-active flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800">Linked</p>
            <p className="text-xs text-gray-500">ID: {profile.telegramId}</p>
          </div>
          {saved && (
            <span className="ml-auto text-xs text-green-600 font-medium">Saved!</span>
          )}
        </div>
      ) : editing || !isLinked ? (
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">
            Enter your Telegram user ID to receive payment reminders.{' '}
            <span className="text-primary-600">
              Message <strong>/start</strong> to the EduSync bot and it will reply with your ID.
            </span>
          </p>
          <Input
            placeholder="e.g. 123456789"
            type="text"
            inputMode="numeric"
            error={errors.telegramId?.message}
            {...register('telegramId', {
              required: 'Telegram ID is required',
              pattern: { value: /^\d+$/, message: 'Must be a numeric Telegram user ID' },
            })}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={saving} className="flex-1">
              Save
            </Button>
            {isLinked && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : null}
    </Card>
  )
}
