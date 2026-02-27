"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageGroupMember = exports.sendClassNotification = exports.telegramWebhook = exports.scheduledReminders = exports.dailyStatusSync = exports.onPaymentWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const telegram_1 = require("./telegram");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const TELEGRAM_TOKEN = (0, params_1.defineSecret)('TELEGRAM_BOT_TOKEN');
const REGION = 'asia-southeast1';
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Returns the current Date adjusted to Malaysia time (UTC+8). */
function nowKL() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
}
/** Returns YYYY-MM for the current month in Malaysia time. */
function currentMonthKL() {
    const kl = nowKL();
    return `${kl.getFullYear()}-${String(kl.getMonth() + 1).padStart(2, '0')}`;
}
function formatMonth(month) {
    const [year, mo] = month.split('-').map(Number);
    return new Date(year, mo - 1, 1).toLocaleDateString('en-MY', {
        month: 'long', year: 'numeric',
    });
}
function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-MY', {
        style: 'currency', currency, minimumFractionDigits: 2,
    }).format(amount);
}
function sameDay(a, b) {
    return (a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate());
}
// ─── 1. onPaymentWrite ────────────────────────────────────────────────────────
//  Syncs enrollment.status to payment.status and sends Telegram notifications:
//  • Teacher: notified when a student uploads a receipt
//  • Student: notified when payment is approved or rejected
//  • Group:   student is muted on overdue, unmuted on active
exports.onPaymentWrite = (0, firestore_1.onDocumentWritten)({ document: 'payments/{paymentId}', region: REGION, secrets: [TELEGRAM_TOKEN] }, async (event) => {
    var _a, _b, _c, _d, _e;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after;
    if (!(after === null || after === void 0 ? void 0 : after.exists))
        return;
    const before = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before;
    const payment = after.data();
    const prevStatus = (before === null || before === void 0 ? void 0 : before.exists) ? before.data().status : null;
    const prevReceipt = (before === null || before === void 0 ? void 0 : before.exists) ? before.data().receiptUrl : null;
    const { classId, studentId, status } = payment;
    if (!classId || !studentId || !status)
        return;
    // ── Sync enrollment status ───────────────────────────────────────────────
    const enrollSnap = await db
        .collection('enrollments')
        .where('studentId', '==', studentId)
        .get();
    const enrollDoc = enrollSnap.docs.find(d => d.data().classId === classId);
    if (enrollDoc) {
        const current = enrollDoc.data().status;
        if (current !== status) {
            await enrollDoc.ref.update({ status, updatedAt: firestore_2.FieldValue.serverTimestamp() });
            console.log(`[onPaymentWrite] ${enrollDoc.id}: ${current} → ${status}`);
        }
    }
    // ── Telegram ─────────────────────────────────────────────────────────────
    const token = TELEGRAM_TOKEN.value();
    if (!token)
        return;
    const classSnap = await db.doc(`classes/${classId}`).get();
    if (!classSnap.exists)
        return;
    const cls = classSnap.data();
    const enrollment = enrollDoc === null || enrollDoc === void 0 ? void 0 : enrollDoc.data();
    const monthLabel = formatMonth(payment.month);
    const amountStr = formatCurrency(cls.monthlyFee, cls.currency);
    const studentTg = (_c = enrollment === null || enrollment === void 0 ? void 0 : enrollment.telegramId) !== null && _c !== void 0 ? _c : null;
    // Teacher: new receipt uploaded
    if (!prevReceipt && !!payment.receiptUrl && status === 'pending') {
        const teacherSnap = await db.doc(`users/${cls.teacherId}`).get();
        const teacherTg = teacherSnap.exists
            ? (_d = teacherSnap.data().telegramId) !== null && _d !== void 0 ? _d : null
            : null;
        if (teacherTg) {
            const name = (_e = enrollment === null || enrollment === void 0 ? void 0 : enrollment.studentName) !== null && _e !== void 0 ? _e : 'A student';
            await (0, telegram_1.sendMessage)(token, teacherTg, `New receipt uploaded\n\n` +
                `Student: <b>${name}</b>\n` +
                `Class: <b>${cls.name}</b>\n` +
                `Month: ${monthLabel}\n` +
                `Amount: ${amountStr}\n\n` +
                `Open EduSync to review.`);
        }
    }
    // Student: approved
    if (prevStatus === 'pending' && status === 'active') {
        const approvedMsg = `Your payment for <b>${cls.name}</b> (${monthLabel}) has been approved. ` +
            `Amount: ${amountStr}. Thank you!`;
        if (studentTg) {
            await (0, telegram_1.sendMessage)(token, studentTg, `✅ Payment approved!\n\nClass: <b>${cls.name}</b>\nMonth: ${monthLabel}\nAmount: ${amountStr}\n\nThank you for your payment.`);
        }
        // In-app notification
        await db.collection('notifications').add({
            studentId: studentId,
            classId: classId,
            className: cls.name,
            message: approvedMsg,
            type: 'approved',
            read: false,
            createdAt: firestore_2.FieldValue.serverTimestamp(),
        });
    }
    // Student: rejected
    if (prevStatus === 'pending' && status === 'overdue' && payment.rejectionReason) {
        const rejectedMsg = `Your payment for <b>${cls.name}</b> (${monthLabel}) was rejected. ` +
            `Reason: ${payment.rejectionReason}. Please re-upload your receipt.`;
        if (studentTg) {
            await (0, telegram_1.sendMessage)(token, studentTg, `❌ Payment rejected\n\nClass: <b>${cls.name}</b>\nMonth: ${monthLabel}\nReason: ${payment.rejectionReason}\n\nPlease re-upload your receipt.`);
        }
        // In-app notification
        await db.collection('notifications').add({
            studentId: studentId,
            classId: classId,
            className: cls.name,
            message: rejectedMsg,
            type: 'rejected',
            read: false,
            createdAt: firestore_2.FieldValue.serverTimestamp(),
        });
    }
    // Group enforcement
    const groupId = cls.telegramGroupId;
    const studentN = studentTg ? Number(studentTg) : null;
    if (groupId && studentN) {
        if (status === 'overdue' && prevStatus !== 'overdue' && cls.enforcement.mutedOverdue) {
            await (0, telegram_1.muteUser)(token, groupId, studentN);
        }
        if (status === 'active' && (prevStatus === 'overdue' || prevStatus === 'restricted')) {
            await (0, telegram_1.unmuteUser)(token, groupId, studentN);
        }
    }
});
// ─── 2. dailyStatusSync ───────────────────────────────────────────────────────
//  Runs 00:05 AM MYT. Syncs every enrollment's status to its current-month
//  payment. Also kicks students from Telegram group after removeAfterDays.
exports.dailyStatusSync = (0, scheduler_1.onSchedule)({ schedule: '5 0 * * *', timeZone: 'Asia/Kuala_Lumpur', region: REGION, secrets: [TELEGRAM_TOKEN] }, async () => {
    const kl = nowKL();
    const year = kl.getFullYear();
    const monthNum = kl.getMonth();
    const month = currentMonthKL();
    const token = TELEGRAM_TOKEN.value();
    console.log(`[dailyStatusSync] month=${month}`);
    const classesSnap = await db.collection('classes').get();
    let updated = 0;
    for (const classDoc of classesSnap.docs) {
        const cls = classDoc.data();
        const enrollmentsSnap = await db
            .collection('enrollments')
            .where('classId', '==', classDoc.id)
            .get();
        if (enrollmentsSnap.empty)
            continue;
        const paymentRefs = enrollmentsSnap.docs.map(e => db.doc(`payments/${classDoc.id}_${e.data().studentId}_${month}`));
        const paymentSnaps = await db.getAll(...paymentRefs);
        const paymentMap = new Map();
        for (const snap of paymentSnaps) {
            if (snap.exists)
                paymentMap.set(snap.id, snap.data().status);
        }
        const overdueDate = new Date(year, monthNum, cls.dueDay + cls.gracePeriodDays);
        const removeDate = cls.enforcement.removeAfterDays !== null
            ? new Date(year, monthNum, cls.dueDay + cls.gracePeriodDays + cls.enforcement.removeAfterDays)
            : null;
        const writes = [];
        for (const enrollDoc of enrollmentsSnap.docs) {
            const enrollment = enrollDoc.data();
            if (enrollment.status === 'restricted')
                continue;
            const paymentId = `${classDoc.id}_${enrollment.studentId}_${month}`;
            const paymentStatus = paymentMap.get(paymentId);
            const targetStatus = paymentStatus !== null && paymentStatus !== void 0 ? paymentStatus : (kl > overdueDate ? 'overdue' : 'overdue');
            if (enrollment.status !== targetStatus) {
                writes.push(enrollDoc.ref.update({ status: targetStatus, updatedAt: firestore_2.FieldValue.serverTimestamp() }));
                updated++;
            }
            // Kick from group if overdue past removeAfterDays
            if (token && cls.telegramGroupId && enrollment.telegramId &&
                removeDate && kl >= removeDate &&
                targetStatus === 'overdue' && !paymentStatus) {
                await (0, telegram_1.kickUser)(token, cls.telegramGroupId, Number(enrollment.telegramId));
                console.log(`[dailyStatusSync] kicked ${enrollment.studentId} from ${classDoc.id}`);
            }
        }
        await Promise.all(writes);
    }
    console.log(`[dailyStatusSync] ${classesSnap.size} classes, ${updated} updated`);
});
// ─── 3. scheduledReminders ────────────────────────────────────────────────────
//  Runs 09:00 AM MYT. Sends payment reminders to students via Telegram:
//  • 3 days before due → 'before_due'
//  • On due date       → 'on_due'
//  • Day after grace   → 'overdue'
//  Uses reminderLogs collection to prevent duplicate sends.
exports.scheduledReminders = (0, scheduler_1.onSchedule)({ schedule: '0 9 * * *', timeZone: 'Asia/Kuala_Lumpur', region: REGION, secrets: [TELEGRAM_TOKEN] }, async () => {
    var _a;
    const token = TELEGRAM_TOKEN.value();
    if (!token)
        return;
    const kl = nowKL();
    const year = kl.getFullYear();
    const monthNum = kl.getMonth();
    const month = currentMonthKL();
    console.log(`[scheduledReminders] ${kl.toDateString()}`);
    const classesSnap = await db.collection('classes').get();
    for (const classDoc of classesSnap.docs) {
        const cls = classDoc.data();
        const dueDate = new Date(year, monthNum, cls.dueDay);
        const beforeDue3 = new Date(year, monthNum, cls.dueDay - 3);
        const overdueStart = new Date(year, monthNum, cls.dueDay + cls.gracePeriodDays + 1);
        let trigger = null;
        if (sameDay(kl, beforeDue3))
            trigger = 'before_due';
        else if (sameDay(kl, dueDate))
            trigger = 'on_due';
        else if (sameDay(kl, overdueStart))
            trigger = 'overdue';
        if (!trigger)
            continue;
        const enrollmentsSnap = await db
            .collection('enrollments')
            .where('classId', '==', classDoc.id)
            .get();
        if (enrollmentsSnap.empty)
            continue;
        for (const enrollDoc of enrollmentsSnap.docs) {
            const enrollment = enrollDoc.data();
            if (enrollment.status === 'active' || enrollment.status === 'restricted')
                continue;
            // Check dedup log
            const logId = `${classDoc.id}_${enrollment.studentId}_${month}_${trigger}`;
            const logSnap = await db.doc(`reminderLogs/${logId}`).get();
            if (logSnap.exists)
                continue;
            const name = enrollment.studentName;
            const amount = formatCurrency(cls.monthlyFee, cls.currency);
            const monthLbl = formatMonth(month);
            const custom = (_a = cls.reminderMessage) !== null && _a !== void 0 ? _a : '';
            let text;
            if (trigger === 'before_due') {
                text =
                    `Hi ${name}! Reminder: your ${cls.name} tuition of ${amount} ` +
                        `for ${monthLbl} is due in 3 days. ` +
                        (custom || 'Please make your payment on time.');
            }
            else if (trigger === 'on_due') {
                text =
                    `Hi ${name}! Your ${cls.name} tuition of ${amount} ` +
                        `for ${monthLbl} is due today. ` +
                        (custom || 'Please make your payment now.');
            }
            else {
                text =
                    `Hi ${name}! Your ${cls.name} tuition of ${amount} ` +
                        `for ${monthLbl} is overdue. ` +
                        (custom || 'Please pay immediately to avoid further action.');
            }
            // Always write in-app notification
            await db.collection('notifications').add({
                studentId: enrollment.studentId,
                classId: classDoc.id,
                className: cls.name,
                message: text,
                type: 'reminder',
                read: false,
                createdAt: firestore_2.FieldValue.serverTimestamp(),
            });
            // Telegram only if linked
            if (enrollment.telegramId) {
                await (0, telegram_1.sendMessage)(token, enrollment.telegramId, text);
            }
            await db.doc(`reminderLogs/${logId}`).set({
                classId: classDoc.id, studentId: enrollment.studentId,
                month, trigger, sentAt: firestore_2.FieldValue.serverTimestamp(),
            });
        }
    }
    console.log(`[scheduledReminders] done`);
});
// ─── 4. telegramWebhook ───────────────────────────────────────────────────────
//  HTTP endpoint for Telegram bot updates.
//  /start  → replies with the user's Telegram ID (for linking in EduSync)
//  /status → shows current-month payment status across all classes
exports.telegramWebhook = (0, https_1.onRequest)({ region: REGION, secrets: [TELEGRAM_TOKEN] }, async (req, res) => {
    var _a;
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const token = TELEGRAM_TOKEN.value();
    if (!token) {
        res.status(200).send('ok');
        return;
    }
    const update = req.body;
    const message = update.message;
    if (!(message === null || message === void 0 ? void 0 : message.text)) {
        res.status(200).send('ok');
        return;
    }
    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const fromId = (_a = message.from) === null || _a === void 0 ? void 0 : _a.id;
    const text = message.text.trim();
    const isPrivate = chatType === 'private';
    // Ignore non-command messages entirely (avoids spamming groups)
    if (!text.startsWith('/')) {
        res.status(200).send('ok');
        return;
    }
    try {
        if (text.startsWith('/start') && isPrivate) {
            await (0, telegram_1.sendMessage)(token, chatId, `Welcome to <b>EduSync</b>!\n\n` +
                `Your Telegram ID is: <code>${fromId}</code>\n\n` +
                `Copy this number and paste it in your EduSync profile ` +
                `under <b>Telegram</b> to receive payment reminders.\n\n` +
                `Use /status to check your payment status.`);
        }
        else if (text.startsWith('/status') && fromId && isPrivate) {
            await handleStatusCommand(token, chatId, fromId);
        }
        else if (isPrivate) {
            await (0, telegram_1.sendMessage)(token, chatId, `Commands:\n/start — get your Telegram ID\n/status — check payment status`);
        }
    }
    catch (e) {
        console.error('[telegramWebhook]', e);
    }
    res.status(200).send('ok');
});
// ─── 5. sendClassNotification ─────────────────────────────────────────────────
//  Callable. Teacher sends a custom message to all enrolled students NOW.
//  Replaces {name}, {fee}, {dueDate} placeholders before delivery.
exports.sendClassNotification = (0, https_1.onCall)({ region: REGION, secrets: [TELEGRAM_TOKEN] }, async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const { classId, message } = request.data;
    if (!classId || !(message === null || message === void 0 ? void 0 : message.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'classId and message are required');
    }
    const classSnap = await db.doc(`classes/${classId}`).get();
    if (!classSnap.exists)
        throw new https_1.HttpsError('not-found', 'Class not found');
    const cls = classSnap.data();
    if (cls.teacherId !== uid)
        throw new https_1.HttpsError('permission-denied', 'Not your class');
    const token = TELEGRAM_TOKEN.value();
    if (!token)
        throw new https_1.HttpsError('internal', 'Bot token not configured');
    const kl = nowKL();
    const monthLabel = kl.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    const feeStr = formatCurrency(cls.monthlyFee, cls.currency);
    const dueDateStr = `${cls.dueDay} ${monthLabel}`;
    const enrollmentsSnap = await db
        .collection('enrollments')
        .where('classId', '==', classId)
        .get();
    let sent = 0;
    let skipped = 0;
    if (!enrollmentsSnap.empty) {
        // Batch-read user profiles to get the live telegramId (enrollment doc
        // only captures telegramId at join time — students may link later).
        const userRefs = enrollmentsSnap.docs.map(d => db.doc(`users/${d.data().studentId}`));
        const userSnaps = await db.getAll(...userRefs);
        const telegramMap = new Map();
        for (const snap of userSnaps) {
            const tid = (_b = snap.data()) === null || _b === void 0 ? void 0 : _b.telegramId;
            if (tid)
                telegramMap.set(snap.id, tid);
        }
        const notifBatch = db.batch();
        for (const enrollDoc of enrollmentsSnap.docs) {
            const e = enrollDoc.data();
            const text = message
                .replace(/{name}/g, e.studentName)
                .replace(/{fee}/g, feeStr)
                .replace(/{dueDate}/g, dueDateStr);
            // Always write in-app notification for ALL enrolled students
            notifBatch.set(db.collection('notifications').doc(), {
                studentId: e.studentId,
                classId,
                className: cls.name,
                message: text,
                type: 'custom',
                read: false,
                createdAt: firestore_2.FieldValue.serverTimestamp(),
            });
            // Telegram only for students who have linked their ID
            const telegramId = telegramMap.get(e.studentId);
            if (!telegramId) {
                skipped++;
                continue;
            }
            await (0, telegram_1.sendMessage)(token, telegramId, text);
            sent++;
        }
        await notifBatch.commit();
    }
    console.log(`[sendClassNotification] classId=${classId} sent=${sent} skipped=${skipped}`);
    return { sent, skipped };
});
exports.manageGroupMember = (0, https_1.onCall)({ region: REGION, secrets: [TELEGRAM_TOKEN] }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const { classId, studentId, action } = request.data;
    if (!classId || !studentId || !action) {
        throw new https_1.HttpsError('invalid-argument', 'classId, studentId and action are required');
    }
    const classSnap = await db.doc(`classes/${classId}`).get();
    if (!classSnap.exists)
        throw new https_1.HttpsError('not-found', 'Class not found');
    const cls = classSnap.data();
    if (cls.teacherId !== uid)
        throw new https_1.HttpsError('permission-denied', 'Not your class');
    if (!cls.telegramGroupId)
        throw new https_1.HttpsError('failed-precondition', 'No Telegram group configured for this class');
    const token = TELEGRAM_TOKEN.value();
    if (!token)
        throw new https_1.HttpsError('internal', 'Bot token not configured');
    // Get the student's current telegramId from their user profile
    const userSnap = await db.doc(`users/${studentId}`).get();
    const studentData = userSnap.data();
    if (!(studentData === null || studentData === void 0 ? void 0 : studentData.telegramId)) {
        throw new https_1.HttpsError('failed-precondition', 'Student has not linked a Telegram account');
    }
    const tgUserId = Number(studentData.telegramId);
    // Find the enrollment doc to update telegramBanned for ban/unban
    const enrollSnap = await db
        .collection('enrollments')
        .where('studentId', '==', studentId)
        .get();
    const enrollDoc = enrollSnap.docs.find(d => d.data().classId === classId);
    switch (action) {
        case 'mute':
            await (0, telegram_1.muteUser)(token, cls.telegramGroupId, tgUserId);
            break;
        case 'unmute':
            await (0, telegram_1.unmuteUser)(token, cls.telegramGroupId, tgUserId);
            break;
        case 'kick':
            await (0, telegram_1.kickUser)(token, cls.telegramGroupId, tgUserId);
            break;
        case 'ban':
            await (0, telegram_1.banUser)(token, cls.telegramGroupId, tgUserId);
            if (enrollDoc) {
                await enrollDoc.ref.update({
                    telegramBanned: true,
                    updatedAt: firestore_2.FieldValue.serverTimestamp(),
                });
            }
            break;
        case 'unban':
            await (0, telegram_1.unbanUser)(token, cls.telegramGroupId, tgUserId);
            if (enrollDoc) {
                await enrollDoc.ref.update({
                    telegramBanned: false,
                    updatedAt: firestore_2.FieldValue.serverTimestamp(),
                });
            }
            break;
    }
    console.log(`[manageGroupMember] classId=${classId} studentId=${studentId} action=${action}`);
    return { success: true };
});
// ─── Private helpers ──────────────────────────────────────────────────────────
async function handleStatusCommand(token, chatId, fromId) {
    var _a;
    const usersSnap = await db
        .collection('users')
        .where('telegramId', '==', String(fromId))
        .limit(1)
        .get();
    if (usersSnap.empty) {
        await (0, telegram_1.sendMessage)(token, chatId, `Telegram not linked.\n\n` +
            `Open EduSync, go to Profile → Telegram, and paste your ID ` +
            `(<code>${fromId}</code>) to link your account.`);
        return;
    }
    const uid = usersSnap.docs[0].id;
    const month = currentMonthKL();
    const enrollmentsSnap = await db
        .collection('enrollments')
        .where('studentId', '==', uid)
        .get();
    if (enrollmentsSnap.empty) {
        await (0, telegram_1.sendMessage)(token, chatId, `You are not enrolled in any classes yet.`);
        return;
    }
    const classRefs = enrollmentsSnap.docs.map(e => db.doc(`classes/${e.data().classId}`));
    const paymentRefs = enrollmentsSnap.docs.map(e => db.doc(`payments/${e.data().classId}_${uid}_${month}`));
    const classSnaps = await db.getAll(...classRefs);
    const paymentSnaps = await db.getAll(...paymentRefs);
    const classMap = new Map(classSnaps.map(s => [s.id, s.exists ? s.data() : null]));
    const paymentMap = new Map(paymentSnaps.map(s => [s.id, s.exists ? s.data().status : null]));
    const emoji = {
        active: '✅', pending: '⏳', overdue: '❌', restricted: '🚫',
    };
    const lines = [`<b>Payment Status — ${formatMonth(month)}</b>\n`];
    for (const enrollDoc of enrollmentsSnap.docs) {
        const e = enrollDoc.data();
        const cls = classMap.get(e.classId);
        if (!cls)
            continue;
        const pid = `${e.classId}_${uid}_${month}`;
        const st = ((_a = paymentMap.get(pid)) !== null && _a !== void 0 ? _a : 'overdue');
        lines.push(`${emoji[st]} <b>${cls.name}</b>: ${st.toUpperCase()}`);
    }
    await (0, telegram_1.sendMessage)(token, chatId, lines.join('\n'));
}
//# sourceMappingURL=index.js.map