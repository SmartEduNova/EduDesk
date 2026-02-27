import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Type, Image, FileDown, Youtube, Trash2, ChevronUp, ChevronDown, Loader2,
} from 'lucide-react'
import { AppShell }  from '@/components/layout/AppShell'
import { TopBar }    from '@/components/layout/TopBar'
import { Button }    from '@/components/ui/Button'
import { Card }      from '@/components/ui/Card'
import { getClass }  from '@/lib/classes'
import { createAssignment, uploadAssignmentBlockFile } from '@/lib/assignments'
import { useAuth }   from '@/contexts/AuthContext'
import type { AssignmentBlock, AssignmentBlockType } from '@/types'

// ─── Local block state (flat, easy to edit) ───────────────────────────────────

interface BuildingBlock {
  id:        string
  type:      AssignmentBlockType
  // text
  content:   string
  // image
  imageUrl:  string
  caption:   string
  // file
  fileUrl:   string
  fileName:  string
  // youtube
  videoUrl:  string
  // upload state
  uploading: boolean
  uploadErr: string
}

function newBlock(type: AssignmentBlockType): BuildingBlock {
  return {
    id:        crypto.randomUUID(),
    type,
    content:   '',
    imageUrl:  '',
    caption:   '',
    fileUrl:   '',
    fileName:  '',
    videoUrl:  '',
    uploading: false,
    uploadErr: '',
  }
}

function toAssignmentBlock(b: BuildingBlock): AssignmentBlock {
  const base = { id: b.id, type: b.type }
  switch (b.type) {
    case 'text':
      return { ...base, data: { content: b.content } }
    case 'image':
      return { ...base, data: { imageUrl: b.imageUrl, caption: b.caption || undefined } }
    case 'file':
      return { ...base, data: { fileUrl: b.fileUrl, fileName: b.fileName } }
    case 'youtube':
      return { ...base, data: { videoUrl: b.videoUrl } }
  }
}

// ─── Individual block editor ──────────────────────────────────────────────────

function BlockEditor({
  block,
  index,
  total,
  classId,
  onChange,
  onDelete,
  onMove,
}: {
  block:    BuildingBlock
  index:    number
  total:    number
  classId:  string
  onChange: (id: string, patch: Partial<BuildingBlock>) => void
  onDelete: (id: string) => void
  onMove:   (id: string, dir: -1 | 1) => void
}) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File, kind: 'image' | 'file') => {
    onChange(block.id, { uploading: true, uploadErr: '' })
    try {
      const { url, name } = await uploadAssignmentBlockFile(classId, block.id, file)
      if (kind === 'image') {
        onChange(block.id, { imageUrl: url, uploading: false })
      } else {
        onChange(block.id, { fileUrl: url, fileName: name, uploading: false })
      }
    } catch {
      onChange(block.id, { uploading: false, uploadErr: 'Upload failed. Please try again.' })
    }
  }

  const typeLabel: Record<AssignmentBlockType, string> = {
    text:    'Text',
    image:   'Image',
    file:    'File',
    youtube: 'YouTube',
  }

  return (
    <Card>
      {/* Block header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-1">
          {typeLabel[block.type]}
        </span>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(block.id, -1)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(block.id, 1)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="p-1 rounded text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Block content editor */}
      {block.type === 'text' && (
        <textarea
          value={block.content}
          onChange={e => onChange(block.id, { content: e.target.value })}
          placeholder="Type your instructions or notes here…"
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}

      {block.type === 'image' && (
        <div className="flex flex-col gap-2">
          {block.imageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-100">
              <img src={block.imageUrl} alt="Block" className="w-full object-cover max-h-48" />
              <button
                type="button"
                onClick={() => onChange(block.id, { imageUrl: '' })}
                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg text-gray-600 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={block.uploading}
              className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors disabled:opacity-50"
            >
              {block.uploading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Image className="w-5 h-5" />
              }
              <span className="text-xs">{block.uploading ? 'Uploading…' : 'Tap to add image'}</span>
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'image') }}
          />
          <input
            value={block.caption}
            onChange={e => onChange(block.id, { caption: e.target.value })}
            placeholder="Caption (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {block.uploadErr && <p className="text-xs text-red-500">{block.uploadErr}</p>}
        </div>
      )}

      {block.type === 'file' && (
        <div className="flex flex-col gap-2">
          {block.fileUrl ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <FileDown className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-sm font-medium text-gray-700 flex-1 truncate">{block.fileName}</p>
              <button
                type="button"
                onClick={() => onChange(block.id, { fileUrl: '', fileName: '' })}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={block.uploading}
              className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors disabled:opacity-50"
            >
              {block.uploading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <FileDown className="w-5 h-5" />
              }
              <span className="text-xs">{block.uploading ? 'Uploading…' : 'Tap to attach file (PDF, DOC…)'}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'file') }}
          />
          {block.uploadErr && <p className="text-xs text-red-500">{block.uploadErr}</p>}
        </div>
      )}

      {block.type === 'youtube' && (
        <input
          value={block.videoUrl}
          onChange={e => onChange(block.id, { videoUrl: e.target.value })}
          placeholder="Paste YouTube URL (e.g. https://youtu.be/…)"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
    </Card>
  )
}

