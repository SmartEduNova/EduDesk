import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import {
  CheckCircle, XCircle, RotateCcw, FileText, Users, X,
  VolumeX, Volume2, LogOut, Ban, UserCheck,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { functions } from '@/lib/firebase'
import { getClass } from '@/lib/classes'
import { useClassStudents, type StudentRow } from '@/hooks/useTeacherData'
import { approvePayment, rejectPayment, overridePaymentStatus } from '@/lib/payments'
import { useAuth } from '@/contexts/AuthContext'
import { currentMonth, formatMonth, cn } from '@/lib/utils'
import type { PaymentStatus, TuitionClass } from '@/types'

const TABS: { label: string; value: PaymentStatus | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Pending',    value: 'pending' },
  { label: 'Overdue',    value: 'overdue' },
  { label: 'Active',     value: 'active' },
  { label: 'Restricted', value: 'restricted' },
]

const OVERRIDE_STATUSES: PaymentStatus[] = ['active', 'pending', 'overdue', 'restricted']

type GroupAction = 'mute' | 'unmute' | 'kick' | 'ban' | 'unban'

export default function ClassStudents() {
  const { classId }           = useParams<{ classId: string }>()
  const { user }              = useAuth()
  const { students, loading } = useClassStudents(classId ?? null)

  const [cls, setCls] = useState<TuitionClass | null>(null)

  const [activeTab, setActiveTab]       = useState<PaymentStatus | 'all'>('all')
  const [receiptUrl, setReceiptUrl]     = useState<string | null>(null)
  const [isPdfReceipt, setIsPdfReceipt] = useState(false)

  const [rejectTarget, setRejectTarget]   = useState<StudentRow | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  const [overrideTarget, setOverrideTarget] = useState<StudentRow | null>(null)
  const [processingId, setProcessingId]     = useState<string | null>(null)

  // Group action state
  const [banTarget, setBanTarget]         = useState<StudentRow | null>(null)
  const [groupActionId, setGroupActionId] = useState<string | null>(null)
  const [groupError, setGroupError]       = useState<string | null>(null)

  const month = currentMonth()

  useEffect(() => {
    if (!classId) return
    getClass(classId).then(data => { if (data) setCls(data) })
  }, [classId])

  const counts = {
    all:        students.length,
    pending:    students.filter(s => s.status === 'pending').length,
    overdue:    students.filter(s => s.status === 'overdue').length,
    active:     students.filter(s => s.status === 'active').length,
    restricted: students.filter(s => s.status === 'restricted').length,
  }

  const filtered = activeTab === 'all' ? students : students.filter(s => s.status === activeTab)

  const handleApprove = async (row: StudentRow) => {
    if (!row.payment || !user) return
    setProcessingId(row.enrollment.studentId)
    try { await approvePayment(row.payment.id, user.uid) }
    finally { setProcessingId(null) }
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget?.payment || !user || !rejectReason.trim()) return
    setRejectLoading(true)
    try {
      await rejectPayment(rejectTarget.payment.id, user.uid, rejectReason.trim())
      setRejectTarget(null)
      setRejectReason('')
    } finally {
      setRejectLoading(false)
    }
  }

  const handleOverride = async (status: PaymentStatus) => {
    if (!overrideTarget || !user || !classId) return
    setProcessingId(overrideTarget.enrollment.studentId)
    try {
      await overridePaymentStatus(classId, overrideTarget.enrollment.studentId, month, status, user.uid)
      setOverrideTarget(null)
    } finally {
      setProcessingId(null)
    }
  }

  const handleGroupAction = async (row: StudentRow, action: GroupAction) => {
    if (!classId) return
    setGroupActionId(row.enrollment.studentId)
    setGroupError(null)
    try {
      const fn = httpsCallable<
        { classId: string; studentId: string; action: GroupAction },
        { success: boolean }
      >(functions, 'manageGroupMember')
      await fn({ classId, studentId: row.enrollment.studentId, action })
    } catch (e: unknown) {
      setGroupError(e instanceof Error ? e.message : 'Action failed. Try again.')
    } finally {
      setGroupActionId(null)
      setBanTarget(null)
    }
  }

  const openReceipt = (url: string) => {
    const pdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('%2fpdf')
    if (pdf) window.open(url, '_blank', 'noopener,noreferrer')
    else { setIsPdfReceipt(false); setReceiptUrl(url) }
  }

  const hasTelegramGroup = !!cls?.telegramGroupId

  return (
    <AppShell>
      <TopBar title="Students" back={`/teacher/classes/${classId}`} />

      <main className="flex-1 flex flex-col pb-24">

        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {formatMonth(month)}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const count = counts[tab.value]
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-300 text-gray-600'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Group error banner */}
        {groupError && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2">
            <p className="text-xs text-red-600 flex-1">{groupError}</p>
            <button onClick={() => setGroupError(null)}>
              <X className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        )}

        {/* Student list */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyTabState tab={activeTab} totalStudents={students.length} />
        ) : (
          <div className="px-4 flex flex-col gap-3">
            {filtered.map(row => (
              <StudentCard
                key={row.enrollment.id}
                row={row}
                processing={processingId === row.enrollment.studentId}
                groupLoading={groupActionId === row.enrollment.studentId}
                hasTelegramGroup={hasTelegramGroup}
                onApprove={() => handleApprove(row)}
                onReject={() => setRejectTarget(row)}
                onViewReceipt={openReceipt}
                onOverride={() => setOverrideTarget(row)}
                onGroupAction={(action) => {
                  if (action === 'ban') { setBanTarget(row); return }
                  handleGroupAction(row, action)
                }}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* Receipt lightbox */}
      {receiptUrl && !isPdfReceipt && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setReceiptUrl(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white"
            onClick={() => setReceiptUrl(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={receiptUrl} alt="Receipt"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Reject Receipt</h3>
            <p className="text-sm text-gray-500 mb-4">
              {rejectTarget.enrollment.studentName} — provide a reason
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt unclear, wrong amount..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" fullWidth
                onClick={() => { setRejectTarget(null); setRejectReason('') }}>
                Cancel
              </Button>
              <Button fullWidth
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                loading={rejectLoading} disabled={!rejectReason.trim()}
                onClick={handleRejectConfirm}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Override Status</h3>
            <p className="text-sm text-gray-500 mb-4">
              {overrideTarget.enrollment.studentName} — choose new status
            </p>
            <div className="flex flex-col gap-2">
              {OVERRIDE_STATUSES.map(s => (
                <button key={s} onClick={() => handleOverride(s)}
                  disabled={processingId === overrideTarget.enrollment.studentId}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-sm font-medium disabled:opacity-50',
                    s === overrideTarget.status
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  )}>
                  <span className="capitalize">{s}</span>
                  {s === overrideTarget.status && (
                    <span className="text-xs text-primary-500">Current</span>
                  )}
                </button>
              ))}
            </div>
            <Button variant="outline" fullWidth className="mt-4"
              onClick={() => setOverrideTarget(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Ban confirmation modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Ban from Telegram Group?</h3>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">{banTarget.enrollment.studentName}</span> will be
              removed from the group and blocked from rejoining.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
              After they pay, tap <strong>Unban</strong> on their card. They will need to rejoin
              using the class invite link.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setBanTarget(null)}>
                Cancel
              </Button>
              <Button fullWidth
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                loading={groupActionId === banTarget.enrollment.studentId}
                onClick={() => handleGroupAction(banTarget, 'ban')}>
                <Ban className="w-4 h-4" /> Ban
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

// ─── Student card ─────────────────────────────────────────────────────────────

function StudentCard({
  row, processing, groupLoading, hasTelegramGroup,
  onApprove, onReject, onViewReceipt, onOverride, onGroupAction,
}: {
  row: StudentRow
  processing: boolean
  groupLoading: boolean
  hasTelegramGroup: boolean
  onApprove: () => void
  onReject: () => void
  onViewReceipt: (url: string) => void
  onOverride: () => void
  onGroupAction: (action: GroupAction) => void
}) {
  const { enrollment, payment, status } = row
  const isPdf = payment?.receiptUrl?.toLowerCase().includes('.pdf')
    || payment?.receiptUrl?.toLowerCase().includes('%2fpdf')

  const showGroupActions = hasTelegramGroup && !!enrollment.telegramId
  const isBanned = !!enrollment.telegramBanned

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Student info */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{enrollment.studentName}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{enrollment.studentEmail}</p>
          {enrollment.telegramId && (
            <p className="text-xs text-blue-500 mt-0.5">
              TG: {enrollment.telegramId}
              {isBanned && <span className="ml-1.5 text-red-500 font-medium">· banned</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={status} />
          <button onClick={onOverride} disabled={processing}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40"
            title="Override status">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rejection reason */}
      {payment?.rejectionReason && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-50 rounded-xl">
          <p className="text-xs text-red-600">
            <span className="font-medium">Rejected: </span>{payment.rejectionReason}
          </p>
        </div>
      )}

      {/* Receipt */}
      {payment?.receiptUrl && (
        <div className="mx-4 mb-3">
          {isPdf ? (
            <button onClick={() => onViewReceipt(payment.receiptUrl!)}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600 hover:border-primary-200 transition-colors">
              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>View PDF Receipt</span>
            </button>
          ) : (
            <button onClick={() => onViewReceipt(payment.receiptUrl!)}
              className="w-full rounded-xl overflow-hidden border border-gray-100 hover:border-primary-200 transition-colors">
              <img src={payment.receiptUrl} alt="Receipt" className="w-full h-36 object-cover" />
            </button>
          )}
        </div>
      )}

      {/* No receipt note */}
      {!payment?.receiptUrl && status !== 'active' && status !== 'restricted' && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
          <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-400">No receipt uploaded yet</p>
        </div>
      )}

      {/* Approve / Reject */}
      {status === 'pending' && (
        <div className="px-4 pb-3 flex gap-2">
          <Button variant="primary" size="sm" className="flex-1" loading={processing} onClick={onApprove}>
            <CheckCircle className="w-4 h-4" /> Approve
          </Button>
          <Button variant="outline" size="sm"
            className="flex-1 !text-red-500 !border-red-200 hover:!bg-red-50"
            disabled={processing} onClick={onReject}>
            <XCircle className="w-4 h-4" /> Reject
          </Button>
        </div>
      )}

      {/* Telegram Group Actions */}
      {showGroupActions && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-0.5">
            Group
          </span>

          <button onClick={() => onGroupAction('mute')} disabled={groupLoading}
            title="Mute — can't send messages but stays in group"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40 transition-colors">
            <VolumeX className="w-3 h-3" /> Mute
          </button>

          <button onClick={() => onGroupAction('unmute')} disabled={groupLoading}
            title="Unmute — restore messaging permissions"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-40 transition-colors">
            <Volume2 className="w-3 h-3" /> Unmute
          </button>

          <button onClick={() => onGroupAction('kick')} disabled={groupLoading}
            title="Kick — remove from group, can rejoin via invite"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-40 transition-colors">
            <LogOut className="w-3 h-3" /> Kick
          </button>

          {!isBanned ? (
            <button onClick={() => onGroupAction('ban')} disabled={groupLoading}
              title="Ban — remove and block from rejoining"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors">
              <Ban className="w-3 h-3" /> Ban
            </button>
          ) : (
            <button onClick={() => onGroupAction('unban')} disabled={groupLoading}
              title="Unban — allow student to rejoin via invite link"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium disabled:opacity-40 transition-colors">
              <UserCheck className="w-3 h-3" /> Unban
            </button>
          )}

          {groupLoading && <span className="ml-auto"><Spinner size="sm" /></span>}
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyTabState({ tab, totalStudents }: { tab: PaymentStatus | 'all'; totalStudents: number }) {
  if (tab === 'all' && totalStudents === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Users className="w-7 h-7 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">No students yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Share the invite link to add students</p>
        </div>
      </div>
    )
  }

  const messages: Record<string, string> = {
    pending:    'No pending receipts',
    overdue:    'No overdue students',
    active:     'No active payments',
    restricted: 'No restricted students',
    all:        'No students found',
  }

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-gray-400">{messages[tab]}</p>
    </div>
  )
}
