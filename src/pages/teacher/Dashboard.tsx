import { useNavigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { BookOpen, Users, Clock, ChevronRight, Plus, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useTeacherClasses } from '@/hooks/useClasses'
import { useTeacherDashboardStats } from '@/hooks/useTeacherData'
import { formatCurrency, formatMonth, currentMonth, cn } from '@/lib/utils'
import type { TuitionClass } from '@/types'
import type { ClassStats } from '@/hooks/useTeacherData'

export default function TeacherDashboard() {
  const navigate             = useNavigate()
  const { profile }          = useAuth()
  const { classes, loading } = useTeacherClasses()
  const stats                = useTeacherDashboardStats(classes)
  const month                = currentMonth()

  const firstName    = profile?.displayName?.split(' ')[0] ?? 'Teacher'
  const totalPending = [...stats.values()].reduce((sum, s) => sum + s.pending, 0)
  const totalClasses = classes.length

  return (
    <AppShell>
      <TopBar title="Dashboard" />

      <main className="flex-1 p-4 pb-24 flex flex-col gap-5">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatMonth(month)}</p>
        </div>

        {/* User Approvals (Admin only) */}
        {profile?.isAdmin && (
          <div className="bg-primary-600 rounded-2xl p-4 text-white shadow-lg shadow-primary-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">Admin</span>
            </div>
            <h3 className="text-lg font-bold">User Approvals</h3>
            <p className="text-xs text-primary-100 mb-4">Review and approve new account requests from students and teachers.</p>
            <Button 
              size="sm"
              fullWidth 
              onClick={() => navigate('/teacher/approvals')}
              className="bg-white text-primary-600 hover:bg-white/90 border-0 font-bold"
            >
              Manage Approvals
            </Button>
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-primary-600" />}
            label="Classes"
            value={loading ? '—' : String(totalClasses)}
            bg="bg-primary-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label="Pending Approvals"
            value={loading ? '—' : String(totalPending)}
            bg={totalPending > 0 ? 'bg-amber-50' : 'bg-gray-50'}
            highlight={totalPending > 0}
          />
        </div>

        {/* Classes list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Your Classes</h2>
            <button
              onClick={() => navigate('/teacher/classes/new')}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              New Class
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : classes.length === 0 ? (
            <EmptyClasses onAdd={() => navigate('/teacher/classes/new')} />
          ) : (
            <div className="flex flex-col gap-3">
              {classes.map(cls => (
                <DashboardClassCard
                  key={cls.id}
                  cls={cls}
                  stats={stats.get(cls.id)}
                  onManage={() => navigate(`/teacher/classes/${cls.id}/students`)}
                  onSettings={() => navigate(`/teacher/classes/${cls.id}`)}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      <BottomNav />
    </AppShell>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, bg, highlight = false,
}: {
  icon: ReactNode
  label: string
  value: string
  bg: string
  highlight?: boolean
}) {
  return (
    <div className={cn('rounded-2xl p-4 flex flex-col gap-2', bg)}>
      <div className="flex items-center justify-between">
        {icon}
        {highlight && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <p className={cn('text-2xl font-bold', highlight ? 'text-amber-600' : 'text-gray-900')}>
        {value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyClasses({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <BookOpen className="w-7 h-7 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">No classes yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Create a class to start tracking payments</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-sm font-medium text-primary-600 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create Class
      </button>
    </div>
  )
}

// ─── Class card on dashboard ──────────────────────────────────────────────────

function DashboardClassCard({
  cls, stats, onManage, onSettings,
}: {
  cls: TuitionClass
  stats: ClassStats | undefined
  onManage: () => void
  onSettings: () => void
}) {
  const pendingCount = stats?.pending ?? 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Class info — taps to settings/detail */}
      <button
        onClick={onSettings}
        className="w-full text-left px-4 pt-4 pb-3 flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
          {cls.subject && <p className="text-xs text-gray-500 truncate">{cls.subject}</p>}
          <p className="text-sm font-bold text-primary-600 mt-1">
            {formatCurrency(cls.monthlyFee, cls.currency)}
            <span className="text-xs font-normal text-gray-400">/mo</span>
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
      </button>

      {/* Payment status chips */}
      {stats && (stats.pending > 0 || stats.overdue > 0 || stats.active > 0) && (
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          {stats.pending > 0 && (
            <StatusChip label={`${stats.pending} pending`} color="amber" />
          )}
          {stats.overdue > 0 && (
            <StatusChip label={`${stats.overdue} overdue`} color="red" />
          )}
          {stats.active > 0 && (
            <StatusChip label={`${stats.active} paid`} color="green" />
          )}
        </div>
      )}

      {/* Manage students action */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <button
          onClick={onManage}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
            pendingCount > 0
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'text-primary-600 hover:bg-primary-50'
          )}
        >
          <Users className="w-4 h-4" />
          {pendingCount > 0
            ? `Review ${pendingCount} Receipt${pendingCount > 1 ? 's' : ''}`
            : 'Manage Students'}
        </button>
      </div>
    </div>
  )
}

function StatusChip({ label, color }: { label: string; color: 'amber' | 'red' | 'green' }) {
  const colors = {
    amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
  }
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-lg', colors[color])}>
      {label}
    </span>
  )
}
