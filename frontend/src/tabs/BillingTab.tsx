import React, { useEffect, useState } from 'react'
import { ActivityIcon, TransportIcon, FoodIcon, DrinksIcon, OtherIcon, WalletIcon, BillingIcon } from '../components/Icons'
import toast from 'react-hot-toast'
import { api } from '../api'

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

export default function BillingTab() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await api.get('/billing/me')
      setData(res.data)
    } catch { toast.error('Could not load billing') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs opacity-70 mb-0.5">Trip budget</p>
            <p className="text-3xl font-bold">${data.poolPerPerson.toFixed(2)}</p>
          </div>
          <WalletIcon className="opacity-80 w-8 h-8" />
        </div>
        {/* Progress bar */}
        {hasPool && (
          <div className="mb-3">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct > 90 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}
              />
            </div>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-xs opacity-70">Spent</p>
            <p className="font-semibold">−${totalSpent.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Remaining</p>
            <p className={`font-bold text-lg ${balance < 0 ? 'text-red-300' : ''}`}>
              ${Math.max(0, balance).toFixed(2)}
            </p>
          </div>
        </div>
        {balance < 0 && (
          <p className="text-xs mt-2 bg-white/10 rounded-lg px-3 py-1.5 text-center">
            Over budget by ${Math.abs(balance).toFixed(2)} — owe admin
          </p>
        )}
      </div>

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

      {/* Expense list */}
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