// ─── Add Block picker ─────────────────────────────────────────────────────────

const BLOCK_TYPES: { type: AssignmentBlockType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'text',    label: 'Text',    icon: <Type    className="w-5 h-5" />, color: 'bg-gray-100   text-gray-600'   },
  { type: 'image',   label: 'Image',   icon: <Image   className="w-5 h-5" />, color: 'bg-green-100  text-green-600'  },
  { type: 'file',    label: 'File',    icon: <FileDown className="w-5 h-5" />, color: 'bg-blue-100   text-blue-600'   },
  { type: 'youtube', label: 'YouTube', icon: <Youtube  className="w-5 h-5" />, color: 'bg-red-100    text-red-600'    },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassAssignmentNew() {
  const { classId }  = useParams<{ classId: string }>()
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [className,       setClassName]       = useState('')
  const [title,           setTitle]           = useState('')
  const [dueDate,         setDueDate]         = useState('')
  const [allowFileUpload, setAllowFileUpload] = useState(false)
  const [blocks,          setBlocks]          = useState<BuildingBlock[]>([])
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  useEffect(() => {
    if (!classId) return
    getClass(classId).then(cls => { if (cls) setClassName(cls.name) })
  }, [classId])

  const addBlock = (type: AssignmentBlockType) => {
    setBlocks(prev => [...prev, newBlock(type)])
  }

  const updateBlock = (id: string, patch: Partial<BuildingBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  const handleCreate = async () => {
    if (!title.trim())  { setError('Assignment title is required'); return }
    if (!classId || !user) return

    const anyUploading = blocks.some(b => b.uploading)
    if (anyUploading)  { setError('Please wait for uploads to finish'); return }

    // Validate blocks have required data
    for (const b of blocks) {
      if (b.type === 'text'    && !b.content.trim())  { setError('A text block is empty'); return }
      if (b.type === 'image'   && !b.imageUrl)         { setError('An image block has no image'); return }
      if (b.type === 'file'    && !b.fileUrl)           { setError('A file block has no file'); return }
      if (b.type === 'youtube' && !b.videoUrl.trim())  { setError('A YouTube block has no URL'); return }
    }

    setSaving(true)
    setError('')
    try {
      await createAssignment(classId, className, user.uid, {
        title:           title.trim(),
        blocks:          blocks.map(toAssignmentBlock),
        dueDate:         dueDate || null,
        allowFileUpload,
      })
      navigate(`/teacher/classes/${classId}/assignments`, { replace: true })
    } catch {
      setError('Failed to create assignment. Please try again.')
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <TopBar
        title="New Assignment"
        back={`/teacher/classes/${classId}/assignments`}
      />

      <main className="flex-1 p-4 pb-8 flex flex-col gap-4">

        {/* Title */}
        <Card>
          <div className="flex flex-col gap-3">
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
              <span className="text-sm text-gray-700">Allow students to submit a file / photo</span>
            </label>
          </div>
        </Card>

        {/* Content blocks */}
        {blocks.length > 0 && (
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            Content ({blocks.length} block{blocks.length !== 1 ? 's' : ''})
          </p>
        )}

        {classId && blocks.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            index={index}
            total={blocks.length}
            classId={classId}
            onChange={updateBlock}
            onDelete={deleteBlock}
            onMove={moveBlock}
          />
        ))}

        {/* Add block picker */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 px-1">Add block</p>
          <div className="grid grid-cols-4 gap-2">
            {BLOCK_TYPES.map(({ type, label, icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[11px] font-semibold ${color} hover:opacity-80 transition-opacity`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 text-center px-2">{error}</p>
        )}

        {/* Submit */}
        <Button
          onClick={handleCreate}
          disabled={saving || blocks.some(b => b.uploading)}
          className="w-full"
        >
          {saving ? 'Creating…' : 'Create Assignment'}
        </Button>

      </main>
    </AppShell>
  )
}
