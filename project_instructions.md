# PROJECT: Tuition Subscription Manager (PWA + Telegram Bot)

## PRODUCT GOAL
Build a PWA web app for teachers to manage monthly tuition subscription payments.
The system integrates with a Telegram Bot to control and monitor group access.

DO NOT implement payment gateways.
This system only tracks payments and receipt uploads.
Teachers manually approve receipts.

---

## CORE USERS

### 1. Teacher
- Creates classes
- Sets monthly fee and due date
- Connects Telegram group
- Views payment dashboard
- Approves/rejects receipts
- Chooses reminder strictness mode

### 2. Student
- Joins via invite link
- Views payment status
- Uploads payment receipt
- Sees approval status
- Receives reminders

---

## CORE FEATURES (PHASE 1 – MVP)

### Teacher Side
- Auth (email/password or Google)
- Create Class
- Set:
  - Monthly fee
  - Due date
  - Grace period (days)
- Generate student join link
- Dashboard:
  - Active (Paid)
  - Pending Approval
  - Overdue
- Approve / Reject receipt
- Manual status override

### Student Side
- Join class via link
- Upload receipt (image)
- See:
  - Current status
  - Due date countdown
  - Approval result

---

## TELEGRAM BOT LOGIC

Bot Responsibilities:
- Send reminder before due date
- Send overdue reminder
- Notify teacher when receipt uploaded
- Update status after approval

Optional (configurable by teacher):
- Mute overdue students
- Remove overdue students after X days

Bot must:
- Be added as admin in Telegram group
- Store Telegram user ID linked to student account

---

## STATUS SYSTEM

Each student has:

- ACTIVE (Paid)
- PENDING (Receipt uploaded)
- OVERDUE (Past due date)
- RESTRICTED (Optional enforcement)

Status updates automatically based on:
- Due date
- Approval action
- Grace period

---

## REMINDER FLOW

1. 3 days before due date → Reminder
2. Due date → Reminder
3. After grace period → Overdue notice
4. If enforcement enabled → Restrict/remove

Reminder message is automated and editable from admin (teacher) dashboard.

---

## SYSTEM RULES

- No automatic payment verification
- No financial transaction handling
- Teacher remains final authority
- Telegram integration must be optional but encouraged

---

## TECH STACK

- PWA (mobile-first)
- Firebase (Auth + Firestore + Storage)
- Telegram Bot API
- Role-based access (Teacher / Student)

---

## OUT OF SCOPE (FOR NOW)

- Viber integration
- Stripe / PayPal
- Attendance tracking
- Homework management
- Multi-school enterprise system

---

## DESIGN PRINCIPLES

- Simple UI
- Minimal configuration
- Clear status visualization (color-based)
- Avoid feature creep
- Optimize for non-technical teachers

---

END OF INSTRUCTION