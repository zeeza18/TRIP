import React, { useEffect, useState } from 'react'
import { ActivityIcon, TransportIcon, FoodIcon, DrinksIcon, OtherIcon } from '../components/Icons'
import toast from 'react-hot-toast'
import { api } from '../api'

interface Split {
  id: string
  share: number
  expense: { name: string; category: string; createdAt: string }
}

interface PendingActivity { id: string; name: string; estPrice: number; icon: string | null }

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

  const balance = data.poolPerPerson - data.total
  const hasPool = data.poolPerPerson > 0

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-dark mb-4">Your Billing</h2>

      {/* Balance card */}
      <div className={`rounded-2xl p-5 mb-5 shadow-sm text-white ${balance >= 0 ? 'bg-primary' : 'bg-danger'}`}>
        <p className="text-sm opacity-80 mb-1">{balance >= 0 ? 'You get back' : 'You owe admin'}</p>
        <p className="text-4xl font-bold">${Math.abs(balance).toFixed(2)}</p>
        {hasPool && (
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-xs opacity-80">
            <span>Pool contribution: ${data.poolPerPerson.toFixed(2)}</span>
            <span>Charged: ${data.total.toFixed(2)}</span>
          </div>
        )}
        {!hasPool && (
          <p className="text-xs opacity-70 mt-2">Total charged to you: ${data.total.toFixed(2)}</p>
        )}
      </div>

      {/* Pending activities */}
      {data.pendingActivities?.length > 0 && (
        <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-secondary mb-2">Pending activity charges</p>
          <div className="space-y-1.5">
            {data.pendingActivities.map(a => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-sm text-dark">{a.name}</span>
                <span className="text-sm font-semibold text-secondary">+${a.estPrice.toFixed(2)}</span>
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
          <h3 className="text-sm font-semibold text-dark mb-2">Expense breakdown</h3>
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
          <div className="text-5xl mb-3">No expenses</div>
          <p className="text-muted text-sm">No expenses charged yet.</p>
          <p className="text-muted text-xs mt-1">Admin will add expenses as the trip progresses.</p>
        </div>
      )}
    </div>
  )
}
