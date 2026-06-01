import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import http from 'http'
import { Server as SocketServer } from 'socket.io'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from './prismaClient'
import { authMiddleware, adminOnly, AuthRequest } from './middleware'
import { Resend } from 'resend'

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new SocketServer(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'change_me'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const FROM_EMAIL = process.env.FROM_EMAIL || 'Grazuasion Party <onboarding@resend.dev>'
const resend = new Resend(process.env.RESEND_API_KEY || '')

// ─── AUTH ──────────────────────────────────────────────────────────────────

app.post('/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const access = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
  const refresh = jwt.sign({ sub: user.id, tokenType: 'refresh' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({
    accessToken: access, refreshToken: refresh,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, boozePref: user.boozePref }
  })
})

app.post('/auth/refresh', async (req: any, res: any) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as any
    if (payload.tokenType !== 'refresh') return res.status(401).json({ error: 'Invalid token type' })
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) return res.status(401).json({ error: 'User not found' })
    const access = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
    res.json({ accessToken: access })
  } catch { res.status(401).json({ error: 'Invalid or expired refresh token' }) }
})

app.post('/auth/register', async (req: any, res: any) => {
  const { email, password, name, phone, boozePref, idProof } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  const approved = await prisma.approvedEmail.findUnique({ where: { email } })
  if (!approved) return res.status(403).json({ error: 'Email not on guest list' })
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Account already exists — please login' })
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name, phone, boozePref, idProof, onboarded: true } })
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
  for (const admin of admins) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL, to: [admin.email],
        subject: `🐸 ${name || email} just joined the Grazuasion Party!`,
        html: `<p><strong>${name || email}</strong> has set up their account!</p>`
      })
    } catch {}
  }
  res.json({ id: user.id, email: user.email, name: user.name })
})

