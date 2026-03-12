import { useEffect, useState, useRef } from 'react'
import { FileText, CheckCircle, Upload, ExternalLink, RotateCcw } from 'lucide-react'
import { AppShell }  from '@/components/layout/AppShell'
import { TopBar }    from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Card }      from '@/components/ui/Card'
import { Button }    from '@/components/ui/Button'
import { useAuth }   from '@/contexts/AuthContext'
import { useStudentEnrollments } from '@/hooks/useStudentData'
import {
  subscribeToStudentAssignments,
  subscribeToStudentSubmissions,
  markAssignmentDone,
  submitAssignmentFile,
  undoAssignmentSubmission,
} from '@/lib/assignments'
import { AssignmentBlocks } from '@/components/assignments/blocks/AssignmentBlocks'
import { format, isPast, parseISO } from 'date-fns'
import type { Assignment, AssignmentSubmission } from '@/types'

// ─── Assignment card ──────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  submission,
  studentName,
  studentId,
}: {
  assignment:  Assignment
  submission?: AssignmentSubmission
  studentName: string
  studentId:   string
}) {
  const [uploading,   setUploading]   = useState(false)
  const [markingDone, setMarkingDone] = useState(false)
  const [error,       setError]       = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOverdue  = assignment.dueDate ? isPast(parseISO(assignment.dueDate)) : false
  const isDone     = submission?.status === 'done'
  const isSubmitted = submission?.status === 'submitted'
  const responded  = isDone || isSubmitted

  const handleMarkDone = async () => {
    setMarkingDone(true)
    setError('')
    try {
      await markAssignmentDone(
        assignment.id,
        assignment.classId,
        studentId,
        studentName,
      )
    } catch {
      setError('Failed. Please try again.')
    } finally {
      setMarkingDone(false)
    }
  }

  const handleUndo = async () => {
    if (!confirm('Revert this assignment to not done?')) return
    setError('')
    try {
      await undoAssignmentSubmission(assignment.id, studentId)
    } catch {
      setError('Failed to undo. Please try again.')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await submitAssignmentFile(
        assignment.id,
        assignment.classId,
        studentId,
        studentName,
        file,
      )
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Card className={responded ? 'opacity-80' : undefined}>
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{assignment.title}</p>
            <p className="text-[11px] text-primary-600 font-medium mt-0.5">{assignment.className}</p>
          </div>
          {responded && (
            <div className="flex items-center gap-1.5">
              {isDone && (
                <button
                  onClick={handleUndo}
                  className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Undo mark as done"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                isSubmitted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {isSubmitted ? 'Submitted' : 'Done'}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {assignment.description && (
          <p className="text-xs text-gray-600 leading-relaxed">{assignment.description}</p>
        )}

        {/* Content blocks */}
        {assignment.blocks && assignment.blocks.length > 0 && (
          <AssignmentBlocks blocks={assignment.blocks} />
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {assignment.dueDate && (
            <span className={`text-[11px] font-medium ${isOverdue && !responded ? 'text-red-500' : 'text-gray-400'}`}>
              Due {format(parseISO(assignment.dueDate), 'd MMM yyyy')}
              {isOverdue && !responded && ' · Overdue'}
            </span>
          )}
          {assignment.allowFileUpload && !responded && (
            <span className="text-[11px] text-gray-400">File upload allowed</span>
          )}
        </div>

        {/* Submitted file link */}
        {isSubmitted && submission?.fileUrl && (
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View uploaded file ({submission.fileName ?? 'file'})
          </a>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Actions */}
        {!responded && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleMarkDone}
              disabled={markingDone || uploading}
            >
              <CheckCircle className="w-4 h-4" />
              {markingDone ? 'Saving…' : 'Mark done'}
            </Button>

            {assignment.allowFileUpload && (
              <>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || markingDone}
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading…' : 'Upload file'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAssignments() {
  const { user, profile } = useAuth()
  const { enrollments, loading: enrollLoading } = useStudentEnrollments()

  const [assignments,  setAssignments]  = useState<Assignment[]>([])
  const [subMap,       setSubMap]       = useState<Map<string, AssignmentSubmission>>(new Map())
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (enrollLoading) return
    if (enrollments.length === 0) { setLoading(false); return }

    const classIds = enrollments.map(e => e.classId)
    let assignLoaded = false
    let subsLoaded   = false

    const checkBothLoaded = () => {
      if (assignLoaded && subsLoaded) setLoading(false)
    }

    const unsubAssign = subscribeToStudentAssignments(classIds, items => {
      setAssignments(items)
      assignLoaded = true
      checkBothLoaded()
    })

    const unsubSubs = user
      ? subscribeToStudentSubmissions(user.uid, map => {
          setSubMap(map)
          subsLoaded = true
          checkBothLoaded()
        })
      : (() => { subsLoaded = true; checkBothLoaded(); return () => {} })()

    return () => { unsubAssign(); unsubSubs() }
  }, [enrollments, enrollLoading, user])

  const pending   = assignments.filter(a => !subMap.has(a.id))
  const completed = assignments.filter(a =>  subMap.has(a.id))

  return (
    <AppShell>
      <TopBar title="Assignments" />

      <main className="flex-1 p-4 pb-24 flex flex-col gap-3">

        {(loading || enrollLoading) && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !enrollLoading && assignments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20 text-center">
            <FileText className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No assignments yet</p>
            <p className="text-xs text-gray-400">Your teacher hasn't posted any assignments.</p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              Pending ({pending.length})
            </p>
            {pending.map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                submission={subMap.get(a.id)}
                studentName={profile?.displayName ?? ''}
                studentId={user?.uid ?? ''}
              />
            ))}
          </>
        )}

        {!loading && completed.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mt-2">
              Completed ({completed.length})
            </p>
            {completed.map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                submission={subMap.get(a.id)}
                studentName={profile?.displayName ?? ''}
                studentId={user?.uid ?? ''}
              />
            ))}
          </>
        )}

      </main>

      <BottomNav />
    </AppShell>
  )
}
