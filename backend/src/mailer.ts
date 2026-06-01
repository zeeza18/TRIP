import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || '')
export const FROM_EMAIL = process.env.FROM_EMAIL || 'Bullfrog Bash <onboarding@resend.dev>'

// Resend free tier: 100 emails/day. We cap at 90 to keep a buffer.
const DAILY_LIMIT = 90
let dailyCount = 0
let lastResetDate = new Date().toDateString()

function tick(n = 1) {
  const today = new Date().toDateString()
  if (today !== lastResetDate) { dailyCount = 0; lastResetDate = today }
  dailyCount += n
  const remaining = DAILY_LIMIT - dailyCount
  console.log(`[mailer] ${dailyCount}/${DAILY_LIMIT} emails sent today — ${remaining} remaining`)
  return remaining
}

function canSend(n = 1): boolean {
  const today = new Date().toDateString()
  if (today !== lastResetDate) { dailyCount = 0; lastResetDate = today }
  if (dailyCount + n > DAILY_LIMIT) {
    console.warn(`[mailer] QUOTA: would exceed daily cap (${dailyCount}+${n} > ${DAILY_LIMIT}), skipping`)
    return false
  }
  return true
}

/** Send a single email. Returns true if sent. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!canSend(1)) return false
  try {
    await resend.emails.send({ from: FROM_EMAIL, to: [to], subject, html })
    tick(1)
    return true
  } catch (err: any) {
    console.error(`[mailer] Failed to ${to}:`, err?.message || err)
    return false
  }
}

interface Recipient { email: string }

/**
 * Send one email per recipient using Resend's batch API (single HTTP call).
 * htmlFn receives each recipient so you can personalise if needed.
 * Returns how many were actually sent.
 */
export async function sendBulkEmail<T extends Recipient>(
  recipients: T[],
  subject: string,
  htmlFn: (r: T) => string
): Promise<number> {
  if (!recipients.length) return 0

  const today = new Date().toDateString()
  if (today !== lastResetDate) { dailyCount = 0; lastResetDate = today }

  const available = DAILY_LIMIT - dailyCount
  if (available <= 0) {
    console.warn(`[mailer] QUOTA: daily cap reached, skipping bulk send to ${recipients.length} recipients`)
    return 0
  }

  const toSend = recipients.slice(0, available)
  if (toSend.length < recipients.length) {
    console.warn(`[mailer] QUOTA: capped bulk send at ${toSend.length}/${recipients.length} recipients`)
  }

  try {
    await resend.batch.send(
      toSend.map(r => ({ from: FROM_EMAIL, to: [r.email], subject, html: htmlFn(r) }))
    )
    tick(toSend.length)
    return toSend.length
  } catch (err: any) {
    console.error('[mailer] Batch send failed:', err?.message || err)
    return 0
  }
}

export { resend }
