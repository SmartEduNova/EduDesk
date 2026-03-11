// ─── User Roles ──────────────────────────────────────────────────────────────

export type UserRole = 'teacher' | 'student'

export interface UserProfile {
  uid: string
  email: string
  phoneNumber?: string
  displayName: string
  photoURL?: string
  role: UserRole
  isApproved: boolean
  isAdmin?: boolean
  createdAt: Date
  telegramId?: string   // linked Telegram user ID
}

// ─── Class ───────────────────────────────────────────────────────────────────

export interface TuitionClass {
  id: string
  teacherId: string
  name: string
  subject?: string
  monthlyFee: number
  dueDay: number          // day of month (1–28) payment is due
  gracePeriodDays: number // extra days before OVERDUE kicks in
  currency: string        // e.g. 'MYR'
  telegramGroupId?: string
  telegramGroupTitle?: string
  inviteCode: string      // random code used in join link
  reminderMessage?: string // editable reminder text
  enforcement: EnforcementSettings
  createdAt: Date
  updatedAt: Date
}

export interface EnforcementSettings {
  mutedOverdue: boolean       // mute overdue students in Telegram
  removeAfterDays: number | null  // null = never remove
}

// ─── Student Enrollment ───────────────────────────────────────────────────────

export type PaymentStatus = 'active' | 'pending' | 'overdue' | 'restricted'

export interface Enrollment {
  id: string
  classId: string
  studentId: string
  studentName: string
  studentEmail: string
  telegramId?: string
  telegramBanned?: boolean  // true = teacher has hard-banned from Telegram group
  joinedAt: Date
  status: PaymentStatus
}

// ─── Payment Record ──────────────────────────────────────────────────────────

export type PaymentMonth = string // format: 'YYYY-MM'

export interface Payment {
  id: string
  classId: string
  studentId: string
  month: PaymentMonth
  status: PaymentStatus
  receiptUrl?: string       // Firebase Storage URL
  receiptUploadedAt?: Date
  approvedAt?: Date
  approvedBy?: string       // teacher UID
  rejectedAt?: Date
  rejectedBy?: string
  rejectionReason?: string
  overriddenBy?: string     // teacher UID for manual override
  createdAt: Date
  updatedAt: Date
}

// ─── In-app Notification ─────────────────────────────────────────────────────

export type NotificationType = 'custom' | 'approved' | 'rejected' | 'reminder'

export interface AppNotification {
  id: string
  studentId: string
  classId: string
  className: string
  message: string
  type: NotificationType
  read: boolean
  createdAt: Date
}

// ─── Reminder ────────────────────────────────────────────────────────────────

export type ReminderTrigger = 'before_due' | 'on_due' | 'overdue'

export interface ReminderLog {
  id: string
  classId: string
  studentId: string
  month: PaymentMonth
  trigger: ReminderTrigger
  sentAt: Date
  telegramMessageId?: number
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'done' | 'submitted'
// pending   = student has not acted yet
// done      = student self-marked as done (no file)
// submitted = student uploaded a file

export interface Assignment {
  id: string
  classId: string
  className: string
  teacherId: string
  title: string
  description?: string
  dueDate?: string | null   // ISO date string 'YYYY-MM-DD', null = no due date
  allowFileUpload: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AssignmentSubmission {
  id: string                // composite key: {assignmentId}_{studentId}
  assignmentId: string
  classId: string
  studentId: string
  studentName: string
  status: SubmissionStatus
  fileUrl?: string
  fileName?: string
  submittedAt?: Date
  createdAt: Date
  updatedAt: Date
}
