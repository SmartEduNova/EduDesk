import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Share2, Copy, Check, RefreshCw, Pencil, Trash2,
  DollarSign, Calendar, Clock, Shield, Send, AlertCircle, Users, FileText,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { getClass, deleteClass, regenerateInviteCode, updateEnforcement } from '@/lib/classes'
import { formatCurrency, buildJoinUrl } from '@/lib/utils'
import type { TuitionClass } from '@/types'

export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>()
  const navigate    = useNavigate()

  const [cls, setCls]           = useState<TuitionClass | null>(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  const [regen, setRegen]       = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!classId) return
    getClass(classId).then((data) => {
      setCls(data)
      setLoading(false)
    })
  }, [classId])

  const handleCopy = async () => {
    if (!cls) return
    await navigator.clipboard.writeText(buildJoinUrl(cls.inviteCode))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!cls) return
    const url = buildJoinUrl(cls.inviteCode)
    if (navigator.share) {
      await navigator.share({ title: `Join ${cls.name}`, url })
    } else {
      await handleCopy()
    }
  }

  const handleRegen = async () => {
    if (!cls || !classId) return
    setRegen(true)
    try {
      const newCode = await regenerateInviteCode(classId)
      setCls({ ...cls, inviteCode: newCode })
    } finally {
      setRegen(false)
    }
  }

  const handleDelete = async () => {
    if (!classId) return
    if (!window.confirm('Delete this class? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteClass(classId)
      navigate('/teacher/classes', { replace: true })
    } catch {
      setDeleting(false)
    }
  }

  const handleToggleMute = async () => {
    if (!cls || !classId) return
    const updated = { ...cls.enforcement, mutedOverdue: !cls.enforcement.mutedOverdue }
    await updateEnforcement(classId, updated)
    setCls({ ...cls, enforcement: updated })
  }

  const handleRemoveDays = async (days: number | null) => {
    if (!cls || !classId) return
    const updated = { ...cls.enforcement, removeAfterDays: days }
    await updateEnforcement(classId, updated)
    setCls({ ...cls, enforcement: updated })
  }

  if (loading) return <PageLoader />
  if (!cls) return (
    <AppShell>
      <TopBar title="Class" back="/teacher/classes" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">Class not found.</p>
        </div>
      </div>
    </AppShell>
  )

  const joinUrl = buildJoinUrl(cls.inviteCode)

  return (
    <AppShell>
      <TopBar
        title={cls.name}
        back="/teacher/classes"
        right={
          <button
            onClick={() => navigate(`/teacher/classes/${classId}/edit`)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
        }
      />

      <main className="flex-1 p-4 pb-8 flex flex-col gap-4">

        {/* Class info */}
        <Card>
          <div className="flex flex-col gap-3">
            {cls.subject && (
              <p className="text-sm text-gray-500">{cls.subject}</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <InfoTile
                icon={<DollarSign className="w-4 h-4 text-primary-500" />}
                label="Monthly Fee"
                value={formatCurrency(cls.monthlyFee, cls.currency)}
              />
              <InfoTile
                icon={<Calendar className="w-4 h-4 text-amber-500" />}
                label="Due Day"
                value={`Day ${cls.dueDay}`}
              />
              <InfoTile
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                label="Grace Period"
                value={`${cls.gracePeriodDays}d`}
              />
            </div>
          </div>
        </Card>

        {/* Manage students shortcut */}
        <button
          onClick={() => navigate(`/teacher/classes/${classId}/students`)}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-primary-600 rounded-2xl text-white hover:bg-primary-700 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-semibold">Manage Students</p>
              <p className="text-xs text-primary-200">View payments &amp; approve receipts</p>
            </div>
          </div>
          <span className="text-primary-200 text-xl leading-none">&rsaquo;</span>
        </button>

        {/* Assignments shortcut */}
        <button
          onClick={() => navigate(`/teacher/classes/${classId}/assignments`)}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-indigo-600 rounded-2xl text-white hover:bg-indigo-700 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-semibold">Assignments</p>
              <p className="text-xs text-indigo-200">Create &amp; track student work</p>
            </div>
          </div>
          <span className="text-indigo-200 text-xl leading-none">&rsaquo;</span>
        </button>

        {/* Invite link */}
        <Card>
          <CardHeader>
            <CardTitle>Student Invite Link</CardTitle>
            <button
              onClick={handleRegen}
              disabled={regen}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-50"
              title="Generate new code"
            >
              <RefreshCw className={`w-4 h-4 ${regen ? 'animate-spin' : ''}`} />
            </button>
          </CardHeader>

          {/* URL display */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
            <p className="text-xs text-gray-500 mb-0.5">Share this link with students</p>
            <p className="text-sm font-mono text-primary-700 break-all">{joinUrl}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button size="sm" className="flex-1" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </Card>

        {/* Telegram */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#229ED9]" />
              <CardTitle>Telegram Group</CardTitle>
            </div>
          </CardHeader>
          {cls.telegramGroupId ? (
            <div>
              <p className="text-sm font-medium text-gray-800">{cls.telegramGroupTitle ?? 'Connected'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Group ID: {cls.telegramGroupId}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No Telegram group connected. You can add one by editing the class.</p>
          )}
        </Card>

        {/* Enforcement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <CardTitle>Enforcement (Optional)</CardTitle>
            </div>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {/* Mute overdue */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Mute overdue students</p>
                <p className="text-xs text-gray-500">Remove Telegram send permission when overdue</p>
              </div>
              <button
                onClick={handleToggleMute}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  cls.enforcement.mutedOverdue ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  cls.enforcement.mutedOverdue ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Remove after X days */}
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1.5">Remove after overdue</p>
              <div className="flex flex-wrap gap-2">
                {[null, 7, 14, 30].map((days) => (
                  <button
                    key={String(days)}
                    onClick={() => handleRemoveDays(days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      cls.enforcement.removeAfterDays === days
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {days === null ? 'Never' : `After ${days}d`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting…' : 'Delete Class'}
        </button>

      </main>
    </AppShell>
  )
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-2.5 bg-gray-50 rounded-xl text-center">
      {icon}
      <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
      <p className="text-xs font-semibold text-gray-800 leading-tight">{value}</p>
    </div>
  )
}
