import { useNavigate } from 'react-router-dom'
import { LogOut, Shield, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Card } from '@/components/ui/Card'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { TelegramLinkCard } from '@/components/profile/TelegramLinkCard'
import { useAuth } from '@/contexts/AuthContext'

export default function TeacherProfile() {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <AppShell>
      <TopBar title="Profile" />
      <main className="flex-1 p-4 pb-24 flex flex-col gap-4">

        <ProfileCard />
        <TelegramLinkCard />

        {/* App info */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">About</p>
          </div>
          <div className="flex flex-col divide-y divide-gray-100">
            <InfoRow label="App" value="EduSync" />
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Role" value="Teacher" />
          </div>
        </Card>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-600">Sign Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-400" />
        </button>

      </main>
      <BottomNav />
    </AppShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}