app.post('/auth/forgot-password', async (req: any, res: any) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.json({ ok: true }) // don't reveal whether email exists
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } })
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: [email],
      subject: 'Reset your Grazuasion Party password',
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
          <div style="background:#1F6F4A;padding:44px 36px;text-align:center">
            <div style="font-size:52px;margin-bottom:10px">🐸</div>
            <div style="color:#A7F3D0;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px">Grazuasion Party</div>
            <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0;line-height:1.3">Password Reset</h1>
          </div>
          <div style="padding:36px 36px 24px">
            <p style="color:#111827;font-size:17px;font-weight:700;margin:0 0 10px">Forgot your password?</p>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px">No worries. Click the button below to set a new one. This link is valid for <strong>1 hour</strong>.</p>
            <div style="text-align:center;margin:28px 0 8px">
              <a href="${resetUrl}"
                 style="display:inline-block;background:#1F6F4A;color:#ffffff;padding:16px 40px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:0.3px">
                Reset My Password
              </a>
            </div>
            <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:16px 0 0">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div style="background:#F9FAFB;padding:20px 36px;text-align:center;border-top:1px solid #E5E7EB">
            <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16 - 18, 2026 · Bullfrog Lake, IL</div>
          </div>
        </div>`
    })
  } catch (err) { console.warn('Resend error', err) }
  res.json({ ok: true })
})

app.post('/auth/reset-password', async (req: any, res: any) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'token and password required' })
  const record = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.used || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset link' })
  }
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { email: record.email }, data: { password: hashed } })
  await prisma.passwordResetToken.update({ where: { token }, data: { used: true } })
  res.json({ ok: true })
})

app.get('/users/me', authMiddleware, async (req: AuthRequest, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.sub },
    select: { id: true, email: true, name: true, phone: true, boozePref: true, role: true, onboarded: true, idProof: true }
  })
  res.json(user)
})

// ─── ADMIN ─────────────────────────────────────────────────────────────────

app.get('/admin/users', authMiddleware, adminOnly, async (_req: AuthRequest, res: any) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, phone: true, boozePref: true, role: true, onboarded: true, idProof: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  })
  const approved = await prisma.approvedEmail.findMany({ orderBy: { email: 'asc' } })
  res.json({ users, approved })
})

app.delete('/admin/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const id = req.params.id
  if (!id) return res.status(400).json({ error: 'id required' })
  if (req.user?.sub === id) return res.status(400).json({ error: "Can't delete yourself" })
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  try {
    await prisma.user.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

app.post('/admin/users/delete-by-email', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  // Prevent deleting the currently authenticated admin by email
  const current = await prisma.user.findUnique({ where: { id: req.user?.sub } })
  if (current && current.email === email) return res.status(400).json({ error: "Can't delete yourself" })
  // Prevent deleting other admins
  const adminsWithEmail = await prisma.user.findMany({ where: { email, role: 'ADMIN' } })
  if (adminsWithEmail.length > 0) return res.status(403).json({ error: 'Cannot delete admin account(s) by email' })
  try {
    const deletedUsers = await prisma.user.deleteMany({ where: { email } })
    await prisma.approvedEmail.deleteMany({ where: { email } })
    res.json({ ok: true, deleted: deletedUsers.count })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete by email' })
  }
})

app.post('/admin/approve-email', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const existing = await prisma.approvedEmail.findUnique({ where: { email } })
  if (existing) return res.json(existing)
  const rec = await prisma.approvedEmail.create({ data: { email, addedBy: req.user?.sub } })
  res.json(rec)
})

app.delete('/admin/approved-email', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  await prisma.approvedEmail.deleteMany({ where: { email } })
  res.json({ ok: true })
})

app.post('/admin/send-invite', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  let approved = await prisma.approvedEmail.findUnique({ where: { email } })
  if (!approved) approved = await prisma.approvedEmail.create({ data: { email, addedBy: req.user?.sub } })
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: [email],
      subject: "You're on the list. Their Educasion is Grazuasion 🐸",
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
          <div style="background:#1F6F4A;padding:44px 36px;text-align:center">
            <div style="font-size:52px;margin-bottom:10px">🐸</div>
            <div style="color:#A7F3D0;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:14px">Grazuasion Party</div>
            <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0;line-height:1.3">Their Educasion<br>is Grazuasion</h1>
          </div>
          <div style="padding:36px 36px 24px">
            <p style="color:#111827;font-size:17px;font-weight:700;margin:0 0 10px">Hey, you made the list.</p>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px">You're invited to the most exclusive graduation trip at <strong>Bullfrog Lake</strong>. Cabin life, the whole crew, big vibes only.</p>
            <div style="background:#F0FDF4;border-left:4px solid #1F6F4A;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:28px">
              <div style="color:#1F6F4A;font-weight:700;font-size:15px">June 16 - 18, 2026</div>
              <div style="color:#6B7280;font-size:13px;margin-top:3px">Bullfrog Lake, Illinois</div>
            </div>
            <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px">Set up your account to see the full itinerary, sign up for activities, track expenses, and stay in the loop with the group.</p>
            <div style="text-align:center;margin:28px 0 8px">
              <a href="${FRONTEND_URL}/onboard?email=${encodeURIComponent(email)}"
                 style="display:inline-block;background:#1F6F4A;color:#ffffff;padding:16px 40px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:0.3px">
                Set Up My Account
              </a>
            </div>
            <p style="color:#D1D5DB;font-size:12px;text-align:center;margin:16px 0 0">This link is just for you. Don't share it.</p>
          </div>
          <div style="background:#F9FAFB;padding:20px 36px;text-align:center;border-top:1px solid #E5E7EB">
            <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16 - 18, 2026 · Bullfrog Lake, IL</div>
          </div>
        </div>`
    })
    await prisma.approvedEmail.update({ where: { email }, data: { invited: true } })
  } catch (err) { console.warn('Resend error', err) }
  res.json({ ok: true })
})

