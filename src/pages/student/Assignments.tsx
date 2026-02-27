import { useEffect, useState, useRef } from 'react'
import {
  FileText, CheckCircle, Upload, ChevronDown, ChevronUp,
  X, Loader2, ExternalLink,
} from 'lucide-react'
import { AppShell }  from '@/components/layout/AppShell'
import { TopBar }    from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Card }      from '@/components/ui/Card'
import { Button }    from '@/components/ui/Button'
import { AssignmentContent } from '@/components/assignments/AssignmentContent'
import { useAuth }   from '@/contexts/AuthContext'
import { useStudentEnrollments } from '@/hooks/useStudentData'
import {
  subscribeToStudentAssignments,
  subscribeToStudentSubmissions,
  markAssignmentDone,
  addSubmissionFiles,
  removeSubmissionFile,
} from '@/lib/assignments'
import { format, isPast, parseISO } from 'date-fns'
import type { Assignment, AssignmentSubmission, SubmissionFile } from '@/types'

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
  const [expanded,     setExpanded]     = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [markingDone,  setMarkingDone]  = useState(false)
  const [removingPath, setRemovingPath] = useState<string | null>(null)
  const [error,        setError]        = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOverdue   = assignment.dueDate ? isPast(parseISO(assignment.dueDate)) : false
  const isDone      = submission?.status === 'done'
  const isSubmitted = submission?.status === 'submitted'
  const responded   = isDone || isSubmitted

  // Combine new multi-file list with legacy single-file (display only)
  const newFiles: SubmissionFile[] = submission?.files ?? []
  const legacyFile: SubmissionFile | null =
    submission?.fileUrl && !newFiles.length
      ? { url: submission.fileUrl, name: submission.fileName ?? 'file', storagePath: '' }
      : null
  const allFiles = legacyFile ? [legacyFile, ...newFiles] : newFiles

  const handleMarkDone = async () => {
    setMarkingDone(true)
    setError('')
    try {
      await markAssignmentDone(assignment.id, assignment.classId, studentId, studentName)
    } catch {
      setError('Failed. Please try again.')
    } finally {
      setMarkingDone(false)
    }
  }

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    setUploading(true)
    setError('')
    try {
      await addSubmissionFiles(assignment.id, assignment.classId, studentId, studentName, selected)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = async (file: SubmissionFile) => {
    if (!file.storagePath) return // legacy file — no storagePath, can't delete
    setRemovingPath(file.storagePath)
    setError('')
    try {
      await removeSubmissionFile(assignment.id, studentId, file)
    } catch {
      setError('Could not remove file. Please try again.')
    } finally {
      setRemovingPath(null)
    }
  }

  return (
    <Card>
      {/* Header — tap to expand/collapse */}
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{assignment.title}</p>
            {responded && (
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                isSubmitted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isSubmitted ? `${allFiles.length} file${allFiles.length !== 1 ? 's' : ''}` : 'Done'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-primary-600 font-medium mt-0.5">{assignment.className}</p>
          <div className="flex items-center gap-3 flex-wrap mt-1">
            {assignment.dueDate && (
              <span className={`text-[11px] font-medium ${
                isOverdue && !responded ? 'text-red-500' : 'text-gray-400'
              }`}>
                Due {format(parseISO(assignment.dueDate), 'd MMM yyyy')}
                {isOverdue && !responded && ' · Overdue'}
              </span>
            )}
            {assignment.blocks.length > 0 && (
              <span className="text-[11px] text-gray-400">
                {assignment.blocks.length} block{assignment.blocks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-gray-400 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">

          {/* Assignment content blocks */}
          {assignment.blocks.length > 0 && (
            <AssignmentContent blocks={assignment.blocks} />
          )}

          {/* Uploaded files list */}
          {allFiles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Submitted files ({allFiles.length})
              </p>
              {allFiles.map(file => (
                <div
                  key={file.url}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-xs text-primary-600 hover:underline truncate"
                    onClick={e => e.stopPropagation()}
                  >
                    {file.name}
                  </a>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-gray-400 hover:text-gray-600"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {file.storagePath && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveFile(file) }}
                      disabled={removingPath === file.storagePath}
                      className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      {removingPath === file.storagePath
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <X className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Action buttons */}
          {!isDone && (
            <div className="flex gap-2">
              {!isSubmitted && (
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
              )}

              {assignment.allowFileUpload && (
                <>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || markingDone}
                  >
                    <Upload className="w-4 h-4" />
                    {uploading
                      ? 'Uploading…'
                      : allFiles.length > 0
                        ? 'Add more files'
                        : 'Upload files'
                    }
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFilesChange}
                  />
                </>
              )}
            </div>
          )}

        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAssignments() {
  const { user, profile } = useAuth()
  const { enrollments, loading: enrollLoading } = useStudentEnrollments()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [subMap,      setSubMap]      = useState<Map<string, AssignmentSubmission>>(new Map())
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (enrollLoading) return
    if (enrollments.length === 0) { setLoading(false); return }

    const classIds = enrollments.map(e => e.classId)
    let assignLoaded = false
    let subsLoaded   = false

    const checkDone = () => { if (assignLoaded && subsLoaded) setLoading(false) }

    const unsubAssign = subscribeToStudentAssignments(classIds, items => {
      setAssignments(items)
      assignLoaded = true
      checkDone()
    })

    const unsubSubs = user
      ? subscribeToStudentSubmissions(user.uid, map => {
          setSubMap(map)
          subsLoaded = true
          checkDone()
        })
      : (() => { subsLoaded = true; checkDone(); return () => {} })()

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
