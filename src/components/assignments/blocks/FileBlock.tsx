import { Download, FileText } from 'lucide-react'

interface FileBlockProps {
  fileUrl:  string
  fileName: string
}

export function FileBlock({ fileUrl, fileName }: FileBlockProps) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const isPdf = ext === 'pdf'

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      download={fileName}
      className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        isPdf ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        <FileText className={`w-5 h-5 ${isPdf ? 'text-red-500' : 'text-blue-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
        <p className="text-[11px] text-gray-400 uppercase">{ext} file</p>
      </div>
      <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
    </a>
  )
}