app.post('/admin/notify-all', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { subject, body } = req.body
  if (!subject || !body) return res.status(400).json({ error: 'subject and body required' })
  const users = await prisma.user.findMany({ where: { onboarded: true }, select: { id: true, email: true } })
  for (const user of users) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL, to: [user.email], subject,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1F6F4A">${subject}</h2><p>${body}</p>
          <p style="color:#9CA3AF;font-size:12px">Grazuasion Party 🐸 — June 16–18</p></div>`
      })
      await prisma.notification.create({ data: { userId: user.id, title: subject, body } })
    } catch {}
  }
  io.emit('notification:new', { title: subject, body })
  res.json({ ok: true, sent: users.length })
})

app.post('/admin/seed', authMiddleware, adminOnly, async (_req: AuthRequest, res: any) => {
  await prisma.itineraryItem.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.itineraryItem.createMany({
    data: [
      { date: '2026-06-16', time: 'Morning',   title: 'Depart — group cab / carpool', order: 1 },
      { date: '2026-06-16', time: 'Afternoon', title: 'Check-in at Camp Bullfrog Lake', info: 'Cabins open from 3pm', order: 2 },
      { date: '2026-06-16', time: 'Evening',   title: 'Set up camp + first bonfire', order: 3 },
      { date: '2026-06-17', time: '9:00 AM',   title: 'Kayaking', info: '$15/hr per kayak — life vests included', order: 1 },
      { date: '2026-06-17', time: '12:00 PM',  title: 'Lunch at camp', order: 2 },
      { date: '2026-06-17', time: '2:00 PM',   title: 'Fishing pier + hiking trails', info: '40+ miles of trails', order: 3 },
      { date: '2026-06-17', time: 'Evening',   title: 'BBQ + bonfire + good vibes', order: 4 },
      { date: '2026-06-18', time: '9:00 AM',   title: 'Breakfast + pack up', order: 1 },
      { date: '2026-06-18', time: '12:00 PM',  title: 'Check-out + group cab back', order: 2 },
    ]
  })
  await prisma.activity.createMany({
    data: [
      { name: 'Kayaking',        estPrice: 15, icon: '' },
      { name: 'Fishing',         estPrice: 0,  icon: '' },
      { name: 'Hiking / Trails', estPrice: 0,  icon: '' },
      { name: 'Bonfire Night',   estPrice: 0,  icon: '' },
      { name: 'BBQ',             estPrice: 0,  icon: '' },
    ]
  })
  res.json({ ok: true })
})

// ─── TRIP CONFIG ───────────────────────────────────────────────────────────

app.get('/config', authMiddleware, async (_req: AuthRequest, res: any) => {
  let config = await prisma.tripConfig.findFirst()
  if (!config) config = await prisma.tripConfig.create({ data: { poolPerPerson: 100 } })
  res.json(config)
})

app.patch('/config', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { poolPerPerson } = req.body
  let config = await prisma.tripConfig.findFirst()
  if (!config) config = await prisma.tripConfig.create({ data: { poolPerPerson: poolPerPerson ?? 100 } })
  else config = await prisma.tripConfig.update({ where: { id: config.id }, data: { poolPerPerson } })
  res.json(config)
})

// ─── ITINERARY ─────────────────────────────────────────────────────────────

app.get('/itinerary', authMiddleware, async (_req: AuthRequest, res: any) => {
  const items = await prisma.itineraryItem.findMany({ orderBy: [{ date: 'asc' }, { order: 'asc' }] })
  res.json(items)
})

app.post('/itinerary', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { date, time, title, info, order } = req.body
  if (!date || !title) return res.status(400).json({ error: 'date and title required' })
  const item = await prisma.itineraryItem.create({ data: { date, time, title, info, order: order || 0 } })
  res.json(item)
  // Notify all users in background
  try {
    const users = await prisma.user.findMany({ where: { onboarded: true }, select: { id: true, email: true } })
    const timeLabel = time ? ` at ${time}` : ''
    for (const user of users) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL, to: [user.email],
          subject: `📋 New itinerary item: ${title}`,
          html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
            <div style="background:#1F6F4A;padding:32px;text-align:center">
              <div style="font-size:40px;margin-bottom:8px">📋</div>
              <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">Itinerary Updated</h1>
            </div>
            <div style="padding:24px 32px">
              <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 4px">${title}</p>
              ${timeLabel ? `<p style="color:#1F6F4A;font-size:13px;font-weight:600;margin:0 0 8px">${timeLabel}</p>` : ''}
              ${info ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px">${info}</p>` : ''}
              <p style="color:#6B7280;font-size:13px;margin:0">Check the app for the full schedule.</p>
            </div>
            <div style="background:#F9FAFB;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
              <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
            </div>
          </div>`
        })
        await prisma.notification.create({ data: { userId: user.id, title: `New: ${title}`, body: `Added to the itinerary${timeLabel}` } })
      } catch {}
    }
  } catch {}
})

app.patch('/itinerary/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { date, time, title, info, order } = req.body
  const item = await prisma.itineraryItem.update({ where: { id: req.params.id }, data: { date, time, title, info, ...(order !== undefined && { order }) } })
  res.json(item)
})

app.delete('/itinerary/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    await prisma.itineraryItem.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Item not found' })
    throw e
  }
})

// ─── ACTIVITIES ─────────────────────────────────────────────────────────────

app.get('/activities', authMiddleware, async (req: AuthRequest, res: any) => {
  const userId = req.user?.sub
  const activities = await prisma.activity.findMany({
    include: { participations: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { createdAt: 'asc' }
  })
  res.json(activities.map(a => {
    const myPart = a.participations.find(p => p.userId === userId)
    return {
      ...a,
      participantCount: a.participations.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.count, 0),
      isParticipating: myPart?.status === 'APPROVED',
      isPending: myPart?.status === 'PENDING',
      userCount: myPart?.status === 'APPROVED' ? myPart.count : 0,
      participants: a.participations.map(p => ({ userId: p.userId, name: p.user.name, email: p.user.email, status: p.status, count: p.count })),
      participations: undefined,
    }
  }))
})

app.post('/activities', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { name, estPrice, icon, description } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const activity = await prisma.activity.create({ data: { name, estPrice: estPrice || 0, icon, description: description || null } })
  res.json(activity)
  // Notify all users in background
  try {
    const users = await prisma.user.findMany({ where: { onboarded: true }, select: { id: true, email: true } })
    const priceLabel = estPrice ? ` — $${estPrice}/spot` : ''
    for (const user of users) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL, to: [user.email],
          subject: `${icon || '🎉'} New activity: ${name}`,
          html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
            <div style="background:#1F6F4A;padding:32px;text-align:center">
              <div style="font-size:40px;margin-bottom:8px">${icon || '🎉'}</div>
              <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">New Activity Added</h1>
            </div>
            <div style="padding:24px 32px">
              <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 4px">${name}</p>
              ${priceLabel ? `<p style="color:#1F6F4A;font-size:13px;font-weight:600;margin:0 0 8px">${priceLabel}</p>` : ''}
              ${description ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px">${description}</p>` : ''}
              <p style="color:#6B7280;font-size:13px;margin:0">Open the app → Activities to request a spot.</p>
            </div>
            <div style="background:#F9FAFB;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
              <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
            </div>
          </div>`
        })
        await prisma.notification.create({ data: { userId: user.id, title: `New activity: ${name}`, body: `${description || ''}${priceLabel}`.trim() } })
      } catch {}
    }
  } catch {}
})

app.patch('/activities/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { name, estPrice, isDone, description } = req.body
  const data: any = {}
  if (name !== undefined) data.name = name
  if (estPrice !== undefined) data.estPrice = estPrice
  if (description !== undefined) data.description = description
  if (isDone !== undefined) { data.isDone = isDone; if (isDone) data.doneAt = new Date() }
  const activity = await prisma.activity.update({ where: { id: req.params.id }, data })
  if (isDone && activity.estPrice > 0) {
    const parts = await prisma.participation.findMany({ where: { activityId: activity.id, status: 'APPROVED' } })
    if (parts.length > 0) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      if (admin) {
        const totalAmount = parts.reduce((s, p) => s + p.count * activity.estPrice, 0)
        const expense = await prisma.expense.create({
          data: { name: `Activity: ${activity.name}`, amount: totalAmount, category: 'Activity', paidById: admin.id, splitAll: false }
        })
        await prisma.expenseSplit.createMany({ data: parts.map(p => ({ expenseId: expense.id, userId: p.userId, share: p.count * activity.estPrice })) })
        for (const p of parts) await prisma.notification.create({ data: { userId: p.userId, title: `${activity.name} billed`, body: `$${p.count * activity.estPrice} added to your tab` } })
        io.emit('billing:update', {})
      }
    }
  }
  res.json(activity)
})

app.delete('/activities/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    await prisma.participation.deleteMany({ where: { activityId: req.params.id } })
    await prisma.activity.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Activity not found' })
    throw e
  }
})

// Admin: approve pending OR add +1 for already-approved user
app.post('/admin/activities/:id/add-user/:userId', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const activityId = req.params.id
  const userId = req.params.userId
  const existing = await prisma.participation.findUnique({ where: { activityId_userId: { activityId, userId } } })
  const [activity, targetUser] = await Promise.all([
    prisma.activity.findUnique({ where: { id: activityId }, select: { name: true, estPrice: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
  ])
  const actName = activity?.name ?? 'the activity'
  const price = activity?.estPrice ?? 0
  if (existing) {
    if (existing.status === 'PENDING') {
      await prisma.participation.update({ where: { activityId_userId: { activityId, userId } }, data: { status: 'APPROVED', count: 1 } })
      await prisma.notification.create({ data: { userId, title: 'Request approved!', body: `You're in for ${actName}${price ? ` — $${price} added when done` : ''}` } })
      io.emit('billing:update', {})
      if (targetUser) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL, to: [targetUser.email],
            subject: `You're in! 🐸 ${actName} is confirmed`,
            html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
              <div style="background:#1F6F4A;padding:36px;text-align:center">
                <div style="font-size:48px;margin-bottom:8px">🐸</div>
                <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0">You're officially in!</h1>
              </div>
              <div style="padding:28px 32px">
                <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 8px">Hey ${targetUser.name || targetUser.email.split('@')[0]}!</p>
                <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px">Your request for <strong>${actName}</strong> has been approved by the admin. You're locked in — get pumped! 🎉</p>
                ${price ? `<div style="background:#F0FDF4;border-left:4px solid #1F6F4A;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px"><p style="color:#1F6F4A;font-weight:700;margin:0">Cost: $${price}/spot</p><p style="color:#6B7280;font-size:13px;margin:4px 0 0">Added to your tab when the activity is marked done.</p></div>` : ''}
                <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0">Check the app to see your updated wallet balance.</p>
              </div>
              <div style="background:#F9FAFB;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB">
                <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
              </div>
            </div>`
          })
        } catch {}
      }
      return res.json({ status: 'APPROVED', count: 1 })
    }
    const updated = await prisma.participation.update({ where: { activityId_userId: { activityId, userId } }, data: { count: { increment: 1 } } })
    await prisma.notification.create({ data: { userId, title: 'Spot added!', body: `You now have ${updated.count} spot${updated.count > 1 ? 's' : ''} for ${actName}` } })
    io.emit('billing:update', {})
    if (targetUser) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL, to: [targetUser.email],
          subject: `Extra spot confirmed! 🐸 ${actName}`,
          html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
            <div style="background:#1F6F4A;padding:36px;text-align:center">
              <div style="font-size:48px;margin-bottom:8px">🐸</div>
              <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0">Extra spot added!</h1>
            </div>
            <div style="padding:28px 32px">
              <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 8px">Hey ${targetUser.name || targetUser.email.split('@')[0]}!</p>
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px">Your extra spot for <strong>${actName}</strong> has been added. You now have <strong>${updated.count} spot${updated.count > 1 ? 's' : ''}</strong>.</p>
              ${price ? `<p style="color:#6B7280;font-size:13px">Total for this activity: <strong>$${updated.count * price}</strong> — added to your tab when done.</p>` : ''}
            </div>
            <div style="background:#F9FAFB;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB">
              <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
            </div>
          </div>`
        })
      } catch {}
    }
    return res.json({ status: 'APPROVED', count: updated.count })
  }
  await prisma.participation.create({ data: { activityId, userId, status: 'APPROVED', count: 1 } })
  io.emit('billing:update', {})
  res.json({ status: 'APPROVED', count: 1 })
})

