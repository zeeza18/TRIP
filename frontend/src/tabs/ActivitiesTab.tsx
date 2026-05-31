import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Activity {
  id: string
  name: string
  estPrice: number
  icon: string | null
  isDone: boolean
  participantCount: number
  isParticipating: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  free: 'bg-green-100 text-green-700',
  paid: 'bg-secondary/10 text-secondary',
}

export default function ActivitiesTab() {
  const { isAdmin } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', estPrice: '', icon: '' })

  async function load() {
    try {
      const res = await api.get('/activities')
      setActivities(res.data)
    } catch { toast.error('Could not load activities') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleParticipate(id: string) {
    try {
      const res = await api.post(`/activities/${id}/participate`, {})
      setActivities(prev => prev.map(a =>
        a.id === id ? {
          ...a,
          isParticipating: res.data.participating,
          participantCount: a.participantCount + (res.data.participating ? 1 : -1)
        } : a
      ))
    } catch { toast.error('Failed to update') }
  }

  async function markDone(id: string) {
    try {
      await api.patch(`/activities/${id}`, { isDone: true })
      toast.success('Marked as done + expense created for participants!')
      load()
    } catch { toast.error('Failed') }
  }

  async function addActivity() {
    if (!form.name) { toast.error('Name is required'); return }
    try {
      await api.post('/activities', { name: form.name, estPrice: parseFloat(form.estPrice) || 0, icon: form.icon || null })
      toast.success('Activity added!')
      setShowForm(false)
      setForm({ name: '', estPrice: '', icon: '' })
      load()
    } catch { toast.error('Failed to add') }
  }

  async function deleteActivity(id: string) {
    try { await api.delete(`/activities/${id}`); load() }
    catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="flex justify-center py-20 text-4xl animate-bounce">🏕</div>

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
            placeholder="Icon emoji (e.g. 🛶)"
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
          <button onClick={addActivity} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">Add Activity</button>
        </div>
      )}

      <div className="space-y-3">
        {activities.map(a => (
          <div key={a.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${a.isDone ? 'border-green-400 opacity-80' : 'border-transparent'}`}>
            <div className="flex items-start gap-3">
              <div className="text-3xl w-10 text-center shrink-0">{a.icon || '🎯'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-dark text-sm">{a.name}</h3>
                  {a.isDone && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Done</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.estPrice > 0 ? CATEGORY_COLORS.paid : CATEGORY_COLORS.free}`}>
                    {a.estPrice > 0 ? `$${a.estPrice}/person` : 'Free'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">{a.participantCount} {a.participantCount === 1 ? 'person' : 'people'} in</p>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                {!a.isDone && (
                  <button
                    onClick={() => toggleParticipate(a.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                      a.isParticipating
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-dark hover:bg-gray-200'
                    }`}
                  >
                    {a.isParticipating ? "✓ I'm in" : "I'm in?"}
                  </button>
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
          <div className="text-5xl mb-3">🏕</div>
          <p className="text-muted text-sm">No activities yet.</p>
          {isAdmin && <p className="text-muted text-xs mt-1">Tap "+ Add" or use Admin → Seed defaults</p>}
        </div>
      )}
    </div>
  )
}
