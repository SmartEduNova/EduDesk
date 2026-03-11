import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { TopBar } from './TopBar'

interface AppShellProps {
  children: ReactNode
  title?: string
  className?: string
}

/**
 * Outer shell that constrains content to mobile width and
 * leaves room for the fixed bottom navigation.
 */
export function AppShell({ children, title, className }: AppShellProps) {
  const online = useOnlineStatus()

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className={cn('w-full max-w-md flex flex-col min-h-screen relative', className)}>
        {!online && (
          <div className="sticky top-0 z-50 bg-amber-500 text-white text-center text-xs font-medium py-1.5 px-4">
            You are offline — some features may not be available
          </div>
        )}
        {title && <TopBar title={title} />}
        {children}
      </div>
    </div>
  )
}
