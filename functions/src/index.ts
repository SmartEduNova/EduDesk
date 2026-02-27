import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onSchedule }        from 'firebase-functions/v2/scheduler'
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret }      from 'firebase-functions/params'
import { initializeApp }     from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { sendMessage, muteUser, unmuteUser, kickUser, banUser, unbanUser } from './telegram'

initializeApp()
const db = getFirestore()

const TELEGRAM_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN')
const REGION = 'asia-southeast1'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus   = 'active' | 'pending' | 'overdue' | 'restricted'
type ReminderTrigger = 'before_due' | 'on_due' | 'overdue'

interface EnrollmentData {
  classId:     string
  studentId:   string
  studentName: string
  status:      PaymentStatus
  telegramId?: string
}

interface PaymentData {
  classId:          string
  studentId:        string
  month:            string
  status:           PaymentStatus
  receiptUrl?:      string
  rejectionReason?: string
}

interface ClassData {
  name:             string
  teacherId:        string
  monthlyFee:       number
  currency:         string
  dueDay:           number
  gracePeriodDays:  number
  reminderMessage?: string
  telegramGroupId?: string
  enforcement: {
    mutedOverdue:    boolean
    removeAfterDays: number | null
  }
}

interface UserData {
  displayName: string
  telegramId?: string
}

interface TelegramMessage {
  from?: { id: number; first_name: string }
  chat:  { id: number; type: 'private' | 'group' | 'supergroup' | 'channel' }
  text?: string
}

interface TelegramUpdate {
  message?: TelegramMessage
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the current Date adjusted to Malaysia time (UTC+8). */
function nowKL(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }))
}