// Admin: remove one spot (or all if count reaches 0)
app.post('/admin/activities/:id/remove-user/:userId', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const activityId = req.params.id
  const userId = req.params.userId
  const existing = await prisma.participation.findUnique({ where: { activityId_userId: { activityId, userId } } })
  if (!existing) return res.json({ status: 'none', count: 0 })
  if (existing.count <= 1) {
    await prisma.participation.delete({ where: { activityId_userId: { activityId, userId } } })
    io.emit('billing:update', {})
    return res.json({ status: 'none', count: 0 })
  }
  const updated = await prisma.participation.update({ where: { activityId_userId: { activityId, userId } }, data: { count: { decrement: 1 } } })
  io.emit('billing:update', {})
  res.json({ status: 'APPROVED', count: updated.count })
})

// User: request to join (or cancel if pending, or request more if already approved)
app.post('/activities/:id/request', authMiddleware, async (req: AuthRequest, res: any) => {
  const userId = req.user?.sub
  const activityId = req.params.id
  const existing = await prisma.participation.findUnique({ where: { activityId_userId: { activityId, userId } } })
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const [activity, requester] = await Promise.all([
    prisma.activity.findUnique({ where: { id: activityId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  ])
  if (existing) {
    if (existing.status === 'PENDING') {
      await prisma.participation.delete({ where: { activityId_userId: { activityId, userId } } })
      return res.json({ status: 'none', count: 0 })
    }
    // Already approved — request one more spot
    if (admin) {
      await prisma.notification.create({ data: { userId: admin.id, title: 'Wants more!', body: `${requester?.name || requester?.email} wants an extra spot for ${activity?.name}` } })
      try {
        const userName = requester?.name || requester?.email?.split('@')[0] || 'Someone'
        const actName = activity?.name ?? 'an activity'
        await resend.emails.send({
          from: FROM_EMAIL, to: [admin.email],
          subject: `🐸 ${userName} wants an extra spot for ${actName}`,
          html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
            <div style="background:#1F6F4A;padding:32px;text-align:center">
              <div style="font-size:40px;margin-bottom:8px">🐸</div>
              <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">Extra Spot Request</h1>
            </div>
            <div style="padding:24px 32px">
              <p style="color:#111827;font-size:15px;font-weight:700;margin:0 0 8px">${userName} wants one more spot for <strong>${actName}</strong>.</p>
              <p style="color:#6B7280;font-size:13px;margin:0">They're already approved — use Admin → Activities to add the spot.</p>
            </div>
            <div style="background:#F9FAFB;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
              <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
            </div>
          </div>`
        })
      } catch {}
    }
    return res.json({ status: 'wants_more', count: existing.count })
  }
  await prisma.participation.create({ data: { activityId, userId, status: 'PENDING', count: 0 } })
  if (admin) {
    await prisma.notification.create({ data: { userId: admin.id, title: 'Activity request', body: `${requester?.name || requester?.email} wants to join ${activity?.name}` } })
    io.emit('notification:new', { title: 'Activity request', body: `${requester?.name || requester?.email} wants to join ${activity?.name}` })
    try {
      const userName = requester?.name || requester?.email?.split('@')[0] || 'Someone'
      const actName = activity?.name ?? 'an activity'
      await resend.emails.send({
        from: FROM_EMAIL, to: [admin.email],
        subject: `🐸 ${userName} wants to join ${actName}`,
        html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
          <div style="background:#1F6F4A;padding:32px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">🐸</div>
            <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">New Activity Request</h1>
          </div>
          <div style="padding:24px 32px">
            <p style="color:#111827;font-size:15px;font-weight:700;margin:0 0 8px">${userName} wants to join <strong>${actName}</strong>.</p>
            <p style="color:#6B7280;font-size:13px;margin:0">Open the app → Admin → Activities to approve or ignore.</p>
          </div>
          <div style="background:#F9FAFB;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
            <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
          </div>
        </div>`
      })
    } catch {}
  }
  res.json({ status: 'pending', count: 0 })
})

// ─── EXPENSES ──────────────────────────────────────────────────────────────

app.get('/expenses', authMiddleware, async (req: AuthRequest, res: any) => {
  const userId = req.user?.sub
  const expenses = await prisma.expense.findMany({
    include: { paidBy: { select: { name: true, email: true } }, splits: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json(expenses.map(e => ({ ...e, myShare: e.splits.find(s => s.userId === userId)?.share || 0, splitCount: e.splits.length })))
})

app.post('/expenses', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { name, amount, category, splitAll, userIds } = req.body
  if (!name || amount === undefined || !category) return res.status(400).json({ error: 'name, amount, category required' })
  const adminId = req.user?.sub
  let targetIds: string[] = []
  if (splitAll !== false) {
    const users = await prisma.user.findMany({ where: { onboarded: true }, select: { id: true } })
    targetIds = users.map(u => u.id)
  } else { targetIds = userIds || [] }
  const share = targetIds.length > 0 ? amount / targetIds.length : amount
  const expense = await prisma.expense.create({ data: { name, amount, category, paidById: adminId, splitAll: splitAll !== false } })
  if (targetIds.length > 0) {
    await prisma.expenseSplit.createMany({ data: targetIds.map(uid => ({ expenseId: expense.id, userId: uid, share })) })
    for (const uid of targetIds) await prisma.notification.create({ data: { userId: uid, title: `New expense: ${name}`, body: `Your share: $${share.toFixed(2)}` } })
  }
  io.emit('expense:new', { name, share })
  res.json({ ...expense, splitCount: targetIds.length, share })
})

app.delete('/expenses/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    await prisma.expenseSplit.deleteMany({ where: { expenseId: req.params.id } })
    await prisma.expense.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Expense not found' })
    throw e
  }
})

// ─── BILLING ──────────────────────────────────────────────────────────────

app.get('/billing/user/:userId', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const splits = await prisma.expenseSplit.findMany({
    where: { userId: req.params.userId },
    include: { expense: { select: { name: true, category: true, createdAt: true } } },
    orderBy: { expense: { createdAt: 'desc' } }
  })
  res.json(splits)
})

app.delete('/billing/split/:splitId', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  try {
    await prisma.expenseSplit.delete({ where: { id: req.params.splitId } })
    io.emit('billing:update', {})
    res.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Split not found' })
    throw e
  }
})

app.patch('/billing/split/:splitId', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { share } = req.body
  if (share === undefined || isNaN(Number(share))) return res.status(400).json({ error: 'share required' })
  const split = await prisma.expenseSplit.update({ where: { id: req.params.splitId }, data: { share: Number(share) } })
  io.emit('billing:update', {})
  res.json(split)
})

app.get('/billing/me', authMiddleware, async (req: AuthRequest, res: any) => {
  const userId = req.user?.sub
  const splits = await prisma.expenseSplit.findMany({
    where: { userId },
    include: { expense: { select: { name: true, category: true, createdAt: true } } }
  })
  const total = splits.reduce((sum, s) => sum + s.share, 0)
  const config = await prisma.tripConfig.findFirst()
  const participations = await prisma.participation.findMany({
    where: { userId, status: 'APPROVED', activity: { isDone: false } },
    include: { activity: { select: { id: true, name: true, estPrice: true, icon: true } } }
  })
  const pendingActivityCost = participations.reduce((sum, p) => sum + p.activity.estPrice * p.count, 0)
  res.json({
    total: +total.toFixed(2),
    splits,
    poolPerPerson: config?.poolPerPerson ?? 100,
    pendingActivities: participations.map(p => ({ ...p.activity, count: p.count, subtotal: p.activity.estPrice * p.count })),
    pendingActivityCost: +pendingActivityCost.toFixed(2)
  })
})

app.get('/billing/all', authMiddleware, adminOnly, async (_req: AuthRequest, res: any) => {
  const users = await prisma.user.findMany({ where: { onboarded: true }, select: { id: true, name: true, email: true } })
  const splits = await prisma.expenseSplit.findMany()
  const config = await prisma.tripConfig.findFirst()
  const totals: Record<string, number> = {}
  for (const s of splits) totals[s.userId] = (totals[s.userId] || 0) + s.share
  res.json(users.map(u => ({
    ...u,
    totalCharged: +(totals[u.id] || 0).toFixed(2),
    poolPerPerson: config?.poolPerPerson || 0,
    balance: +((config?.poolPerPerson || 0) - (totals[u.id] || 0)).toFixed(2)
  })))
})

// ─── MESSAGES ──────────────────────────────────────────────────────────────

app.get('/messages', authMiddleware, async (_req: AuthRequest, res: any) => {
  const messages = await prisma.message.findMany({
    take: 100, orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, name: true, email: true } }, reactions: true }
  })
  res.json(messages)
})

// ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

app.get('/announcements', authMiddleware, async (_req: AuthRequest, res: any) => {
  const items = await prisma.announcement.findMany({ where: { pinned: true }, orderBy: { createdAt: 'desc' }, take: 3 })
  res.json(items)
})

app.post('/announcements', authMiddleware, adminOnly, async (req: AuthRequest, res: any) => {
  const { title, body } = req.body
  if (!title || !body) return res.status(400).json({ error: 'title and body required' })
  const item = await prisma.announcement.create({ data: { title, body, pinned: true } })
  io.emit('announcement:new', item)
  res.json(item)
})

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

app.get('/notifications', authMiddleware, async (req: AuthRequest, res: any) => {
  const items = await prisma.notification.findMany({ where: { userId: req.user?.sub }, orderBy: { createdAt: 'desc' }, take: 20 })
  res.json(items)
})

app.patch('/notifications/read-all', authMiddleware, async (req: AuthRequest, res: any) => {
  await prisma.notification.updateMany({ where: { userId: req.user?.sub, read: false }, data: { read: true } })
  res.json({ ok: true })
})

// ─── SOCKET.IO ──────────────────────────────────────────────────────────────

const onlineUsers = new Map<string, string>()
const typingUsers = new Map<string, { name: string; timer: ReturnType<typeof setTimeout> }>()

