import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ItineraryTab from '../tabs/ItineraryTab'
import SocialTab from '../tabs/SocialTab'
import ActivitiesTab from '../tabs/ActivitiesTab'
import BillingTab from '../tabs/BillingTab'
import AdminTab from '../tabs/AdminTab'

type Tab = 'itinerary' | 'social' | 'activities' | 'billing' | 'admin'

function countdown() {
  const trip = new Date('2026-06-16')
  const now = new Date()
  const diff = Math.ceil((trip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return "It's happening! 🎉"
  if (diff === 1) return '1 day to go!'
  return `${diff} days to go`
}

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('itinerary')
  const [notifCount, setNotifCount] = useState(0)

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'itinerary',  label: 'Itinerary',   icon: '🗓' },
    { id: 'social',     label: 'Social',       icon: '💬' },
    { id: 'activities', label: 'Activities',   icon: '🏕' },
    { id: 'billing',    label: 'Billing',      icon: '💰' },
    ...(isAdmin ? [{ id: 'admin' as Tab, label: 'Admin', icon: '⚙️' }] : [])
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Fixed header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-20 bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
        <span className="text-lg font-bold">Bullfrog Bash 🐸</span>
        <span className="text-xs opacity-70 bg-white/10 px-2 py-1 rounded-full">{countdown()}</span>
        <button
          onClick={logout}
          className="text-xs opacity-80 hover:opacity-100 font-medium"
        >
          {user?.name?.split(' ')[0] || user?.email?.split('@')[0]} ↩
        </button>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
        {tab === 'itinerary'  && <ItineraryTab />}
        {tab === 'social'     && <SocialTab />}
        {tab === 'activities' && <ActivitiesTab />}
        {tab === 'billing'    && <BillingTab />}
        {tab === 'admin'      && isAdmin && <AdminTab />}
      </main>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-20 bg-white border-t border-gray-100 flex shadow-lg">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              tab === t.id ? 'text-primary' : 'text-muted'
            }`}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className={`text-[10px] font-medium mt-0.5 ${tab === t.id ? 'text-primary' : 'text-muted'}`}>
              {t.label}
            </span>
            {tab === t.id && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
