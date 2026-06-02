import nodemailer from 'nodemailer'

const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''

export const FROM_EMAIL = `Bullfrog Bash <${GMAIL_USER}>`

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
})

const DAILY_LIMIT = 450
let dailyCount = 0
let lastResetDate = new Date().toDateString()

function tick(n = 1) {
  const today = new Date().toDateString()
  if (today !== lastResetDate) { dailyCount = 0; lastResetDate = today }
  dailyCount += n
  console.log(`[mailer] ${dailyCount}/${DAILY_LIMIT} emails sent today — ${DAILY_LIMIT - dailyCount} remaining`)
}

function canSend(n = 1): boolean {
  const today = new Date().toDateString()
  if (today !== lastResetDate) { dailyCount = 0; lastResetDate = today }
  if (dailyCount + n > DAILY_LIMIT) {
    console.warn(`[mailer] QUOTA: would exceed daily cap, skipping`)
    return false
  }
  return true
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!canSend(1)) return false
  try {
    await transporter.sendMail({ from: FROM_EMAIL, to, subject, html })
    tick(1)
    console.log(`[mailer] Sent to ${to}`)
    return true
  } catch (err: any) {
    console.error(`[mailer] Failed to ${to}:`, err?.message || err)
    return false
  }
}

interface Recipient { email: string }

export async function sendBulkEmail<T extends Recipient>(
  recipients: T[],
  subject: string,
  htmlFn: (r: T) => string
): Promise<number> {
  if (!recipients.length) return 0
  if (!canSend(recipients.length)) return 0

  let sent = 0
  for (const r of recipients) {
    try {
      await transporter.sendMail({ from: FROM_EMAIL, to: r.email, subject, html: htmlFn(r) })
      sent++
    } catch (err: any) {
      console.error(`[mailer] Failed to ${r.email}:`, err?.message || err)
    }
  }
  tick(sent)
  return sent
}
