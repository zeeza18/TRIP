import React, { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { ActivityIcon, TransportIcon, FoodIcon, DrinksIcon, OtherIcon, WalletIcon, BillingIcon } from '../components/Icons'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Split {
  id: string
  share: number
  expense: { name: string; category: string; createdAt: string }
}

interface PendingActivity { id: string; name: string; estPrice: number; icon: string | null; count: number; subtotal: number }

interface BillingData {
  total: number
  splits: Split[]
  poolPerPerson: number
  pendingActivities: PendingActivity[]
  pendingActivityCost: number
}

interface CrewMember {
  id: string
  name: string | null
  email: string
  totalCharged: number
  poolPerPerson: number
  balance: number
}

const CAT_COLORS: Record<string, string> = {
  Accommodation: 'bg-blue-100 text-blue-700',
  Transport:     'bg-purple-100 text-purple-700',
  Food:          'bg-orange-100 text-orange-700',
  Activity:      'bg-teal-100 text-teal-700',
  Drinks:        'bg-pink-100 text-pink-700',
  Other:         'bg-gray-100 text-gray-600',
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  Accommodation: <ActivityIcon />,
  Transport:     <TransportIcon />,
  Food:          <FoodIcon />,
  Activity:      <ActivityIcon />,
  Drinks:        <DrinksIcon />,
  Other:         <OtherIcon />,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function SplitRow({ s, onDelete, onEdit }: {
  s: Split
  onDelete: (id: string) => void
  onEdit: (id: string, share: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(s.share))

  function confirm() {
    const n = parseFloat(val)
    if (isNaN(n) || n < 0) { toast.error('Enter a valid amount'); return }
    onEdit(s.id, n)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border-b border-gray-50 last:border-0">
      <div className="text-lg w-7 text-center shrink-0">{CAT_ICONS[s.expense.category] || ''}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark truncate">{s.expense.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CAT_COLORS[s.expense.category] || CAT_COLORS.Other}`}>
            {s.expense.category}
          </span>
          <span className="text-[10px] text-muted">{formatDate(s.expense.createdAt)}</span>
        </div>
      </div>
      {editing ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted">$</span>
          <input
            type="number" value={val} onChange={e => setVal(e.target.value)}
            className="w-16 px-1.5 py-1 text-sm border border-primary rounded-lg focus:outline-none"
            autoFocus
          />
          <button onClick={confirm} className="text-xs text-white bg-primary px-2 py-1 rounded-lg">Save</button>
          <button onClick={() => { setEditing(false); setVal(String(s.share)) }} className="text-xs text-muted">✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-dark">−${s.share.toFixed(2)}</span>
          <button onClick={() => setEditing(true)} title="Edit" className="text-muted hover:text-primary transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414A2 2 0 019.586 13z" />
            </svg>
          </button>
          <button onClick={() => onDelete(s.id)} title="Remove" className="text-muted hover:text-red-500 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function CrewWalletCard({ member, poolPerPerson }: { member: CrewMember; poolPerPerson: number }) {
  const [open, setOpen] = useState(false)
  const [splits, setSplits] = useState<Split[]>([])
  const [loadingSplits, setLoadingSplits] = useState(false)
  const [localMember, setLocalMember] = useState(member)

  useEffect(() => { setLocalMember(member) }, [member])

  async function fetchSplits() {
    if (splits.length > 0) return
    setLoadingSplits(true)
    try {
      const res = await api.get(`/billing/user/${member.id}`)
      setSplits(res.data)
    } catch { toast.error('Could not load transactions') }
    finally { setLoadingSplits(false) }
  }

  function toggle() {
    if (!open) fetchSplits()
    setOpen(o => !o)
  }

  async function handleDelete(splitId: string) {
    try {
      await api.delete(`/billing/split/${splitId}`)
      const removed = splits.find(s => s.id === splitId)
      setSplits(prev => prev.filter(s => s.id !== splitId))
      if (removed) {
        setLocalMember(m => ({
          ...m,
          totalCharged: +(m.totalCharged - removed.share).toFixed(2),
          balance: +(m.balance + removed.share).toFixed(2),
        }))
      }
      toast.success('Charge removed')
    } catch { toast.error('Could not remove charge') }
  }

  async function handleEdit(splitId: string, share: number) {
    try {
      const old = splits.find(s => s.id === splitId)
      await api.patch(`/billing/split/${splitId}`, { share })
      setSplits(prev => prev.map(s => s.id === splitId ? { ...s, share } : s))
      if (old) {
        const diff = share - old.share
        setLocalMember(m => ({
          ...m,
          totalCharged: +(m.totalCharged + diff).toFixed(2),
          balance: +(m.balance - diff).toFixed(2),
        }))
      }
      toast.success('Amount updated')
    } catch { toast.error('Could not update amount') }
  }

  const bal = localMember.balance
  const pct = poolPerPerson > 0 ? Math.min(100, (localMember.totalCharged / poolPerPerson) * 100) : 0

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{(localMember.name || localMember.email)[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark truncate">{localMember.name || localMember.email}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 90 ? '#ef4444' : '#1F6F4A' }} />
            </div>
            <span className="text-[10px] text-muted">${localMember.totalCharged.toFixed(2)} spent</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${bal < 0 ? 'text-red-500' : 'text-primary'}`}>
            {bal < 0 ? '-' : ''}${Math.abs(bal).toFixed(2)}
          </p>
          <p className="text-[10px] text-muted">{bal < 0 ? 'owes admin' : 'remaining'}</p>
        </div>
        <svg className={`w-4 h-4 text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {loadingSplits ? (
            <p className="text-xs text-muted text-center py-4">Loading...</p>
          ) : splits.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">No charges yet</p>
          ) : (
            <div>
              <p className="text-[10px] font-semibold text-muted px-3 py-1.5 bg-gray-50">
                Transactions · tap pencil to correct, ✕ to remove
              </p>
              {splits.map(s => (
                <SplitRow key={s.id} s={s} onDelete={handleDelete} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BillingTab() {
  const { isAdmin } = useAuth()
  const [data, setData] = useState<BillingData | null>(null)
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)

  async function load() {
    try {
      const [meRes, crewRes] = await Promise.all([
        api.get('/billing/me'),
        isAdmin ? api.get('/billing/all') : Promise.resolve({ data: [] }),
      ])
      setData(meRes.data)
      if (isAdmin) setCrew(crewRes.data)
    } catch { toast.error('Could not load billing') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const poll = setInterval(load, 30_000)
    const token = localStorage.getItem('accessToken')
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4001', { auth: { token } })
    socketRef.current = socket
    socket.on('billing:update', load)
    socket.on('expense:new', load)
    return () => { clearInterval(poll); socket.disconnect() }
  }, [])

  if (loading) return <div className="flex justify-center py-20">Loading...</div>
  if (!data) return null

  const totalSpent = data.total + data.pendingActivityCost
  const balance = data.poolPerPerson - totalSpent
  const hasPool = data.poolPerPerson > 0
  const pct = hasPool ? Math.min(100, (totalSpent / data.poolPerPerson) * 100) : 0

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-dark mb-4">Your Wallet</h2>

      {/* Wallet card */}
      <div className="rounded-2xl p-5 mb-5 shadow-sm bg-primary text-white">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs opacity-70">Remaining balance</p>
          <WalletIcon className="opacity-80 w-8 h-8" />
        </div>
        <p className={`text-4xl font-bold mb-3 ${balance < 0 ? 'text-red-300' : ''}`}>
          {balance < 0 ? '-' : ''}${Math.abs(balance).toFixed(2)}
        </p>
        {hasPool && (
          <div className="mb-3">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct > 90 ? '#ef4444' : 'rgba(255,255,255,0.7)' }} />
            </div>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-xs opacity-70">Budget</p>
            <p className="font-semibold">${data.poolPerPerson.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Spent</p>
            <p className="font-semibold">−${totalSpent.toFixed(2)}</p>
          </div>
        </div>
        {balance < 0 && (
          <p className="text-xs mt-2 bg-white/10 rounded-lg px-3 py-1.5 text-center">
            Over budget by ${Math.abs(balance).toFixed(2)} — owe admin
          </p>
        )}
      </div>

      {/* Admin — all crew wallets */}
      {isAdmin && crew.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-dark mb-2">All Crew Wallets</h3>
          <div className="space-y-2">
            {crew.map(m => (
              <CrewWalletCard key={m.id} member={m} poolPerPerson={m.poolPerPerson} />
            ))}
          </div>
        </div>
      )}

      {/* Pending activities */}
      {data.pendingActivities?.length > 0 && (
        <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-secondary mb-2">Pending activity charges</p>
          <div className="space-y-1.5">
            {data.pendingActivities.map(a => (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-dark">{a.name}</span>
                  {a.count > 1 && <span className="text-xs text-muted ml-1">×{a.count}</span>}
                </div>
                <span className="text-sm font-semibold text-secondary">+${a.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-secondary/20 flex justify-between text-xs font-semibold text-secondary">
            <span>Total pending</span>
            <span>${data.pendingActivityCost.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Added to your bill when admin marks activity done</p>
        </div>
      )}

      {/* My purchase history */}
      {data.splits.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-dark mb-2">Purchase history</h3>
          {data.splits.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="text-xl w-8 text-center">{CAT_ICONS[s.expense.category] || ''}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">{s.expense.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CAT_COLORS[s.expense.category] || CAT_COLORS.Other}`}>
                    {s.expense.category}
                  </span>
                  <span className="text-[10px] text-muted">{formatDate(s.expense.createdAt)}</span>
                </div>
              </div>
              <div className="text-sm font-bold text-dark shrink-0">−${s.share.toFixed(2)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="flex justify-center mb-3 text-gray-300">
            <BillingIcon className="w-12 h-12" />
          </div>
          <p className="text-muted text-sm">No purchases yet.</p>
          <p className="text-muted text-xs mt-1">Your spending history will appear here.</p>
        </div>
      )}
    </div>
  )
}
