import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Users, ChevronRight, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useTeacherClasses } from '@/hooks/useClasses'
import { formatCurrency } from '@/lib/utils'
import type { TuitionClass } from '@/types'

export default function TeacherClasses() {
  const navigate = useNavigate()
  const { classes, loading, error } = useTeacherClasses()

  return (
    <AppShell>
      <TopBar
        title="My Classes"
        right={
          <Button size="sm" onClick={() => navigate('/teacher/classes/new')}>
            <Plus className="w-4 h-4" />
            New
          </Button>
        }
      />

      <main className="flex-1 p-4 pb-24 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && classes.length === 0 && (
          <EmptyState onAdd={() => navigate('/teacher/classes/new')} />
        )}

        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            onClick={() => navigate(`/teacher/classes/${cls.id}`)}
          />
        ))}
      </main>

      <BottomNav />
    </AppShell>
  )
}

function ClassCard({ cls, onClick }: { cls: TuitionClass; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-primary-200 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
            {cls.subject && (
              <p className="text-xs text-gray-500 truncate">{cls.subject}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm font-semibold text-primary-600">
                {formatCurrency(cls.monthlyFee, cls.currency)}<span className="text-gray-400 font-normal">/mo</span>
              </span>
              <span className="text-xs text-gray-400">Due day {cls.dueDay}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ChevronRight className="w-4 h-4 text-gray-300" />
          {cls.telegramGroupId && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
              Telegram
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
        <Users className="w-3.5 h-3.5" />
        <span>Grace period: {cls.gracePeriodDays} day{cls.gracePeriodDays !== 1 ? 's' : ''}</span>
      </div>
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-primary-300" />
      </div>
      <div>
        <p className="font-semibold text-gray-700">No classes yet</p>
        <p className="text-sm text-gray-400 mt-1">Create your first class to start tracking payments</p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        Create Class
      </Button>
    </div>
  )
}
