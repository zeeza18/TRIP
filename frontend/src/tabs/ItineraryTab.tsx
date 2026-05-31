import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Item { id: string; date: string; time: string | null; title: string; info: string | null; order: number }

const DAY_LABELS: Record<string, string> = {
  '2026-06-16': 'Mon Jun 16 · Arrival Day 🚗',
  '2026-06-17': 'Tue Jun 17 · Main Day 🏕',
  '2026-06-18': 'Wed Jun 18 · Checkout Day 👋',
}

const DOT_COLORS = ['bg-primary', 'bg-secondary', 'bg-accent']

export default function ItineraryTab() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '2026-06-16', time: '', title: '', info: '' })

  async function load() {
    try {
      const res = await api.get('/itinerary')
      setItems(res.data)
    } catch { toast.error('Could not load itinerary') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    if (!form.title) { toast.error('Title is required'); return }
    try {
      await api.post('/itinerary', form)
      toast.success('Added!')
      setShowForm(false)
      setForm({ date: '2026-06-16', time: '', title: '', info: '' })
      load()
    } catch { toast.error('Failed to add item') }
  }

  async function deleteItem(id: string) {
    try { await api.delete(`/itinerary/${id}`); load() }
    catch { toast.error('Failed to delete') }
  }

  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    const d = item.date.slice(0, 10)
    acc[d] = acc[d] || []
    acc[d].push(item)
    return acc
  }, {})

  if (loading) return <div className="flex justify-center py-20 text-4xl animate-bounce">🗓</div>

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-dark">Trip Itinerary</h2>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="text-sm text-primary font-semibold">
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <select value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="2026-06-16">Jun 16 — Arrival</option>
            <option value="2026-06-17">Jun 17 — Main Day</option>
            <option value="2026-06-18">Jun 18 — Checkout</option>
          </select>
          <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            placeholder="Time (e.g. 9:00 AM)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title *"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
          <input value={form.info} onChange={e => setForm(f => ({ ...f, info: e.target.value }))}
            placeholder="Details (optional)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary" />
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
              <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm relative group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.time && <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5">{item.time}</p>}
                    <p className="text-sm font-semibold text-dark">{item.title}</p>
                    {item.info && <p className="text-xs text-muted mt-0.5">{item.info}</p>}
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteItem(item.id)}
                      className="text-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && !showForm && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-muted text-sm">No itinerary yet.</p>
          {isAdmin && <p className="text-muted text-xs mt-1">Tap "+ Add" or use Admin → Seed defaults</p>}
        </div>
      )}
    </div>
  )
}
