import React, { useEffect, useState } from 'react'
import { ActivityIcon } from '../components/Icons'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Activity {
  id: string
  name: string
  estPrice: number
  icon: string | null
  description: string | null
  isDone: boolean
  participantCount: number
  isParticipating: boolean
  isPending: boolean
  userCount: number
  participants: { userId: string; name: string | null; email: string; status: string; count: number }[]
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g

function renderDescription(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX)
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    if (part.startsWith('http')) {
      const ytMatch = part.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (ytMatch) {
        nodes.push(
          <div key={i} className="mt-2 rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}`}
              className="w-full rounded-xl"
              style={{ aspectRatio: '16/9', display: 'block' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video"
            />
          </div>
        )
      } else {
        nodes.push(
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary underline text-xs break-all inline">
            {part}
          </a>
        )
      }
    } else {
      nodes.push(<span key={i}>{part}</span>)
    }
  }
  return <>{nodes}</>
}

export default function ActivitiesTab() {
  const { isAdmin } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', estPrice: '', icon: '', description: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    try {
      const res = await api.get('/activities')
      setActivities(res.data)
    } catch { toast.error('Could not load activities') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function sendRequest(id: string, currentStatus: 'none' | 'pending' | 'approved') {
    setBusy(id)
    try {
      const res = await api.post(`/activities/${id}/request`, {})
      const s = res.data.status
      if (s === 'none') {
        setActivities(prev => prev.map(a => a.id === id ? { ...a, isPending: false } : a))
        toast('Request cancelled.')
      } else if (s === 'pending') {
        setActivities(prev => prev.map(a => a.id === id ? { ...a, isPending: true } : a))
        toast.success('Request sent! Waiting for admin approval.')
      } else if (s === 'wants_more') {
        toast.success('Sent! Admin will add your extra spot.')
      }
    } catch { toast.error('Failed') }
    finally { setBusy(null) }
  }

  async function markDone(id: string) {
    try {
      await api.patch(`/activities/${id}`, { isDone: true })
      toast.success('Marked as done + expenses created!')
      load()
    } catch { toast.error('Failed') }
  }

  async function addActivity() {
    if (!form.name) { toast.error('Name is required'); return }
    try {
      await api.post('/activities', {
        name: form.name,
        estPrice: parseFloat(form.estPrice) || 0,
        icon: form.icon || null,
        description: form.description || null,
      })
      toast.success('Activity added!')
      setShowForm(false)
      setForm({ name: '', estPrice: '', icon: '', description: '' })
      load()
    } catch { toast.error('Failed to add') }
  }

  async function deleteActivity(id: string) {
    try { await api.delete(`/activities/${id}`); load() }
    catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="flex justify-center py-20">Loading...</div>

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-dark">Activities</h2>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="text-sm text-primary font-semibold">
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            placeholder="Emoji (e.g. 🛶)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Activity name *"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input type="number" value={form.estPrice} onChange={e => setForm(f => ({ ...f, estPrice: e.target.value }))}
              placeholder="Price per person (0 = free)"
              className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Additional details, links, etc. (optional)" rows={2}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          <button onClick={addActivity} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">Add Activity</button>
        </div>
      )}

      <div className="space-y-3">
        {activities.map(a => (
          <div key={a.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${a.isDone ? 'border-green-400 opacity-80' : 'border-transparent'}`}>
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="text-3xl w-10 text-center shrink-0 mt-0.5">{a.icon || <ActivityIcon />}</div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-dark text-sm">{a.name}</h3>
                  {a.isDone && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Done</span>
                  )}
                  {a.description && (
                    <button
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${expandedId === a.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500 hover:bg-primary/20'}`}
                    >i</button>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {a.participantCount} {a.participantCount === 1 ? 'spot' : 'spots'} taken
                </p>
                {a.description && expandedId === a.id && (
                  <div className="text-xs text-muted mt-1.5 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">
                    {renderDescription(a.description)}
                  </div>
                )}
                {a.isParticipating && a.estPrice > 0 && !a.isDone && (
                  <p className="text-xs text-secondary font-semibold mt-1">
                    +${a.userCount * a.estPrice} pending on your bill
                  </p>
                )}
                {a.isParticipating && a.estPrice > 0 && a.isDone && (
                  <p className="text-xs text-danger font-semibold mt-1">
                    ${a.userCount * a.estPrice} charged to your bill
                  </p>
                )}
              </div>

              {/* Right column: price + action */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Price badge */}
                {a.estPrice > 0 ? (
                  <div className="text-right bg-secondary/10 rounded-xl px-2.5 py-1.5">
                    <p className="text-base font-bold text-secondary leading-none">${a.estPrice}</p>
                    <p className="text-[10px] text-secondary/70 leading-none mt-0.5">/person</p>
                  </div>
                ) : (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2.5 py-1 rounded-xl font-semibold">Free</span>
                )}

                {/* Action buttons */}
                {!a.isDone && !a.isParticipating && !a.isPending && (
                  <button
                    disabled={busy === a.id}
                    onClick={() => sendRequest(a.id, 'none')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-dark hover:bg-primary/10 hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                  >
                    Request
                  </button>
                )}

                {!a.isDone && a.isPending && (
                  <button
                    disabled={busy === a.id}
                    onClick={() => sendRequest(a.id, 'pending')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Pending…
                  </button>
                )}

                {/* Approved: - N + counter */}
                {a.isParticipating && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled
                      className="w-6 h-6 rounded-full bg-gray-100 text-gray-300 text-sm font-bold flex items-center justify-center cursor-not-allowed"
                    >−</button>
                    <span className="text-sm font-bold text-dark w-5 text-center">{a.userCount}</span>
                    <button
                      disabled={busy === a.id || a.isDone}
                      onClick={() => sendRequest(a.id, 'approved')}
                      className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >+</button>
                  </div>
                )}

                {isAdmin && !a.isDone && (
                  <button onClick={() => markDone(a.id)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100">
                    Mark done
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => deleteActivity(a.id)} className="text-[10px] text-danger hover:opacity-80">delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && !showForm && (
        <div className="text-center py-16">
          <div className="text-2xl mb-3">No activities</div>
          <p className="text-muted text-sm">No activities yet.</p>
          {isAdmin && <p className="text-muted text-xs mt-1">Tap "+ Add" or use Admin → Seed defaults</p>}
        </div>
      )}
    </div>
  )
}
