import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Users, FileText, CheckCircle, Clock,
  Type, Image, Video, Headphones, Download, HelpCircle, Edit3, X,
} from 'lucide-react'
import { AppShell }   from '@/components/layout/AppShell'
import { TopBar }     from '@/components/layout/TopBar'
import { Button }     from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { getClass }   from '@/lib/classes'
import {
  subscribeToClassAssignments,
  createAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  type CreateAssignmentInput,
} from '@/lib/assignments'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns'
import type { Assignment, AssignmentSubmission, ModuleBlock, BlockType } from '@/types'

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function AssignmentCard({
  assignment,
  onDelete,
}: {
  assignment: Assignment
  onDelete: (id: string) => void
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [subs,        setSubs]        = useState<AssignmentSubmission[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  const isOverdue = assignment.dueDate
    ? isPast(parseISO(assignment.dueDate))
    : false

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
          {assignment.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{assignment.description}</p>
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

      {/* Expand submissions */}
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



function BlockAddButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white border border-gray-100 hover:border-primary-400 hover:bg-primary-50 transition-all text-gray-500 hover:text-primary-600"
    >
      {icon}
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({
  classId,
  className,
  teacherId,
  onCreated,
  onCancel,
}: {
  classId:   string
  className: string
  teacherId: string
  onCreated: () => void
  onCancel:  () => void
}) {
  const [title,           setTitle]           = useState('')
  const [description,     setDescription]     = useState('')
  const [dueDate,         setDueDate]         = useState('')
  const [allowFileUpload, setAllowFileUpload] = useState(false)
  const [blocks,          setBlocks]          = useState<ModuleBlock[]>([])
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  const addBlock = (type: BlockType) => {
    const newBlock: ModuleBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: type === 'quiz_multiple_choice' ? { questions: [] } :
            type === 'quiz_fill_in_blank' ? { content: '', answers: [] } :
            type === 'text' ? { content: '' } :
            type === 'vimeo' ? { videoUrl: '' } :
            type === 'audio' ? { audioUrl: '', title: '' } :
            type === 'image' ? { imageUrl: '', caption: '' } :
            type === 'download' ? { fileUrl: '', fileName: '' } : {},
    }
    setBlocks([...blocks, newBlock])
  }

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id))
  }

  const updateBlockData = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data } : b))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      const input: CreateAssignmentInput = {
        title,
        description: description || undefined,
        dueDate:     dueDate || null,
        allowFileUpload,
        blocks:      blocks.length > 0 ? blocks : undefined,
      }
      await createAssignment(classId, className, teacherId, input)
      onCreated()
    } catch {
      setError('Failed to create assignment. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Assignment</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3 exercises"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Instructions or notes for students…"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Due date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={allowFileUpload}
            onChange={e => setAllowFileUpload(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Allow students to upload file / photo</span>
        </label>

        {/* Dynamic Blocks Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Lesson Content (Blocks)</p>
          
          <div className="flex flex-col gap-3 mb-4">
            {blocks.map((block, index) => (
              <div key={block.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 relative group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold">
                      {index + 1}
                    </div>
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">{block.type.replace(/_/g, ' ')}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Block specific editors */}
                {block.type === 'text' && (
                  <textarea
                    value={block.data.content}
                    onChange={e => updateBlockData(block.id, { ...block.data, content: e.target.value })}
                    placeholder="Enter text content..."
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                    rows={3}
                  />
                )}
                {block.type === 'vimeo' && (
                  <input
                    value={block.data.videoUrl}
                    onChange={e => updateBlockData(block.id, { ...block.data, videoUrl: e.target.value })}
                    placeholder="Vimeo URL or ID"
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none"
                  />
                )}
                {(block.type === 'image' || block.type === 'audio' || block.type === 'download') && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={block.type === 'image' ? block.data.imageUrl : block.type === 'audio' ? block.data.audioUrl : block.data.fileUrl}
                      onChange={e => {
                        const key = block.type === 'image' ? 'imageUrl' : block.type === 'audio' ? 'audioUrl' : 'fileUrl'
                        updateBlockData(block.id, { ...block.data, [key]: e.target.value })
                      }}
                      placeholder={`${block.type.charAt(0).toUpperCase() + block.type.slice(1)} URL`}
                      className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none"
                    />
                    <input
                      value={block.type === 'image' ? block.data.caption : block.type === 'audio' ? block.data.title : block.data.fileName}
                      onChange={e => {
                        const key = block.type === 'image' ? 'caption' : block.type === 'audio' ? 'title' : 'fileName'
                        updateBlockData(block.id, { ...block.data, [key]: e.target.value })
                      }}
                      placeholder={block.type === 'image' ? 'Caption (optional)' : block.type === 'audio' ? 'Audio Title' : 'File Name'}
                      className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none"
                    />
                  </div>
                )}
                {/* Quiz Fill in Blank Editor */}
                {block.type === 'quiz_fill_in_blank' && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={block.data.content}
                      onChange={e => updateBlockData(block.id, { ...block.data, content: e.target.value })}
                      placeholder="Text with [answer] placeholders..."
                      className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none"
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-1">
                      {block.data.answers.map((ans: string, i: number) => (
                        <div key={i} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400">#{i+1}</span>
                          <input
                            value={ans}
                            onChange={e => {
                              const newAns = [...block.data.answers]
                              newAns[i] = e.target.value
                              updateBlockData(block.id, { ...block.data, answers: newAns })
                            }}
                            className="w-20 text-[10px] outline-none"
                            placeholder="Answer"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newAns = block.data.answers.filter((_: any, idx: number) => idx !== i)
                              updateBlockData(block.id, { ...block.data, answers: newAns })
                            }}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateBlockData(block.id, { ...block.data, answers: [...block.data.answers, ''] })}
                        className="px-2 py-1 text-[10px] font-bold text-primary-600 border border-dashed border-primary-200 rounded hover:bg-primary-50"
                      >
                        + Answer
                      </button>
                    </div>
                  </div>
                )}

                {/* Quiz Multiple Choice Editor */}
                {block.type === 'quiz_multiple_choice' && (
                  <div className="flex flex-col gap-3">
                    {block.data.questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="p-2 bg-white border border-gray-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-400">Question #{qIdx+1}</span>
                          <button 
                            type="button"
                            onClick={() => {
                              const newQs = block.data.questions.filter((_: any, idx: number) => idx !== qIdx)
                              updateBlockData(block.id, { ...block.data, questions: newQs })
                            }}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          value={q.question}
                          onChange={e => {
                            const newQs = [...block.data.questions]
                            newQs[qIdx] = { ...q, question: e.target.value }
                            updateBlockData(block.id, { ...block.data, questions: newQs })
                          }}
                          placeholder="Question text"
                          className="w-full mb-2 p-1.5 text-xs bg-gray-50 border-0 rounded outline-none"
                        />
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={q.correctIndex === oIdx}
                                onChange={() => {
                                  const newQs = [...block.data.questions]
                                  newQs[qIdx] = { ...q, correctIndex: oIdx }
                                  updateBlockData(block.id, { ...block.data, questions: newQs })
                                }}
                                className="w-3 h-3 text-primary-600 focus:ring-primary-500"
                              />
                              <input
                                value={opt}
                                onChange={e => {
                                  const newOptions = [...q.options]
                                  newOptions[oIdx] = e.target.value
                                  const newQs = [...block.data.questions]
                                  newQs[qIdx] = { ...q, options: newOptions }
                                  updateBlockData(block.id, { ...block.data, questions: newQs })
                                }}
                                placeholder={`Option ${oIdx+1}`}
                                className="flex-1 text-[10px] p-1 border-b border-gray-100 outline-none"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const newOpts = q.options.filter((_: any, idx: number) => idx !== oIdx)
                                  const newQs = [...block.data.questions]
                                  newQs[qIdx] = { ...q, options: newOpts }
                                  updateBlockData(block.id, { ...block.data, questions: newQs })
                                }}
                                className="text-gray-300 hover:text-red-500"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newQs = [...block.data.questions]
                              newQs[qIdx] = { ...q, options: [...q.options, ''] }
                              updateBlockData(block.id, { ...block.data, questions: newQs })
                            }}
                            className="mt-1 text-[10px] text-gray-400 hover:text-primary-600 text-left pl-5"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = { question: '', options: ['', ''], correctIndex: 0 }
                        updateBlockData(block.id, { ...block.data, questions: [...block.data.questions, newQ] })
                      }}
                      className="py-2 text-[10px] font-bold text-primary-600 border border-dashed border-primary-200 rounded-lg hover:bg-primary-50"
                    >
                      + Add Question
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <BlockAddButton onClick={() => addBlock('text')} icon={<Type className="w-3.5 h-3.5" />} label="Text" />
            <BlockAddButton onClick={() => addBlock('image')} icon={<Image className="w-3.5 h-3.5" />} label="Image" />
            <BlockAddButton onClick={() => addBlock('vimeo')} icon={<Video className="w-3.5 h-3.5" />} label="Video" />
            <BlockAddButton onClick={() => addBlock('audio')} icon={<Headphones className="w-3.5 h-3.5" />} label="Audio" />
            <BlockAddButton onClick={() => addBlock('download')} icon={<Download className="w-3.5 h-3.5" />} label="File" />
            <BlockAddButton onClick={() => addBlock('quiz_multiple_choice')} icon={<HelpCircle className="w-3.5 h-3.5" />} label="Quiz MCQ" />
            <BlockAddButton onClick={() => addBlock('quiz_fill_in_blank')} icon={<Edit3 className="w-3.5 h-3.5" />} label="Quiz FIB" />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" className="flex-1" disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassAssignments() {
  const { classId }    = useParams<{ classId: string }>()
  const { user }       = useAuth()
  const [className,  setClassName]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!classId) return
    getClass(classId).then(cls => {
      if (cls) setClassName(cls.name)
    })
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
          !showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 p-4 pb-8 flex flex-col gap-3">

        {showForm && classId && user && (
          <CreateForm
            classId={classId}
            className={className}
            teacherId={user.uid}
            onCreated={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!loading && assignments.length === 0 && !showForm && (
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
