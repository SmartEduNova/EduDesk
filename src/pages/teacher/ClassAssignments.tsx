import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Users, FileText, CheckCircle, Clock,
  Type, Image, FileDown, Youtube,
} from 'lucide-react'
import { AppShell }   from '@/components/layout/AppShell'
import { TopBar }     from '@/components/layout/TopBar'
import { Card }       from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import {
  subscribeToClassAssignments,
  deleteAssignment,
  getAssignmentSubmissions,
} from '@/lib/assignments'
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns'
import type { Assignment, AssignmentSubmission, AssignmentBlockType } from '@/types'

// ─── Block type icon map ──────────────────────────────────────────────────────

const BLOCK_ICON: Record<AssignmentBlockType, React.ReactNode> = {
  text:    <Type     className="w-3 h-3" />,
  image:   <Image    className="w-3 h-3" />,
  file:    <FileDown className="w-3 h-3" />,
  youtube: <Youtube  className="w-3 h-3" />,
}

// ─── Submission row ───────────────────────────────────────────────────────────

function SubmissionRow({ sub }: { sub: AssignmentSubmission }) {
  const statusStyle =
    sub.status === 'submitted' ? 'bg-green-100 text-green-700' :
    sub.status === 'done'      ? 'bg-blue-100  text-blue-700'  :
                                 'bg-gray-100  text-gray-500'
  const statusLabel =
    sub.status === 'submitted' ? 'File uploaded' :
    sub.status === 'done'      ? 'Marked done'   : 'Pending'

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{sub.studentName}</p>
        {sub.submittedAt && (
          <p className="text-[11px] text-gray-400">
            {formatDistanceToNow(sub.submittedAt, { addSuffix: true })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
          {statusLabel}
        </span>
        {sub.fileUrl && (
          <a
            href={sub.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary-600 hover:underline text-[11px] font-medium"
          >
            View
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Assignment card ──────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  onDelete,
}: {
  assignment: Assignment
  onDelete:   (id: string) => void
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [subs,        setSubs]        = useState<AssignmentSubmission[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  const isOverdue = assignment.dueDate ? isPast(parseISO(assignment.dueDate)) : false

  // Block summary: count by type
  const blockCounts = assignment.blocks.reduce<Partial<Record<AssignmentBlockType, number>>>(
    (acc, b) => { acc[b.type] = (acc[b.type] ?? 0) + 1; return acc },
    {}
  )

  // First text block content as preview
  const firstText = assignment.blocks.find(b => b.type === 'text')?.data.content ?? ''

  const handleExpand = async () => {
    if (!expanded && subs.length === 0) {
      setLoadingSubs(true)
      const data = await getAssignmentSubmissions(assignment.id)
      setSubs(data)
      setLoadingSubs(false)
    }
    setExpanded(v => !v)
  }

  const done      = subs.filter(s => s.status === 'done').length
  const submitted = subs.filter(s => s.status === 'submitted').length
  const total     = subs.length

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-gray-900">{assignment.title}</p>
            {assignment.dueDate && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
              }`}>
                Due {format(parseISO(assignment.dueDate), 'd MMM yyyy')}
              </span>
            )}
            {assignment.allowFileUpload && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                File upload
              </span>
            )}
          </div>

          {/* Block type pills */}
          {assignment.blocks.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {(Object.entries(blockCounts) as [AssignmentBlockType, number][]).map(([type, count]) => (
                <span key={type}
                  className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full"
                >
                  {BLOCK_ICON[type]}
                  {count > 1 ? `${count} ` : ''}{type}
                </span>
              ))}
            </div>
          )}

          {/* First text preview */}
          {firstText && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{firstText}</p>
          )}

          <p className="text-[11px] text-gray-400 mt-1">
            Posted {formatDistanceToNow(assignment.createdAt, { addSuffix: true })}
          </p>
        </div>

        <button
          onClick={() => onDelete(assignment.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Submissions toggle */}
      <button
        onClick={handleExpand}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        <Users className="w-3.5 h-3.5" />
        View submissions
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {loadingSubs ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : subs.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">No submissions yet.</p>
          ) : (
            <>
              <div className="flex gap-3 mb-2">
                <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> {submitted} file{submitted !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> {done} done
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                  <Clock className="w-3.5 h-3.5" /> {total - done - submitted} pending
                </span>
              </div>
              {subs.map(s => <SubmissionRow key={s.id} sub={s} />)}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassAssignments() {
  const { classId }  = useParams<{ classId: string }>()
  const navigate     = useNavigate()
  const [loading,    setLoading]    = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!classId) return
    unsubRef.current = subscribeToClassAssignments(classId, items => {
      setAssignments(items)
      setLoading(false)
    })
    return () => unsubRef.current?.()
  }, [classId])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this assignment?')) return
    await deleteAssignment(id)
  }

  if (loading) return <PageLoader />

  return (
    <AppShell>
      <TopBar
        title="Assignments"
        back={`/teacher/classes/${classId}`}
        right={
          <button
            onClick={() => navigate(`/teacher/classes/${classId}/assignments/new`)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <main className="flex-1 p-4 pb-8 flex flex-col gap-3">

        {assignments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20 text-center">
            <FileText className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No assignments yet</p>
            <p className="text-xs text-gray-400">Tap + to create the first assignment for this class.</p>
          </div>
        )}

        {assignments.map(a => (
          <AssignmentCard key={a.id} assignment={a} onDelete={handleDelete} />
        ))}

      </main>
    </AppShell>
  )
}
