import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { ActivityIcon } from '../components/Icons'
import { useAuth } from '../contexts/AuthContext'

interface ApprovedEmail { id: string; email: string; invited: boolean }
interface UserRow { id: string; email: string; name: string | null; phone: string | null; boozePref: string | null; onboarded: boolean; idProof: string | null; role: string }
interface BillingSummary { id: string; name: string | null; email: string; totalCharged: number; poolPerPerson: number; balance: number }
interface ActivityRow { id: string; name: string; estPrice: number; icon: string | null; description: string | null; isDone: boolean; participants: { userId: string; name: string | null; email: string; status: string }[] }

const CATEGORIES = ['Accommodation', 'Transport', 'Food', 'Activity', 'Drinks', 'Other']

export default function AdminTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [approved, setApproved] = useState<ApprovedEmail[]>([])
  const [billing, setBilling] = useState<BillingSummary[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [poolInput, setPoolInput] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '', category: 'Accommodation', splitAll: true })
  const [notifForm, setNotifForm] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [section, setSection] = useState<'crew' | 'activities' | 'expenses' | 'announce'>('crew')
  const [toggling, setToggling] = useState<string | null>(null)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [activityForm, setActivityForm] = useState({ icon: '', name: '', estPrice: '', description: '' })

  async function loadData() {
    try {
      const [usersRes, billingRes, actRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/billing/all'),
        api.get('/activities'),
      ])
      setUsers(usersRes.data.users)
      setApproved(usersRes.data.approved)
      setBilling(billingRes.data)
      setActivities(actRes.data)
      if (billingRes.data[0]?.poolPerPerson) setPoolInput(String(billingRes.data[0].poolPerPerson))
    } catch { toast.error('Could not load admin data') }
  }

  useEffect(() => { loadData() }, [])

  async function sendInvite(email: string) {
    if (!email.trim()) { toast.error('Enter an email'); return }
    try {
      await api.post('/admin/send-invite', { email: email.trim() })
      toast.success(`Invite sent to ${email}`)
      setInviteEmail('')
      loadData()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  async function addUserActivity(activityId: string, userId: string) {
    const key = `${activityId}-${userId}-add`
    setToggling(key)
    try {
      await api.post(`/admin/activities/${activityId}/add-user/${userId}`)
      await loadData()
    } catch { toast.error('Failed') }
    finally { setToggling(null) }
  }

  async function removeUserActivity(activityId: string, userId: string) {
    const key = `${activityId}-${userId}-rem`
    setToggling(key)
    try {
      await api.post(`/admin/activities/${activityId}/remove-user/${userId}`)
      await loadData()
    } catch { toast.error('Failed') }
    finally { setToggling(null) }
  }

  async function addExpense() {
    if (!expenseForm.name || !expenseForm.amount) { toast.error('Name and amount required'); return }
    try {
      await api.post('/expenses', {
        name: expenseForm.name, amount: parseFloat(expenseForm.amount),
        category: expenseForm.category, splitAll: expenseForm.splitAll
      })
      toast.success('Expense added and split!')
      setExpenseForm({ name: '', amount: '', category: 'Accommodation', splitAll: true })
      loadData()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  async function updatePool() {
    try {
      await api.patch('/config', { poolPerPerson: parseFloat(poolInput) || 0 })
      toast.success('Pool updated')
      loadData()
    } catch { toast.error('Failed') }
  }

  async function seedDefaults() {
    try {
      await api.post('/admin/seed', {})
      toast.success('Itinerary + activities seeded!')
      loadData()
    } catch { toast.error('Failed to seed') }
  }

  async function sendNotification() {
    if (!notifForm.subject || !notifForm.body) { toast.error('Subject and body required'); return }
    setSending(true)
    try {
      const res = await api.post('/admin/notify-all', notifForm)
      toast.success(`Sent to ${res.data.sent} people!`)
      setNotifForm({ subject: '', body: '' })
    } catch { toast.error('Failed') }
    finally { setSending(false) }
  }

  async function addActivity() {
    if (!activityForm.name.trim()) { toast.error('Activity name required'); return }
    try {
      await api.post('/activities', {
        name: activityForm.name.trim(),
        estPrice: parseFloat(activityForm.estPrice) || 0,
        icon: activityForm.icon.trim() || null,
        description: activityForm.description.trim() || null,
      })
      toast.success('Activity added!')
      setActivityForm({ icon: '', name: '', estPrice: '', description: '' })
      setShowAddActivity(false)
      loadData()
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed') }
  }

  // Show only onboarded users, deduplicated by email (avoid duplicate rows)
  const joinedUsers = Array.from(
    new Map(users.filter(u => u.onboarded).map(u => [u.email, u])).values()
  )
  const pendingEmails = approved.filter(a => !users.find(u => u.email === a.email && u.onboarded))

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-dark">Admin Panel</h2>
          <p className="text-xs text-muted">Bullfrog Grazuasion Party</p>
        </div>
        <button onClick={seedDefaults}
          className="px-3 py-1.5 text-xs bg-accent/10 text-accent font-semibold rounded-xl hover:bg-accent/20">
          Seed
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {([
          ['crew', `Crew (${joinedUsers.length}/16)`],
          ['activities', (() => {
            const pending = activities.reduce((n, a) => n + a.participants.filter(p => p.status === 'PENDING').length, 0)
            return pending > 0 ? `Activities (${pending})` : 'Activities'
          })()],
          ['expenses', 'Expenses'],
          ['announce', 'Announce'],
        ] as const).map(([s, label]) => (
          <button key={s} onClick={() => setSection(s)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${section === s ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CREW ── */}
      {section === 'crew' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-dark mb-2">Invite someone</p>
            <div className="flex gap-2">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite(inviteEmail)}
                placeholder="their@email.com" type="email"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={() => sendInvite(inviteEmail)}
                className="px-4 py-2 bg-primary text-white text-sm rounded-xl font-semibold">Send</button>
            </div>
            <p className="text-[11px] text-muted mt-1.5">They'll get an email with a signup link</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-dark mb-3">Joined ({joinedUsers.length})</p>
            {joinedUsers.length === 0
              ? <p className="text-xs text-muted">No one has joined yet.</p>
              : <div className="space-y-3">
                {joinedUsers.map(u => (
                  <div key={u.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark">{u.name || '—'}</p>
                      <p className="text-xs text-muted truncate">{u.email}</p>
                      {u.idProof ? (
                        u.idProof.startsWith('data:image') ? (
                          <a href={u.idProof} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-primary font-medium mt-0.5 inline-block hover:underline">View ID photo</a>
                        ) : u.idProof.startsWith('data:application/pdf') ? (
                          <a href={u.idProof} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-primary font-medium mt-0.5 inline-block hover:underline">View ID PDF</a>
                        ) : (
                          <p className="text-[11px] text-accent font-medium mt-0.5">ID: {u.idProof}</p>
                        )
                      ) : (
                        u.role === 'ADMIN' ? (
                          <p className="text-[11px] text-muted mt-0.5">Admin</p>
                        ) : (
                          <p className="text-[11px] text-danger mt-0.5">No ID on file</p>
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted text-right shrink-0">
                      {u.phone && <p>{u.phone}</p>}
                      <p>{u.boozePref === 'yay' ? 'YAY' : u.boozePref === 'nah' ? 'NAH' : ''}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete user ${u.email}? This cannot be undone.`)) return
                              try {
                                await api.delete(`/admin/users/${u.id}`)
                                toast.success('User deleted')
                                loadData()
                              } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to delete user') }
                            }}
                            className="text-xs text-danger hover:opacity-80"
                          >
                            Delete
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove all records for ${u.email}? This will delete all accounts and invites for this email.`)) return
                              try {
                                await api.post('/admin/users/delete-by-email', { email: u.email })
                                toast.success('All records removed for this email')
                                loadData()
                              } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed to remove by email') }
                            }}
                            className="text-xs text-danger/80 hover:opacity-80"
                          >
                            Remove all
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>

          {pendingEmails.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-dark mb-3">Pending ({pendingEmails.length})</p>
              <div className="space-y-2">
                {pendingEmails.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-muted">?</div>
                    <p className="flex-1 text-sm text-muted truncate">{a.email}</p>
                    <button onClick={() => sendInvite(a.email)}
                      className="text-xs text-primary font-semibold hover:opacity-80 shrink-0">
                      {a.invited ? 'Resend' : 'Invite'}
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Remove ${a.email} from guest list?`)) return
                      try {
                        await api.delete('/admin/approved-email', { data: { email: a.email } })
                        toast.success('Removed')
                        loadData()
                      } catch { toast.error('Failed to remove') }
                    }} className="text-xs text-danger hover:opacity-80 shrink-0">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {billing.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-dark">Settlement</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted">Pool $</span>
                  <input value={poolInput} onChange={e => setPoolInput(e.target.value)}
                    className="w-14 text-xs border border-gray-200 rounded-lg px-1.5 py-1 text-dark focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={updatePool} className="text-xs text-primary font-semibold ml-1">Save</button>
                </div>
              </div>
              <div className="space-y-1.5">
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

      {/* ── ACTIVITIES ── */}
      {section === 'activities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Check crew in. Cost bills when you mark done.</p>
            <button onClick={() => setShowAddActivity(v => !v)}
              className="text-sm text-primary font-semibold">
              {showAddActivity ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showAddActivity && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-dark">New activity</p>
              <input
                value={activityForm.icon}
                onChange={e => setActivityForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="Emoji (e.g. 🛶)"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={activityForm.name}
                onChange={e => setActivityForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Activity name *"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  value={activityForm.estPrice}
                  onChange={e => setActivityForm(f => ({ ...f, estPrice: e.target.value }))}
                  placeholder="Price per person (0 = free)"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <textarea
                value={activityForm.description}
                onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional details (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <button onClick={addActivity}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">
                Add Activity
              </button>
            </div>
          )}

          {activities.length === 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <p className="text-muted text-sm mb-2">No activities yet.</p>
              <button onClick={seedDefaults} className="text-xs text-primary font-semibold">Seed defaults</button>
            </div>
          )}
          {activities.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{a.icon || <ActivityIcon />}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-dark">{a.name}</h3>
                  <p className="text-xs text-muted">
                    {a.estPrice > 0 ? `$${a.estPrice}/person` : 'Free'} · {a.participants.length} in
                  </p>
                </div>
                {a.isDone && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Done</span>
                )}
              </div>
              {joinedUsers.length === 0
                ? <p className="text-xs text-muted">No crew joined yet.</p>
                : <div className="space-y-1">
                  {joinedUsers.map(u => {
                    const participant = a.participants.find(p => p.userId === u.id)
                    const isPending = participant?.status === 'PENDING'
                    const isApproved = participant?.status === 'APPROVED'
                    const count = participant?.count ?? 0
                    const addKey = `${a.id}-${u.id}-add`
                    const remKey = `${a.id}-${u.id}-rem`
                    return (
                      <div key={u.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all
                          ${isPending ? 'bg-amber-50 border border-amber-200' : isApproved ? 'bg-primary/5' : 'hover:bg-gray-50'}
                          ${a.isDone ? 'opacity-60' : ''}`}>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {(u.name || u.email)[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-dark flex-1 truncate">{u.name || u.email}</span>
                        {isPending && (
                          <span className="text-[10px] text-amber-600 font-semibold shrink-0">Requested</span>
                        )}
                        {isApproved && a.estPrice > 0 && (
                          <span className="text-xs font-semibold text-secondary shrink-0">${count * a.estPrice}</span>
                        )}
                        {/* Controls */}
                        {!a.isDone && isPending && (
                          <button
                            disabled={toggling === addKey}
                            onClick={() => addUserActivity(a.id, u.id)}
                            className="w-7 h-7 rounded-lg bg-green-500 text-white text-sm font-bold flex items-center justify-center hover:bg-green-600 shadow-sm shrink-0"
                            title="Approve"
                          >
                            {toggling === addKey ? '…' : '✓'}
                          </button>
                        )}
                        {!a.isDone && isApproved && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              disabled={toggling === remKey}
                              onClick={() => removeUserActivity(a.id, u.id)}
                              className="w-6 h-6 rounded-full bg-red-50 text-danger text-sm font-bold flex items-center justify-center hover:bg-red-100 transition-all"
                            >
                              {toggling === remKey ? '…' : '−'}
                            </button>
                            <span className="text-sm font-bold text-dark w-4 text-center">{count}</span>
                            <button
                              disabled={toggling === addKey}
                              onClick={() => addUserActivity(a.id, u.id)}
                              className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center hover:bg-primary/20 transition-all"
                            >
                              {toggling === addKey ? '…' : '+'}
                            </button>
                          </div>
                        )}
                        {!a.isDone && !isPending && !isApproved && (
                          <button
                            disabled={toggling === addKey}
                            onClick={() => addUserActivity(a.id, u.id)}
                            className="w-6 h-6 rounded-full bg-gray-100 text-muted text-sm font-bold flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                          >
                            {toggling === addKey ? '…' : '+'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              }
            </div>
          ))}
        </div>
      )}

      {/* ── EXPENSES ── */}
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
              <span className="text-sm text-dark">Split equally across all crew</span>
            </label>
            <button onClick={addExpense} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">
              Add &amp; Split
            </button>
          </div>
        </div>
      )}

      {/* ── ANNOUNCE ── */}
      {section === 'announce' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-dark">Send announcement to all</p>
            <p className="text-xs text-muted">Posts to Social tab + sends email to everyone</p>
            <input value={notifForm.subject} onChange={e => setNotifForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Subject / title"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
            <textarea value={notifForm.body} onChange={e => setNotifForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Message body..." rows={4}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            <button onClick={sendNotification} disabled={sending}
              className="w-full py-2.5 bg-secondary text-white rounded-xl font-semibold text-sm disabled:opacity-60">
              {sending ? 'Sending…' : 'Send to All'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