/** Returns YYYY-MM for the current month in Malaysia time. */
function currentMonthKL(): string {
  const kl = nowKL()
  return `${kl.getFullYear()}-${String(kl.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month: string): string {
  const [year, mo] = month.split('-').map(Number)
  return new Date(year, mo - 1, 1).toLocaleDateString('en-MY', {
    month: 'long', year: 'numeric',
  })
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

// ─── 1. onPaymentWrite ────────────────────────────────────────────────────────
//  Syncs enrollment.status to payment.status and sends Telegram notifications:
//  • Teacher: notified when a student uploads a receipt
//  • Student: notified when payment is approved or rejected
//  • Group:   student is muted on overdue, unmuted on active

export const onPaymentWrite = onDocumentWritten(
  { document: 'payments/{paymentId}', region: REGION, secrets: [TELEGRAM_TOKEN] },
  async (event) => {
    const after = event.data?.after
    if (!after?.exists) return

    const before      = event.data?.before
    const payment     = after.data() as PaymentData
    const prevStatus  = before?.exists ? (before.data() as PaymentData).status    : null
    const prevReceipt = before?.exists ? (before.data() as PaymentData).receiptUrl : null
    const { classId, studentId, status } = payment
    if (!classId || !studentId || !status) return

    // ── Sync enrollment status ───────────────────────────────────────────────
    const enrollSnap = await db
      .collection('enrollments')
      .where('studentId', '==', studentId)
      .get()
    const enrollDoc = enrollSnap.docs.find(
      d => (d.data() as EnrollmentData).classId === classId
    )
    if (enrollDoc) {
      const current = (enrollDoc.data() as EnrollmentData).status
      if (current !== status) {
        await enrollDoc.ref.update({ status, updatedAt: FieldValue.serverTimestamp() })
        console.log(`[onPaymentWrite] ${enrollDoc.id}: ${current} → ${status}`)
      }
    }

    // ── Telegram ─────────────────────────────────────────────────────────────
    const token = TELEGRAM_TOKEN.value()
    if (!token) return

    const classSnap = await db.doc(`classes/${classId}`).get()
    if (!classSnap.exists) return
    const cls        = classSnap.data() as ClassData
    const enrollment = enrollDoc?.data() as EnrollmentData | undefined
    const monthLabel = formatMonth(payment.month)
    const amountStr  = formatCurrency(cls.monthlyFee, cls.currency)
    const studentTg  = enrollment?.telegramId ?? null

    // Teacher: new receipt uploaded
    if (!prevReceipt && !!payment.receiptUrl && status === 'pending') {
      const teacherSnap = await db.doc(`users/${cls.teacherId}`).get()
      const teacherTg   = teacherSnap.exists
        ? (teacherSnap.data() as UserData).telegramId ?? null
        : null
      if (teacherTg) {
        const name = enrollment?.studentName ?? 'A student'
        await sendMessage(token, teacherTg,
          `New receipt uploaded\n\n` +
          `Student: <b>${name}</b>\n` +
          `Class: <b>${cls.name}</b>\n` +
          `Month: ${monthLabel}\n` +
          `Amount: ${amountStr}\n\n` +
          `Open EduSync to review.`
        )
      }
    }

    // Student: approved
    if (prevStatus === 'pending' && status === 'active') {
      const approvedMsg =
        `Your payment for <b>${cls.name}</b> (${monthLabel}) has been approved. ` +
        `Amount: ${amountStr}. Thank you!`
      if (studentTg) {
        await sendMessage(token, studentTg,
          `✅ Payment approved!\n\nClass: <b>${cls.name}</b>\nMonth: ${monthLabel}\nAmount: ${amountStr}\n\nThank you for your payment.`
        )
      }
      // In-app notification
      await db.collection('notifications').add({
        studentId: studentId,
        classId:   classId,
        className: cls.name,
        message:   approvedMsg,
        type:      'approved',
        read:      false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    // Student: rejected
    if (prevStatus === 'pending' && status === 'overdue' && payment.rejectionReason) {
      const rejectedMsg =
        `Your payment for <b>${cls.name}</b> (${monthLabel}) was rejected. ` +
        `Reason: ${payment.rejectionReason}. Please re-upload your receipt.`
      if (studentTg) {
        await sendMessage(token, studentTg,
          `❌ Payment rejected\n\nClass: <b>${cls.name}</b>\nMonth: ${monthLabel}\nReason: ${payment.rejectionReason}\n\nPlease re-upload your receipt.`
        )
      }
      // In-app notification
      await db.collection('notifications').add({
        studentId: studentId,
        classId:   classId,
        className: cls.name,
        message:   rejectedMsg,
        type:      'rejected',
        read:      false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    // Group enforcement
    const groupId  = cls.telegramGroupId
    const studentN = studentTg ? Number(studentTg) : null
    if (groupId && studentN) {
      if (status === 'overdue' && prevStatus !== 'overdue' && cls.enforcement.mutedOverdue) {
        await muteUser(token, groupId, studentN)
      }
      if (status === 'active' && (prevStatus === 'overdue' || prevStatus === 'restricted')) {
        await unmuteUser(token, groupId, studentN)
      }
    }
  }
)

// ─── 2. dailyStatusSync ───────────────────────────────────────────────────────
//  Runs 00:05 AM MYT. Syncs every enrollment's status to its current-month
//  payment. Also kicks students from Telegram group after removeAfterDays.

export const dailyStatusSync = onSchedule(
  { schedule: '5 0 * * *', timeZone: 'Asia/Kuala_Lumpur', region: REGION, secrets: [TELEGRAM_TOKEN] },
  async () => {
    const kl       = nowKL()
    const year     = kl.getFullYear()
    const monthNum = kl.getMonth()
    const month    = currentMonthKL()
    const token    = TELEGRAM_TOKEN.value()

    console.log(`[dailyStatusSync] month=${month}`)
    const classesSnap = await db.collection('classes').get()
    let updated = 0

    for (const classDoc of classesSnap.docs) {
      const cls = classDoc.data() as ClassData

      const enrollmentsSnap = await db
        .collection('enrollments')
        .where('classId', '==', classDoc.id)
        .get()
      if (enrollmentsSnap.empty) continue

      const paymentRefs  = enrollmentsSnap.docs.map(e =>
        db.doc(`payments/${classDoc.id}_${(e.data() as EnrollmentData).studentId}_${month}`)
      )
      const paymentSnaps = await db.getAll(...paymentRefs)
      const paymentMap   = new Map<string, PaymentStatus>()
      for (const snap of paymentSnaps) {
        if (snap.exists) paymentMap.set(snap.id, (snap.data() as PaymentData).status)
      }

      const overdueDate = new Date(year, monthNum, cls.dueDay + cls.gracePeriodDays)
      const removeDate  = cls.enforcement.removeAfterDays !== null
        ? new Date(year, monthNum, cls.dueDay + cls.gracePeriodDays + cls.enforcement.removeAfterDays)
        : null

      const writes: Promise<unknown>[] = []

      for (const enrollDoc of enrollmentsSnap.docs) {
        const enrollment = enrollDoc.data() as EnrollmentData
        if (enrollment.status === 'restricted') continue

        const paymentId    = `${classDoc.id}_${enrollment.studentId}_${month}`
        const paymentStatus = paymentMap.get(paymentId)
        const targetStatus: PaymentStatus = paymentStatus
          ?? (kl > overdueDate ? 'overdue' : 'overdue')

        if (enrollment.status !== targetStatus) {
          writes.push(
            enrollDoc.ref.update({ status: targetStatus, updatedAt: FieldValue.serverTimestamp() })
          )
          updated++
        }

        // Kick from group if overdue past removeAfterDays
        if (
          token && cls.telegramGroupId && enrollment.telegramId &&
          removeDate && kl >= removeDate &&
          targetStatus === 'overdue' && !paymentStatus
        ) {
          await kickUser(token, cls.telegramGroupId, Number(enrollment.telegramId))
          console.log(`[dailyStatusSync] kicked ${enrollment.studentId} from ${classDoc.id}`)
        }
      }

      await Promise.all(writes)
    }

    console.log(`[dailyStatusSync] ${classesSnap.size} classes, ${updated} updated`)
  }
)

// ─── 3. scheduledReminders ────────────────────────────────────────────────────
//  Runs 09:00 AM MYT. Sends payment reminders to students via Telegram:
//  • 3 days before due → 'before_due'
//  • On due date       → 'on_due'
//  • Day after grace   → 'overdue'
//  Uses reminderLogs collection to prevent duplicate sends.

export const scheduledReminders = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Kuala_Lumpur', region: REGION, secrets: [TELEGRAM_TOKEN] },
  async () => {
    const token = TELEGRAM_TOKEN.value()
    if (!token) return

    const kl       = nowKL()
    const year     = kl.getFullYear()
    const monthNum = kl.getMonth()
    const month    = currentMonthKL()

    console.log(`[scheduledReminders] ${kl.toDateString()}`)
    const classesSnap = await db.collection('classes').get()

    for (const classDoc of classesSnap.docs) {
      const cls = classDoc.data() as ClassData

      const dueDate      = new Date(year, monthNum, cls.dueDay)
      const beforeDue3   = new Date(year, monthNum, cls.dueDay - 3)
      const overdueStart = new Date(year, monthNum, cls.dueDay + cls.gracePeriodDays + 1)

      let trigger: ReminderTrigger | null = null
      if      (sameDay(kl, beforeDue3))   trigger = 'before_due'
      else if (sameDay(kl, dueDate))      trigger = 'on_due'
      else if (sameDay(kl, overdueStart)) trigger = 'overdue'
      if (!trigger) continue

      const enrollmentsSnap = await db
        .collection('enrollments')
        .where('classId', '==', classDoc.id)
        .get()
      if (enrollmentsSnap.empty) continue

      for (const enrollDoc of enrollmentsSnap.docs) {
        const enrollment = enrollDoc.data() as EnrollmentData
        if (enrollment.status === 'active' || enrollment.status === 'restricted') continue

        // Check dedup log
        const logId   = `${classDoc.id}_${enrollment.studentId}_${month}_${trigger}`
        const logSnap = await db.doc(`reminderLogs/${logId}`).get()
        if (logSnap.exists) continue

        const name     = enrollment.studentName
        const amount   = formatCurrency(cls.monthlyFee, cls.currency)
        const monthLbl = formatMonth(month)
        const custom   = cls.reminderMessage ?? ''

        let text: string
        if (trigger === 'before_due') {
          text =
            `Hi ${name}! Reminder: your ${cls.name} tuition of ${amount} ` +
            `for ${monthLbl} is due in 3 days. ` +
            (custom || 'Please make your payment on time.')
        } else if (trigger === 'on_due') {
          text =
            `Hi ${name}! Your ${cls.name} tuition of ${amount} ` +
            `for ${monthLbl} is due today. ` +
            (custom || 'Please make your payment now.')
        } else {
          text =
            `Hi ${name}! Your ${cls.name} tuition of ${amount} ` +
            `for ${monthLbl} is overdue. ` +
            (custom || 'Please pay immediately to avoid further action.')
        }

        // Always write in-app notification
        await db.collection('notifications').add({
          studentId: enrollment.studentId,
          classId:   classDoc.id,
          className: cls.name,
          message:   text,
          type:      'reminder',
          read:      false,
          createdAt: FieldValue.serverTimestamp(),
        })

        // Telegram only if linked
        if (enrollment.telegramId) {
          await sendMessage(token, enrollment.telegramId, text)
        }

        await db.doc(`reminderLogs/${logId}`).set({
          classId: classDoc.id, studentId: enrollment.studentId,
          month, trigger, sentAt: FieldValue.serverTimestamp(),
        })
      }
    }

    console.log(`[scheduledReminders] done`)
  }
)

// ─── 4. telegramWebhook ───────────────────────────────────────────────────────
//  HTTP endpoint for Telegram bot updates.
//  /start  → replies with the user's Telegram ID (for linking in EduSync)
//  /status → shows current-month payment status across all classes

export const telegramWebhook = onRequest(
  { region: REGION, secrets: [TELEGRAM_TOKEN] },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return }

    const token = TELEGRAM_TOKEN.value()
    if (!token) { res.status(200).send('ok'); return }

    const update  = req.body as TelegramUpdate
    const message = update.message
    if (!message?.text) { res.status(200).send('ok'); return }

    const chatId    = message.chat.id
    const chatType  = message.chat.type
    const fromId    = message.from?.id
    const text      = message.text.trim()
    const isPrivate = chatType === 'private'

    // Ignore non-command messages entirely (avoids spamming groups)
    if (!text.startsWith('/')) { res.status(200).send('ok'); return }

    try {
      if (text.startsWith('/start') && isPrivate) {
        await sendMessage(token, chatId,
          `Welcome to <b>EduSync</b>!\n\n` +
          `Your Telegram ID is: <code>${fromId}</code>\n\n` +
          `Copy this number and paste it in your EduSync profile ` +
          `under <b>Telegram</b> to receive payment reminders.\n\n` +
          `Use /status to check your payment status.`
        )
      } else if (text.startsWith('/status') && fromId && isPrivate) {
        await handleStatusCommand(token, chatId, fromId)
      } else if (isPrivate) {
        await sendMessage(token, chatId,
          `Commands:\n/start — get your Telegram ID\n/status — check payment status`
        )
      }
    } catch (e) {
      console.error('[telegramWebhook]', e)
    }

    res.status(200).send('ok')
  }
)

// ─── 5. sendClassNotification ─────────────────────────────────────────────────
//  Callable. Teacher sends a custom message to all enrolled students NOW.
//  Replaces {name}, {fee}, {dueDate} placeholders before delivery.

export const sendClassNotification = onCall(
  { region: REGION, secrets: [TELEGRAM_TOKEN] },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in')

    const { classId, message } = request.data as { classId: string; message: string }
    if (!classId || !message?.trim()) {
      throw new HttpsError('invalid-argument', 'classId and message are required')
    }

    const classSnap = await db.doc(`classes/${classId}`).get()
    if (!classSnap.exists) throw new HttpsError('not-found', 'Class not found')
    const cls = classSnap.data() as ClassData
    if (cls.teacherId !== uid) throw new HttpsError('permission-denied', 'Not your class')

    const token = TELEGRAM_TOKEN.value()
    if (!token) throw new HttpsError('internal', 'Bot token not configured')

    const kl         = nowKL()
    const monthLabel = kl.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
    const feeStr     = formatCurrency(cls.monthlyFee, cls.currency)
    const dueDateStr = `${cls.dueDay} ${monthLabel}`

    const enrollmentsSnap = await db
      .collection('enrollments')
      .where('classId', '==', classId)
      .get()

    let sent    = 0
    let skipped = 0

    if (!enrollmentsSnap.empty) {
      // Batch-read user profiles to get the live telegramId (enrollment doc
      // only captures telegramId at join time — students may link later).
      const userRefs  = enrollmentsSnap.docs.map(d =>
        db.doc(`users/${(d.data() as EnrollmentData).studentId}`)
      )
      const userSnaps = await db.getAll(...userRefs)
      const telegramMap = new Map<string, string>()
      for (const snap of userSnaps) {
        const tid = (snap.data() as UserData | undefined)?.telegramId
        if (tid) telegramMap.set(snap.id, tid)
      }

      const notifBatch = db.batch()

      for (const enrollDoc of enrollmentsSnap.docs) {
        const e    = enrollDoc.data() as EnrollmentData
        const text = message
          .replace(/{name}/g,    e.studentName)
          .replace(/{fee}/g,     feeStr)
          .replace(/{dueDate}/g, dueDateStr)

        // Always write in-app notification for ALL enrolled students
        notifBatch.set(db.collection('notifications').doc(), {
          studentId: e.studentId,
          classId,
          className: cls.name,
          message:   text,
          type:      'custom',
          read:      false,
          createdAt: FieldValue.serverTimestamp(),
        })

        // Telegram only for students who have linked their ID
        const telegramId = telegramMap.get(e.studentId)
        if (!telegramId) { skipped++; continue }
        await sendMessage(token, telegramId, text)
        sent++
      }

      await notifBatch.commit()
    }

    console.log(`[sendClassNotification] classId=${classId} sent=${sent} skipped=${skipped}`)
    return { sent, skipped }
  }
)

// ─── 6. manageGroupMember ─────────────────────────────────────────────────────
//  Callable. Teacher manually mutes, unmutes, kicks, bans, or unbans a student
//  from the class Telegram group. ban/unban also updates telegramBanned on the
//  enrollment document so the UI can reflect current state.

type GroupAction = 'mute' | 'unmute' | 'kick' | 'ban' | 'unban'

export const manageGroupMember = onCall(
  { region: REGION, secrets: [TELEGRAM_TOKEN] },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in')

    const { classId, studentId, action } = request.data as {
      classId:   string
      studentId: string
      action:    GroupAction
    }
    if (!classId || !studentId || !action) {
      throw new HttpsError('invalid-argument', 'classId, studentId and action are required')
    }

    const classSnap = await db.doc(`classes/${classId}`).get()
    if (!classSnap.exists) throw new HttpsError('not-found', 'Class not found')
    const cls = classSnap.data() as ClassData
    if (cls.teacherId !== uid)   throw new HttpsError('permission-denied', 'Not your class')
    if (!cls.telegramGroupId)    throw new HttpsError('failed-precondition', 'No Telegram group configured for this class')

    const token = TELEGRAM_TOKEN.value()
    if (!token) throw new HttpsError('internal', 'Bot token not configured')

    // Get the student's current telegramId from their user profile
    const userSnap    = await db.doc(`users/${studentId}`).get()
    const studentData = userSnap.data() as UserData | undefined
    if (!studentData?.telegramId) {
      throw new HttpsError('failed-precondition', 'Student has not linked a Telegram account')
    }
    const tgUserId = Number(studentData.telegramId)

    // Find the enrollment doc to update telegramBanned for ban/unban
    const enrollSnap = await db
      .collection('enrollments')
      .where('studentId', '==', studentId)
      .get()
    const enrollDoc = enrollSnap.docs.find(
      d => (d.data() as EnrollmentData).classId === classId
    )

    switch (action) {
      case 'mute':
        await muteUser(token, cls.telegramGroupId, tgUserId)
        break

      case 'unmute':
        await unmuteUser(token, cls.telegramGroupId, tgUserId)
        break

      case 'kick':
        await kickUser(token, cls.telegramGroupId, tgUserId)
        break

      case 'ban':
        await banUser(token, cls.telegramGroupId, tgUserId)
        if (enrollDoc) {
          await enrollDoc.ref.update({
            telegramBanned: true,
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
        break

      case 'unban':
        await unbanUser(token, cls.telegramGroupId, tgUserId)
        if (enrollDoc) {
          await enrollDoc.ref.update({
            telegramBanned: false,
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
        break
    }

    console.log(`[manageGroupMember] classId=${classId} studentId=${studentId} action=${action}`)
    return { success: true }
  }
)

// ─── Private helpers ──────────────────────────────────────────────────────────

async function handleStatusCommand(
  token: string,
  chatId: number,
  fromId: number
): Promise<void> {
  const usersSnap = await db
    .collection('users')
    .where('telegramId', '==', String(fromId))
    .limit(1)
    .get()

  if (usersSnap.empty) {
    await sendMessage(token, chatId,
      `Telegram not linked.\n\n` +
      `Open EduSync, go to Profile → Telegram, and paste your ID ` +
      `(<code>${fromId}</code>) to link your account.`
    )
    return
  }

  const uid   = usersSnap.docs[0].id
  const month = currentMonthKL()

  const enrollmentsSnap = await db
    .collection('enrollments')
    .where('studentId', '==', uid)
    .get()

  if (enrollmentsSnap.empty) {
    await sendMessage(token, chatId, `You are not enrolled in any classes yet.`)
    return
  }

  const classRefs   = enrollmentsSnap.docs.map(e =>
    db.doc(`classes/${(e.data() as EnrollmentData).classId}`)
  )
  const paymentRefs = enrollmentsSnap.docs.map(e =>
    db.doc(`payments/${(e.data() as EnrollmentData).classId}_${uid}_${month}`)
  )

  const classSnaps   = await db.getAll(...classRefs)
  const paymentSnaps = await db.getAll(...paymentRefs)

  const classMap   = new Map(classSnaps.map(s => [s.id, s.exists ? s.data() as ClassData : null]))
  const paymentMap = new Map(
    paymentSnaps.map(s => [s.id, s.exists ? (s.data() as PaymentData).status : null])
  )

  const emoji: Record<PaymentStatus, string> = {
    active: '✅', pending: '⏳', overdue: '❌', restricted: '🚫',
  }

  const lines: string[] = [`<b>Payment Status — ${formatMonth(month)}</b>\n`]
  for (const enrollDoc of enrollmentsSnap.docs) {
    const e   = enrollDoc.data() as EnrollmentData
    const cls = classMap.get(e.classId)
    if (!cls) continue
    const pid = `${e.classId}_${uid}_${month}`
    const st  = (paymentMap.get(pid) ?? 'overdue') as PaymentStatus
    lines.push(`${emoji[st]} <b>${cls.name}</b>: ${st.toUpperCase()}`)
  }

  await sendMessage(token, chatId, lines.join('\n'))
}
