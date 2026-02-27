import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  back?: boolean | string   // true = go -1, string = go to that path
  right?: ReactNode
  className?: string
}

export function TopBar({ title, back, right, className }: TopBarProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-20 bg-white border-b border-gray-100 flex items-center px-4 h-14 gap-3',
        className
      )}
    >
      {back !== undefined && (
        <button
          onClick={handleBack}
          className="p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="flex-1 font-semibold text-gray-900 text-base truncate">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
