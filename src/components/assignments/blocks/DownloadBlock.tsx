import { Download } from 'lucide-react'

export function DownloadBlock({ data }: { data: { fileUrl: string; fileName: string } }) {
  return (
    <a
      href={data.fileUrl}
      download={data.fileName}
      target="_blank"
      rel="noreferrer"
      className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3 hover:border-primary-400 hover:bg-primary-50 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary-600 transition-colors">
        <Download className="w-5 h-5" />
      </div>
      
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate uppercase tracking-wider">
          Download File
        </p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">
          {data.fileName}
        </p>
      </div>
    </a>
  )
}
