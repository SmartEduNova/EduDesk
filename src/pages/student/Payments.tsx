import { Navigate } from 'react-router-dom'

// Payment history is now embedded in the Status page.
export default function StudentPayments() {
  return <Navigate to="/student/status" replace />
}
