import { useNavigate } from 'react-router-dom'
import { Clock, LogOut } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'

export default function PendingApproval() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await auth.signOut()
    navigate('/auth/login', { replace: true })
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Account Pending Approval</h1>
          <p className="text-gray-500 max-w-xs mx-auto">
            Your account has been created successfully. An administrator needs to approve your account before you can access the app features.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4 pt-4">
          <p className="text-sm text-gray-400">
            Please check back later. You will be able to access the dashboard once approved.
          </p>
          
          <Button 
            variant="outline" 
            fullWidth 
            onClick={handleSignOut}
            className="mt-8"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
