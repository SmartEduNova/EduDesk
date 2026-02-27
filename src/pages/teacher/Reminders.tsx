import { useEffect, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { functions } from '@/lib/firebase'
import { subscribeToTeacherClasses, updateReminderMessage } from '@/lib/classes'
import { useAuth } from '@/contexts/AuthContext'
import { REMINDER_DEFAULTS } from '@/lib/constants'
import type { TuitionClass } from '@/types'

const VARIABLES = ['{name}', '{fee}', '{dueDate}']

interface SendResult { sent: number; skipped: number }

function ReminderCard({ cls }: { cls: TuitionClass }) {
  const current = cls.reminderMessage ?? REMINDER_DEFAULTS.before_due

  // ── template editor state ──────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(current)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // ── send-now state ─────────────────────────────────────────────────────────
  const [sendOpen,   setSendOpen]   = useState(false)
  const [sendDraft,  setSendDraft]  = useState(current)
  const [sending,    setSending]    = useState(false)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [sendError,  setSendError]  = useState('')
  const sendRef = useRef<HTMLTextAreaElement>(null)

  // Keep sendDraft in sync when the saved template changes
  const prevCurrent = useRef(current)
  if (prevCurrent.current !== current) {
    prevCurrent.current = current
    if (!sendOpen) setSendDraft(current)
  }

  // Live preview (template editor)
  const preview = draft
    .replace('{name}',    'Ali')
    .replace('{fee}',     `${cls.currency} ${cls.monthlyFee.toFixed(2)}`)
    .replace('{dueDate}', `${cls.dueDay} Mar 2025`)

  // Insert a placeholder at the cursor position in a given textarea
  const makeInsertVar = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => (v: string) => {
    const el = ref.current
    if (!el) { setter(d => d + v); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    setter(d => d.slice(0, start) + v + d.slice(end))
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + v.length
      el.focus()
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await updateReminderMessage(cls.id, draft)
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSendNow = async () => {
    if (!sendDraft.trim()) return
    setSending(true)
    setSendResult(null)
    setSendError('')
    try {
      const fn = httpsCallable<{ classId: string; message: string }, SendResult>(
        functions, 'sendClassNotification'
      )
      const result = await fn({ classId: cls.id, message: sendDraft })
      setSendResult(result.data)
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }

  const openSend = () => {
    setSendDraft(current)
    setSendResult(null)
    setSendError('')
    setSendOpen(true)
  }

  return (
    <Card>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{cls.name}</p>
          {cls.subject && (
            <p className="text-xs text-gray-500 truncate">{cls.subject}</p>
          )}
        </div>
        {!editing && !saved && (
          <button
            onClick={() => { setDraft(current); setEditing(true) }}
            className="text-xs text-primary-600 font-medium shrink-0 hover:underline"
          >
            Edit template
          </button>
        )}
        {saved && (
          <span className="text-xs text-green-600 font-medium shrink-0">Saved ✓</span>
        )}
      </div>

      {/* ── Template editor ── */}
      {editing ? (
        <>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VARIABLES.map(v => (
              <button key={v} type="button"
                onClick={() => makeInsertVar(editRef, setDraft)(v)}
                className="text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2 py-0.5 hover:bg-primary-100"
              >{v}</button>
            ))}
          </div>

          <textarea
            ref={editRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Preview</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{preview}</p>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" loading={saving} onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <button type="button"
              onClick={() => setDraft(REMINDER_DEFAULTS.before_due)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            >Reset default</button>
          </div>
        </>
      ) : (
        /* ── Read-only template message ── */
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{current}</p>
      )}

      {/* ── Send Now section (only shown when not editing template) ── */}
      {!editing && (
        <div className="border-t border-gray-100 mt-4 pt-3">
          {!sendOpen ? (
            <button
              onClick={openSend}
              className="w-full text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-xl py-2 hover:bg-primary-100 transition-colors"
            >
              Send message now →
            </button>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Send to all students in this class
              </p>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {VARIABLES.map(v => (
                  <button key={v} type="button"
                    onClick={() => makeInsertVar(sendRef, setSendDraft)(v)}
                    className="text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2 py-0.5 hover:bg-primary-100"
                  >{v}</button>
                ))}
              </div>

              <textarea
                ref={sendRef}
                value={sendDraft}
                onChange={e => setSendDraft(e.target.value)}
                rows={4}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              {sendError && (
                <p className="text-xs text-red-600 mt-1">{sendError}</p>
              )}

              {sendResult && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-2">
                  ✓ Sent to <b>{sendResult.sent}</b> student{sendResult.sent !== 1 ? 's' : ''}
                  {sendResult.skipped > 0 && (
                    <> · <span className="text-gray-500">{sendResult.skipped} skipped (no Telegram linked)</span></>
                  )}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <Button size="sm" loading={sending} onClick={handleSendNow}>
                  Send to all students
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => { setSendOpen(false); setSendResult(null) }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

export default function TeacherReminders() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<TuitionClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToTeacherClasses(user.uid, (cls) => {
      setClasses(cls)
      setLoading(false)
    })
    return unsub
  }, [user])

  return (
    <AppShell>
      <TopBar title="Reminder Messages" />
      <main className="flex-1 p-4 pb-24 flex flex-col gap-3">

        <p className="text-xs text-gray-500 px-1">
          Edit the scheduled reminder template, or send a custom message to all students right now.
          Use{' '}
          <span className="font-mono text-primary-600">{'{name}'}</span>,{' '}
          <span className="font-mono text-primary-600">{'{fee}'}</span>,{' '}
          <span className="font-mono text-primary-600">{'{dueDate}'}</span> as placeholders.
        </p>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && classes.length === 0 && (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">
              No classes yet. Create a class first.
            </p>
          </Card>
        )}

        {classes.map(cls => (
          <ReminderCard key={cls.id} cls={cls} />
        ))}
      </main>
      <BottomNav />
    </AppShell>
  )
}
