import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { PageLoader } from '@/components/ui/Spinner'
import { usePWAInstall } from '@/hooks/usePWAInstall'

// Lazy-loaded pages
const Landing        = lazy(() => import('@/pages/Landing'))
const Login          = lazy(() => import('@/pages/auth/Login'))
const Register       = lazy(() => import('@/pages/auth/Register'))
const RoleSelect     = lazy(() => import('@/pages/auth/RoleSelect'))
const JoinClass      = lazy(() => import('@/pages/JoinClass'))
const NotFound       = lazy(() => import('@/pages/NotFound'))

// Teacher pages
const TeacherDashboard     = lazy(() => import('@/pages/teacher/Dashboard'))
const TeacherClasses       = lazy(() => import('@/pages/teacher/Classes'))
const TeacherClassForm     = lazy(() => import('@/pages/teacher/ClassForm'))
const TeacherClassDetail   = lazy(() => import('@/pages/teacher/ClassDetail'))
const TeacherClassStudents = lazy(() => import('@/pages/teacher/ClassStudents'))
const TeacherClassAssignments    = lazy(() => import('@/pages/teacher/ClassAssignments'))
const TeacherClassAssignmentNew  = lazy(() => import('@/pages/teacher/ClassAssignmentNew'))
const TeacherReminders     = lazy(() => import('@/pages/teacher/Reminders'))
const TeacherProfile       = lazy(() => import('@/pages/teacher/Profile'))

// Student pages
const StudentStatus        = lazy(() => import('@/pages/student/Status'))
const StudentPayments      = lazy(() => import('@/pages/student/Payments'))
const StudentAssignments   = lazy(() => import('@/pages/student/Assignments'))
const StudentNotifications = lazy(() => import('@/pages/student/Notifications'))
const StudentProfile       = lazy(() => import('@/pages/student/Profile'))

// ─── Protected Route Guards ───────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

function RequireRole({ role, children }: { role: 'teacher' | 'student'; children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/auth/login" replace />
  if (profile.role !== role) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher/dashboard' : '/student/status'} replace />
  }
  return <>{children}</>
}

// ─── App Router ───────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"                  element={<Landing />} />
        <Route path="/auth/login"        element={<Login />} />
        <Route path="/auth/register"     element={<Register />} />
        <Route path="/auth/role-select"  element={<RequireAuth><RoleSelect /></RequireAuth>} />
        <Route path="/join/:code"        element={<JoinClass />} />

        {/* Teacher */}
        <Route
          path="/teacher/*"
          element={
            <RequireAuth>
              <RequireRole role="teacher">
                <Routes>
                  <Route path="dashboard"               element={<TeacherDashboard />} />
                  <Route path="classes"                 element={<TeacherClasses />} />
                  <Route path="classes/new"             element={<TeacherClassForm />} />
                  <Route path="classes/:classId"          element={<TeacherClassDetail />} />
                  <Route path="classes/:classId/edit"     element={<TeacherClassForm />} />
                  <Route path="classes/:classId/students"    element={<TeacherClassStudents />} />
                  <Route path="classes/:classId/assignments"     element={<TeacherClassAssignments />} />
                  <Route path="classes/:classId/assignments/new" element={<TeacherClassAssignmentNew />} />
                  <Route path="reminders"               element={<TeacherReminders />} />
                  <Route path="profile"                 element={<TeacherProfile />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Routes>
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Student */}
        <Route
          path="/student/*"
          element={
            <RequireAuth>
              <RequireRole role="student">
                <Routes>
                  <Route path="status"        element={<StudentStatus />} />
                  <Route path="payments"      element={<StudentPayments />} />
                  <Route path="assignments"   element={<StudentAssignments />} />
                  <Route path="notifications" element={<StudentNotifications />} />
                  <Route path="profile"       element={<StudentProfile />} />
                  <Route index element={<Navigate to="status" replace />} />
                </Routes>
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall()
  if (!canInstall) return null
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install EduSync</p>
          <p className="text-xs text-gray-500 truncate">Add to home screen for quick access</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 bg-primary-600 text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-primary-700 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <PWAInstallBanner />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
