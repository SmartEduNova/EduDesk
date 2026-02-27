import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { AppShell } from '@/components/layout/AppShell'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-4">
        <div className="text-6xl font-bold text-primary-200">404</div>
        <h1 className="text-xl font-semibold text-gray-800">Page Not Found</h1>
        <p className="text-sm text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    </AppShell>
  )
}