io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('no token'))
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    socket.data.userId = payload.sub
    next()
  } catch { next(new Error('invalid token')) }
})

io.on('connection', (socket) => {
  const userId = socket.data.userId
  onlineUsers.set(socket.id, userId)
  io.emit('users:online', Array.from(new Set(onlineUsers.values())))

  socket.on('message:send', async (data: { body: string }) => {
    if (!data.body?.trim()) return
    const message = await prisma.message.create({
      data: { senderId: userId, body: data.body.trim() },
      include: { sender: { select: { id: true, name: true, email: true } }, reactions: true }
    })
    io.emit('message:new', message)
  })

  socket.on('reaction:add', async (data: { messageId: string; emoji: string }) => {
    try {
      const existing = await prisma.reaction.findUnique({ where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } } })
      if (existing) await prisma.reaction.delete({ where: { id: existing.id } })
      else await prisma.reaction.create({ data: { messageId: data.messageId, userId, emoji: data.emoji } })
      const reactions = await prisma.reaction.findMany({ where: { messageId: data.messageId } })
      io.emit('reaction:update', { messageId: data.messageId, reactions })
    } catch {}
  })

  socket.on('message:delete', async (data: { messageId: string }) => {
    try {
      const msg = await prisma.message.findUnique({ where: { id: data.messageId } })
      if (!msg || msg.senderId !== userId) return
      await prisma.$transaction([
        prisma.reaction.deleteMany({ where: { messageId: data.messageId } }),
        prisma.message.delete({ where: { id: data.messageId } })
      ])
      io.emit('message:delete', { messageId: data.messageId })
    } catch (e) { console.error('message:delete error', e) }
  })

  socket.on('message:edit', async (data: { messageId: string; body: string }) => {
    if (!data.body?.trim()) return
    try {
      const msg = await prisma.message.findUnique({ where: { id: data.messageId } })
      if (!msg || msg.senderId !== userId) return
      const updated = await prisma.message.update({
        where: { id: data.messageId },
        data: { body: data.body.trim() },
        include: { sender: { select: { id: true, name: true, email: true } }, reactions: true }
      })
      io.emit('message:edit', updated)
    } catch {}
  })

  socket.on('typing:start', async () => {
    try {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
      if (!u) return
      const name = u.name || u.email.split('@')[0]
      if (typingUsers.has(userId)) clearTimeout(typingUsers.get(userId)!.timer)
      const timer = setTimeout(() => {
        typingUsers.delete(userId)
        socket.broadcast.emit('typing:update', Array.from(typingUsers.values()).map(v => v.name))
      }, 3000)
      typingUsers.set(userId, { name, timer })
      socket.broadcast.emit('typing:update', Array.from(typingUsers.values()).map(v => v.name))
    } catch {}
  })

  socket.on('typing:stop', () => {
    if (typingUsers.has(userId)) {
      clearTimeout(typingUsers.get(userId)!.timer)
      typingUsers.delete(userId)
    }
    socket.broadcast.emit('typing:update', Array.from(typingUsers.values()).map(v => v.name))
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id)
    io.emit('users:online', Array.from(new Set(onlineUsers.values())))
    if (typingUsers.has(userId)) {
      clearTimeout(typingUsers.get(userId)!.timer)
      typingUsers.delete(userId)
      socket.broadcast.emit('typing:update', Array.from(typingUsers.values()).map(v => v.name))
    }
  })
})

