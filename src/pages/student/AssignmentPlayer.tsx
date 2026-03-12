import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { PageLoader } from '@/components/ui/Spinner'
import { db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { AssignmentBlocks } from '@/components/assignments/blocks/AssignmentBlocks'
import { useAuth } from '@/contexts/AuthContext'
import { markAssignmentDone, subscribeToStudentSubmissions } from '@/lib/assignments'
import { Button } from '@/components/ui/Button'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import type { Assignment, AssignmentSubmission } from '@/types'
import { Timestamp } from 'firebase/firestore'

export default function AssignmentPlayer() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingDone, setMarkingDone] = useState(false)

  useEffect(() => {
    if (!assignmentId || !user) return

    // Fetch assignment
    const unsubAssign = onSnapshot(doc(db, 'assignments', assignmentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setAssignment({
          id: snap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        } as Assignment)
      }
      setLoading(false)
    })

    // Subscribe to submission
    const unsubSub = subscribeToStudentSubmissions(user.uid, (map) => {
      setSubmission(map.get(assignmentId) || null)
    })

    return () => {
      unsubAssign()
      unsubSub()
    }
  }, [assignmentId, user])

  const handleMarkDone = async () => {
    if (!assignment || !user || !profile) return
    setMarkingDone(true)
    try {
      await markAssignmentDone(
        assignment.id,
        assignment.classId,
        user.uid,
        profile.displayName
      )
    } catch (err) {
      console.error(err)
    } finally {
      setMarkingDone(false)
    }
  }

  if (loading) return <PageLoader />
  if (!assignment) return (
    <AppShell>
      <TopBar title="Not Found" back="/student/assignments" />
      <div className="p-8 text-center text-gray-500">Assignment not found</div>
    </AppShell>
  )

  const isDone = submission?.status === 'done' || submission?.status === 'submitted'

  return (
    <AppShell>
      <TopBar 
        title={assignment.title} 
        back="/student/assignments"
      />

      <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-sm text-primary-600 font-medium">{assignment.className}</p>
        </div>

        {assignment.description && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-6 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed italic">{assignment.description}</p>
          </div>
        )}

        {assignment.blocks && assignment.blocks.length > 0 ? (
          <AssignmentBlocks blocks={assignment.blocks} />
        ) : (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm italic">No special content for this assignment.</p>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-3">
          {!isDone ? (
            <Button 
              size="lg" 
              className="w-full h-14 rounded-2xl text-lg shadow-lg shadow-primary-100"
              onClick={handleMarkDone}
              disabled={markingDone}
            >
              <CheckCircle className="w-6 h-6 mr-2" />
              {markingDone ? 'Saving...' : 'Mark as Completed'}
            </Button>
          ) : (
            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center justify-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wide">Assignment Done</span>
            </div>
          )}
          
          <Button 
            variant="outline" 
            className="w-full rounded-2xl"
            onClick={() => navigate('/student/assignments')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </div>
      </main>
    </AppShell>
  )
}
