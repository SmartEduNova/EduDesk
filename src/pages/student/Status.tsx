import { useRef, useState, useEffect } from 'react'
import {
  Upload, Clock, CheckCircle, AlertCircle, XCircle, Camera, BookOpen,
  ChevronDown, ChevronUp, Receipt, ExternalLink,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useStudentDashboard, useStudentPayments } from '@/hooks/useStudentData'
import { uploadReceipt, submitPayment } from '@/lib/payments'
import { getClass } from '@/lib/classes'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatMonth, currentMonth, cn } from '@/lib/utils'
import type { StudentDashboard } from '@/hooks/useStudentData'
import type { PaymentStatus, TuitionClass } from '@/types'

export default function StudentStatus() {
  const { dashboard, loading } = useStudentDashboard()

  if (loading) {
    return (
      <AppShell>
        <TopBar title="My Status" />
        <main className="flex-1 flex items-center justify-center pb-24">
          <Spinner size="lg" />
        </main>
        <BottomNav />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <TopBar title="My Status" />
      <main className="flex-1 p-4 pb-24 flex flex-col gap-4">

        {dashboard.length === 0 ? (
          <EmptyState />
        ) : (
          dashboard.map((item) => (
            <ClassStatusCard key={item.enrollment.id} item={item} />
          ))
        )}

      </main>
      <BottomNav />
    </AppShell>
  )
}

// ─── Per-class status card ────────────────────────────────────────────────────

function ClassStatusCard({ item }: { item: StudentDashboard }) {
  const { user }      = useAuth()
  const fileRef       = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploaded, setUploaded]       = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { cls, payment, status, dueDate, daysLeft } = item

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setUploadError('Please upload an image or PDF file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10 MB.')
      return
    }

    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadReceipt(cls.id, user.uid, file)
      await submitPayment(cls.id, user.uid, url)
      setUploaded(true)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const canUpload = status !== 'active' && status !== 'restricted'
  const month     = currentMonth()

  return (
    <Card padded={false} className="overflow-hidden">
      {/* Status header bar — tap to expand history */}
      <button
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between text-left',
          {
            'bg-green-50':  status === 'active',
            'bg-amber-50':  status === 'pending',
            'bg-red-50':    status === 'overdue',
            'bg-gray-50':   status === 'restricted',
          }
        )}
        onClick={() => setHistoryOpen((o) => !o)}
      >
        <div>
          <p className="font-bold text-gray-900">{cls.name}</p>
          {cls.subject && <p className="text-xs text-gray-500">{cls.subject}</p>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {historyOpen
            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          }
        </div>
      </button>

      <div className="p-4 flex flex-col gap-4">

        {/* Month & fee */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{formatMonth(month)}</span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(cls.monthlyFee, cls.currency)}
          </span>
        </div>

        {/* Countdown / status info */}
        <DueDateInfo status={status} dueDate={dueDate} daysLeft={daysLeft} />

        {/* Approval result */}
        {payment?.status === 'active' && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">Payment approved!</p>
          </div>
        )}

        {payment?.rejectionReason && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Receipt rejected</p>
              <p className="text-xs text-red-500 mt-0.5">{payment.rejectionReason}</p>
            </div>
          </div>
        )}

        {payment?.status === 'pending' && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">Receipt uploaded — awaiting teacher approval</p>
          </div>
        )}

        {/* Upload button */}
        {canUpload && (
          <div className="flex flex-col gap-2">
            {uploaded && (
              <p className="text-sm text-green-600 font-medium text-center">
                Receipt uploaded successfully!
              </p>
            )}
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              fullWidth
              variant={payment?.status === 'pending' ? 'secondary' : 'primary'}
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                'Uploading…'
              ) : payment?.status === 'pending' ? (
                <><Camera className="w-4 h-4" /> Re-upload Receipt</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload Receipt</>
              )}
            </Button>
            <p className="text-xs text-center text-gray-400">
              Image or PDF • max 10 MB
            </p>
          </div>
        )}

        {status === 'restricted' && (
          <div className="flex items-center gap-2 text-gray-500 bg-gray-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">Your access has been restricted. Contact your teacher.</p>
          </div>
        )}

        {/* Collapsible payment history */}
        {historyOpen && (
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Payment History
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <PaymentHistorySection classId={cls.id} />
          </div>
        )}

      </div>
    </Card>
  )
}

// ─── Inline payment history ───────────────────────────────────────────────────

function PaymentHistorySection({ classId }: { classId: string }) {
  const { payments, loading } = useStudentPayments(classId)
  const [cls, setCls] = useState<TuitionClass | null>(null)

  useEffect(() => {
    getClass(classId).then(setCls)
  }, [classId])

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-2">
        No payment records yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {payments.map((p) => (
        <div
          key={p.id}
          className="flex items-start justify-between bg-gray-50 rounded-xl px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-gray-800">{formatMonth(p.month)}</p>
            {cls && (
              <p className="text-xs text-gray-400">
                {formatCurrency(cls.monthlyFee, cls.currency)}
              </p>
            )}
            {p.rejectionReason && (
              <p className="text-xs text-red-500 mt-0.5">
                Rejected: {p.rejectionReason}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={p.status} />
            {p.receiptUrl && (
              <a
                href={p.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary-600 font-medium"
              >
                <Receipt className="w-3 h-3" />
                View
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Due date info ────────────────────────────────────────────────────────────

function DueDateInfo({
  status, dueDate, daysLeft,
}: { status: PaymentStatus; dueDate: Date; daysLeft: number }) {
  const formattedDate = dueDate.toLocaleDateString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  if (status === 'active') {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Clock className="w-4 h-4" />
        <span>Next due: {formattedDate}</span>
      </div>
    )
  }

  if (daysLeft > 0) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Clock className="w-4 h-4" />
          <span>Due {formattedDate}</span>
        </div>
        <span className={cn(
          'text-sm font-semibold px-2 py-0.5 rounded-lg',
          daysLeft <= 3 ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'
        )}>
          {daysLeft}d left
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-red-500 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Was due {formattedDate}</span>
      </div>
      <span className="text-sm font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-600">
        {Math.abs(daysLeft)}d overdue
      </span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-gray-300" />
      </div>
      <div>
        <p className="font-semibold text-gray-700">No classes joined yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Ask your teacher for an invite link to get started
        </p>
      </div>
    </div>
  )
}