// ─── START ──────────────────────────────────────────────────────────────────

async function ensureAdmin() {
  const email = 'mdazeezulla2020@gmail.com'
  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (!existing) {
      const hashed = await bcrypt.hash('Zeeza_tri@6996', 10)
      await prisma.user.create({ data: { email, password: hashed, name: 'Admin', role: 'ADMIN', onboarded: true } })
      await prisma.approvedEmail.upsert({ where: { email }, update: { invited: true }, create: { email, invited: true } })
      console.log('Admin account created:', email)
    }
  } catch (e) { console.error('Admin seed failed:', e) }
}

// ─── ITINERARY REMINDER SCHEDULER ────────────────────────────────────────────
async function checkUpcomingItinerary() {
  try {
    const now = new Date()
    const soon = new Date(now.getTime() + 60 * 60 * 1000) // 60 min from now
    const items = await prisma.itineraryItem.findMany({ where: { notified: false } })
    for (const item of items) {
      const m = item.time?.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) continue
      const itemDate = new Date(`${item.date}T${item.time}:00`)
      if (itemDate > now && itemDate <= soon) {
        await prisma.itineraryItem.update({ where: { id: item.id }, data: { notified: true } })
        const users = await prisma.user.findMany({ where: { onboarded: true }, select: { id: true, email: true } })
        const h = parseInt(m[1]), min = m[2]
        const h12 = h % 12 || 12
        const timeLabel = `${h12}:${min} ${h >= 12 ? 'PM' : 'AM'}`
        for (const user of users) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL, to: [user.email],
              subject: `⏰ Coming up: ${item.title} at ${timeLabel}`,
              html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
                <div style="background:#1F6F4A;padding:32px;text-align:center">
                  <div style="font-size:40px;margin-bottom:8px">⏰</div>
                  <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0">Happening soon!</h1>
                </div>
                <div style="padding:24px 32px">
                  <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 4px">${item.title}</p>
                  <p style="color:#1F6F4A;font-size:13px;font-weight:600;margin:0 0 12px">Today at ${timeLabel}</p>
                  ${item.info ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 12px">${item.info}</p>` : ''}
                  <p style="color:#6B7280;font-size:13px;margin:0">Check the app for full details.</p>
                </div>
                <div style="background:#F9FAFB;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
                  <div style="color:#9CA3AF;font-size:12px">Grazuasion Party · June 16–18, 2026 · Bullfrog Lake, IL</div>
                </div>
              </div>`
            })
            await prisma.notification.create({ data: { userId: user.id, title: `Coming up: ${item.title}`, body: `Today at ${timeLabel}` } })
          } catch {}
        }
        io.emit('notification:new', { title: `Coming up: ${item.title}`, body: `Today at ${timeLabel}` })
      }
    }
  } catch {}
}

server.listen(PORT, async () => {
  console.log(`🐸 Grazuasion Party backend on :${PORT}`)
  await ensureAdmin()
  // Check every 30 minutes for items approaching in the next 60 min
  setInterval(checkUpcomingItinerary, 30 * 60 * 1000)
})
