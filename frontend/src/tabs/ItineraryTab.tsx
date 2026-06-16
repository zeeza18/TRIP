import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Item { id: string; date: string; time: string | null; title: string; info: string | null; order: number }

const DAY_LABELS: Record<string, string> = {
  '2026-06-16': 'Mon Jun 16 · Arrival Day',
  '2026-06-17': 'Tue Jun 17 · Main Day',
  '2026-06-18': 'Wed Jun 18 · Checkout Day',
}

const DOT_COLORS = ['bg-primary', 'bg-secondary', 'bg-accent']

function formatTime(t: string | null): string {
  if (!t) return ''
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return t
  const h = parseInt(m[1]), min = m[2]
  const h12 = h % 12 || 12
  return `${h12}:${min} ${h >= 12 ? 'PM' : 'AM'}`
}

function timeToMinutes(t: string | null): number | null {
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

function isPast(date: string, time: string | null): boolean {
  const now = new Date()
  const y = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const today = `${y}-${mo}-${d}`
  if (date < today) return true
  if (date > today) return false
  if (!time) return false
  const mins = timeToMinutes(time)
  if (mins === null) return false
  return mins < now.getHours() * 60 + now.getMinutes()
}

function renderInfo(info: string) {
  const parts = info.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    part.match(/^https?:\/\//)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">Link</a>
      : <span key={i}>{part}</span>
  )
}

const INPUT_CLS = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary'

export default function ItineraryTab() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '2026-06-16', time: '', title: '', info: '' })
  const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ date: '2026-06-16', time: '', title: '', info: '' })

  async function load() {
    try {
      const res = await api.get('/itinerary')
      setItems(res.data)
    } catch { toast.error('Could not load itinerary') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('itinerary:reload', handler)
    return () => window.removeEventListener('itinerary:reload', handler)
  }, [])

  async function addItem() {
    if (!form.title) { toast.error('Title is required'); return }
    const order = timeToMinutes(form.time) ?? 9999
    try {
      await api.post('/itinerary', { ...form, order })
      toast.success('Added!')
      setShowForm(false)
      setForm({ date: '2026-06-16', time: '', title: '', info: '' })
      load()
    } catch { toast.error('Failed to add item') }
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditForm({
      date: item.date.slice(0, 10),
      time: item.time ?? '',
      title: item.title,
      info: item.info ?? '',
    })
    // Close info panel if open
    setExpandedInfo(prev => { const s = new Set(prev); s.delete(item.id); return s })
  }

  async function saveEdit(id: string) {
    if (!editForm.title) { toast.error('Title is required'); return }
    const order = timeToMinutes(editForm.time) ?? 9999
    try {
      await api.patch(`/itinerary/${id}`, { ...editForm, order })
      toast.success('Updated!')
      setEditingId(null)
      load()
    } catch { toast.error('Failed to update') }
  }

  async function deleteItem(id: string) {
    try { await api.delete(`/itinerary/${id}`); load() }
    catch { toast.error('Failed to delete') }
  }

  function toggleInfo(id: string) {
    setExpandedInfo(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const upcoming = items.filter(item => !isPast(item.date, item.time))

  const grouped = upcoming.reduce<Record<string, Item[]>>((acc, item) => {
    const d = item.date.slice(0, 10)
    acc[d] = acc[d] || []
    acc[d].push(item)
    return acc
  }, {})

  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => {
      const am = timeToMinutes(a.time), bm = timeToMinutes(b.time)
      if (am !== null && bm !== null) return am - bm
      if (am !== null) return -1
      if (bm !== null) return 1
      return a.order - b.order
    })
  )

  if (loading) return <div className="flex justify-center py-20">Loading...</div>

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-dark">Trip Itinerary</h2>
        {isAdmin && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null) }}
            className="text-sm text-primary font-semibold">
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <select value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={INPUT_CLS}>
            <option value="2026-06-16">Jun 16 — Arrival</option>
            <option value="2026-06-17">Jun 17 — Main Day</option>
            <option value="2026-06-18">Jun 18 — Checkout</option>
          </select>
          <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={INPUT_CLS} />
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title *" className={INPUT_CLS} />
          <input value={form.info} onChange={e => setForm(f => ({ ...f, info: e.target.value }))}
            placeholder="Details or paste a link (optional)" className={INPUT_CLS} />
          <button onClick={addItem} className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold text-sm">Add Item</button>
        </div>
      )}

      {Object.keys(grouped).sort().map((date, di) => (
        <div key={date} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${DOT_COLORS[di % DOT_COLORS.length]}`} />
            <h3 className="font-bold text-dark text-sm">{DAY_LABELS[date] || date}</h3>
          </div>
          <div className="relative pl-4 border-l-2 border-gray-100 space-y-3">
            {grouped[date].map(item => (
              <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm">
                {isAdmin && editingId === item.id ? (
                  <div className="space-y-2">
                    <select value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className={INPUT_CLS}>
                      <option value="2026-06-16">Jun 16 — Arrival</option>
                      <option value="2026-06-17">Jun 17 — Main Day</option>
                      <option value="2026-06-18">Jun 18 — Checkout</option>
                    </select>
                    <input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} className={INPUT_CLS} />
                    <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Title *" className={INPUT_CLS} />
                    <input value={editForm.info} onChange={e => setEditForm(f => ({ ...f, info: e.target.value }))}
                      placeholder="Details or paste a link (optional)" className={INPUT_CLS} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => saveEdit(item.id)}
                        className="flex-1 py-2 bg-primary text-white rounded-xl font-semibold text-sm">Save</button>
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 py-2 bg-gray-100 text-dark rounded-xl font-semibold text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {item.time && (
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5">
                          {formatTime(item.time)}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-dark">{item.title}</p>
                      {expandedInfo.has(item.id) && item.info && (
                        <p className="text-xs text-muted mt-1 leading-relaxed">{renderInfo(item.info)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.info && (
                        <button onClick={() => toggleInfo(item.id)}
                          className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center transition-colors
                            ${expandedInfo.has(item.id) ? 'bg-primary text-white border-primary' : 'text-muted border-gray-300 hover:border-primary hover:text-primary'}`}>
                          i
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={() => startEdit(item)}
                            className="text-muted hover:text-primary transition-colors text-xs px-1">✏️</button>
                          <button onClick={() => deleteItem(item.id)}
                            className="text-danger hover:opacity-70 transition-opacity text-xs px-1">×</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && !showForm && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-muted text-sm">No upcoming items.</p>
          {isAdmin && <p className="text-muted text-xs mt-1">Tap "+ Add" to schedule something</p>}
        </div>
      )}
    </div>
  )
}
