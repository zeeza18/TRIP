import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'

interface ApprovedEmail { id: string; email: string; invited: boolean }
interface UserRow { id: string; email: string; name: string | null; phone: string | null; boozePref: string | null; onboarded: boolean }
interface BillingSummary { id: string; name: string | null; email: string; totalCharged: number; poolPerPerson: number; balance: number }

const CATEGORIES = ['Accommodation', 'Transport', 'Food', 'Activity', 'Drinks', 'Other']

export default function AdminTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [approved, setApproved] = useState<ApprovedEmail[]>([])
  const [billing, setBilling] = useState<BillingSummary[]>([])
  const [poolInput, setPoolInput] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '', category: 'Accommodation', splitAll: true })
  const [notifForm, setNotifForm] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [section, setSection] = useState<'crew' | 'expenses' | 'announce'>('crew')

  async function loadData() {
    try {
      const [usersRes, billingRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/billing/all'),
      ])
      setUsers(usersRes.data.users)
      setApproved(usersRes.data.approved)
      setBilling(billingRes.data)
      if (billingRes.data[0]?.poolPerPerson) setPoolInput(String(billingRes.data[0].poolPerPerson))
    } catch { toast.error('Could not load admin data') }
  }

  useEffect(() => { loadData() }, [])

  async function sendInvite(email: string) {
    try {
      await api.post('/admin/send-invite', { email })
      toast.success(`Invite sent to ${email}`)
      setInviteEmail('')
      loadData()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to send invite') }
  }

  async function addExpense() {
    if (!expenseForm.name || !expenseForm.amount) { toast.error('Name and amount required'); return }
    try {
      await api.post('/expenses', {
        name: expenseForm.name,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        splitAll: expenseForm.splitAll
      })
      toast.success('Expense added and split!')
      setExpenseForm({ name: '', amount: '', category: 'Accommodation', splitAll: true })
      loadData()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  async function updatePool() {
    try {
      await api.patch('/config', { poolPerPerson: parseFloat(poolInput) || 0 })
      toast.success('Pool contribution updated')
      loadData()
    } catch { toast.error('Failed') }
  }

  async function seedDefaults() {
    try {
      await api.post('/admin/seed', {})
      toast.success('Itinerary + activities seeded!')
    } catch { toast.error('Failed to seed') }
  }

  async function sendNotification() {
    if (!notifForm.subject || !notifForm.body) { toast.error('Subject and body required'); return }
    setSending(true)
    try {
      const res = await api.post('/admin/notify-all', notifForm)
      toast.success(`Sent to ${res.data.sent} people!`)
      setNotifForm({ subject: '', body: '' })
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
  }

  const joinedUsers = users.filter(u => u.onboarded)
  const pendingEmails = approved.filter(a => !users.find(u => u.email === a.email && u.onboarded))

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-dark mb-1">Admin Panel</h2>
      <p className="text-xs text-muted mb-4">Bullfrog Bash — Jun 16–18</p>

      {/* Quick actions */}
      <div className="flex gap-2 mb-5">
        <button onClick={seedDefaults}
          className="flex-1 py-2 text-xs bg-accent/10 text-accent font-semibold rounded-xl hover:bg-accent/20">
          🌱 Seed defaults
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {(['crew', 'expenses', 'announce'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${section === s ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>
            {s === 'crew' ? `👥 Crew (${joinedUsers.length}/16)` : s === 'expenses' ? '💸 Expenses' : '📣 Announce'}
          </button>
        ))}
      </div>

      {/* CREW */}
      {section === 'crew' && (
        <div className="space-y-4">
          {/* Send invite form */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-dark mb-2">Send invite</p>
            <div className="flex gap-2">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com" type="email"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={() => sendInvite(inviteEmail)} className="px-3 py-2 bg-primary text-white text-sm rounded-xl font-semibold">Send</button>
            </div>
          </div>

          {/* Joined */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-dark mb-3">Joined ({joinedUsers.length})</p>
            <div className="space-y-2">
              {joinedUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(u.name || u.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">{u.name || '—'}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                  <div className="text-xs text-muted text-right shrink-0">
                    {u.phone && <p>{u.phone}</p>}
                    {u.boozePref && <p>{u.boozePref === 'yay' ? '🍺' : '🧃'}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending */}
          {pendingEmails.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-dark mb-3">Pending invite ({pendingEmails.length})</p>
              <div className="space-y-2">
                {pendingEmails.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-muted">?</div>
                    <p className="flex-1 text-sm text-muted truncate">{a.email}</p>
                    <button onClick={() => sendInvite(a.email)}
                      className="text-xs text-primary font-semibold hover:opacity-80 shrink-0">
                      {a.invited ? 'Resend' : 'Invite'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing summary */}
          {billing.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-dark">Settlement summary</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted">Pool: $</span>
                  <input value={poolInput} onChange={e => setPoolInput(e.target.value)}
                    className="w-14 text-xs border border-gray-200 rounded-lg px-1.5 py-1 text-dark focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={updatePool} className="text-xs text-primary font-semibold ml-1">Save</button>
                </div>
              </div>
              <div className="space-y-2">
                {billing.map(b => (
                  <div key={b.id} className="flex items-center justify-between">
                    <p className="text-xs text-dark truncate max-w-[60%]">{b.name || b.email}</p>
                    <span className={`text-xs font-semibold ${b.balance >= 0 ? 'text-green-600' : 'text-danger'}`}>
                      {b.balance >= 0 ? `+$${b.balance.toFixed(2)}` : `-$${Math.abs(b.balance).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXPENSES */}
      {section === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-dark">Add expense</p>
            <input value={expenseForm.name} onChange={e => setExpenseForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Expense name (e.g. Cabin night 1)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Total amount"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={expenseForm.splitAll} onChange={e => setExpenseForm(f => ({ ...f, splitAll: e.target.checked }))}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-dark">Split equally across all 16</span>
            </label>
            <button onClick={addExpense} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">
              Add &amp; Split
            </button>
          </div>
        </div>
      )}

      {/* ANNOUNCE */}
      {section === 'announce' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-dark">Send announcement to all</p>
            <p className="text-xs text-muted">Posts to Social tab + sends email to everyone</p>
            <input value={notifForm.subject} onChange={e => setNotifForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Subject / title"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
            <textarea value={notifForm.body} onChange={e => setNotifForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Message body..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            <button onClick={sendNotification} disabled={sending}
              className="w-full py-2.5 bg-secondary text-white rounded-xl font-semibold text-sm disabled:opacity-60">
              {sending ? 'Sending…' : '📣 Send to All'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
