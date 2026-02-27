import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { createClass, updateClass, getClass } from '@/lib/classes'
import { useAuth } from '@/contexts/AuthContext'

interface ClassFormValues {
  name: string
  subject: string
  monthlyFee: number
  dueDay: number
  gracePeriodDays: number
  currency: string
  telegramGroupId: string
}

const CURRENCIES = ['MYR', 'USD', 'SGD', 'IDR', 'PHP', 'THB']

export default function ClassForm() {
  const { classId }   = useParams<{ classId: string }>()
  const isEdit        = !!classId
  const navigate      = useNavigate()
  const { user }      = useAuth()

  const [pageLoading, setPageLoading] = useState(isEdit)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    defaultValues: {
      currency:        'MYR',
      dueDay:          1,
      gracePeriodDays: 3,
      monthlyFee:      0,
      telegramGroupId: '',
    },
  })

  // Load existing class for edit mode
  useEffect(() => {
    if (!isEdit || !classId) return
    getClass(classId).then((cls) => {
      if (cls) {
        reset({
          name:            cls.name,
          subject:         cls.subject ?? '',
          monthlyFee:      cls.monthlyFee,
          dueDay:          cls.dueDay,
          gracePeriodDays: cls.gracePeriodDays,
          currency:        cls.currency,
          telegramGroupId: cls.telegramGroupId ?? '',
        })
      }
      setPageLoading(false)
    })
  }, [classId, isEdit, reset])

  const onSubmit = async (values: ClassFormValues) => {
    if (!user) return
    setSubmitError('')
    try {
      if (isEdit && classId) {
        await updateClass(classId, {
          name:            values.name,
          subject:         values.subject || undefined,
          monthlyFee:      Number(values.monthlyFee),
          dueDay:          Number(values.dueDay),
          gracePeriodDays: Number(values.gracePeriodDays),
          currency:        values.currency,
          telegramGroupId: values.telegramGroupId || undefined,
        })
        navigate(`/teacher/classes/${classId}`, { replace: true })
      } else {
        const id = await createClass(user.uid, {
          name:            values.name,
          subject:         values.subject || undefined,
          monthlyFee:      Number(values.monthlyFee),
          dueDay:          Number(values.dueDay),
          gracePeriodDays: Number(values.gracePeriodDays),
          currency:        values.currency,
          telegramGroupId: values.telegramGroupId || undefined,
        })
        navigate(`/teacher/classes/${id}`, { replace: true })
      }
    } catch {
      setSubmitError('Failed to save class. Please try again.')
    }
  }

  if (pageLoading) return <PageLoader />

  return (
    <AppShell>
      <TopBar
        title={isEdit ? 'Edit Class' : 'New Class'}
        back={isEdit ? `/teacher/classes/${classId}` : '/teacher/classes'}
      />

      <main className="flex-1 p-4 pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

          {/* Basic info */}
          <Card>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Info</p>
            <div className="flex flex-col gap-3">
              <Input
                label="Class name *"
                placeholder="e.g. Mathematics Grade 10"
                error={errors.name?.message}
                {...register('name', { required: 'Class name is required' })}
              />
              <Input
                label="Subject (optional)"
                placeholder="e.g. Mathematics"
                {...register('subject')}
              />
            </div>
          </Card>

          {/* Payment settings */}
          <Card>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Settings</p>
            <div className="flex flex-col gap-3">

              {/* Currency + Fee row */}
              <div className="flex gap-2 items-start">
                <div className="w-28 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Currency</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    {...register('currency', { required: true })}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Input
                    label="Monthly fee *"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    error={errors.monthlyFee?.message}
                    {...register('monthlyFee', {
                      required: 'Fee is required',
                      min: { value: 0.01, message: 'Must be greater than 0' },
                    })}
                  />
                </div>
              </div>

              {/* Due day */}
              <Input
                label="Due day of month *"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 5 (5th of every month)"
                hint="Payment is due on this day each month (1–28)"
                error={errors.dueDay?.message}
                {...register('dueDay', {
                  required: 'Due day is required',
                  min: { value: 1, message: 'Minimum 1' },
                  max: { value: 28, message: 'Maximum 28' },
                })}
              />

              {/* Grace period */}
              <Input
                label="Grace period (days) *"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 3"
                hint="Days after due date before status changes to Overdue"
                error={errors.gracePeriodDays?.message}
                {...register('gracePeriodDays', {
                  required: 'Grace period is required',
                  min: { value: 0, message: 'Minimum 0' },
                  max: { value: 30, message: 'Maximum 30 days' },
                })}
              />
            </div>
          </Card>

          {/* Telegram */}
          <Card>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Telegram Group (optional)</p>
            <Input
              label="Group Chat ID"
              placeholder="e.g. -1001234567890"
              hint="Add the bot to your group, then forward any group message to @userinfobot to get the ID"
              {...register('telegramGroupId')}
            />
          </Card>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {submitError}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Class'}
          </Button>
        </form>
      </main>
    </AppShell>
  )
}
