import React, { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { CalendarIcon, ChatIcon, ActivityIcon, BillingIcon, AdminIcon } from '../components/Icons'
import { useAuth } from '../contexts/AuthContext'
import ItineraryTab from '../tabs/ItineraryTab'
import SocialTab from '../tabs/SocialTab'
import ActivitiesTab from '../tabs/ActivitiesTab'
import BillingTab from '../tabs/BillingTab'
import AdminTab from '../tabs/AdminTab'
import { api } from '../api'

type Tab = 'itinerary' | 'social' | 'activities' | 'billing' | 'admin'

function countdown() {
  const trip = new Date('2026-06-16')
  const now = new Date()
  const diff = Math.ceil((trip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return "It's happening!"
  if (diff === 1) return '1 day to go!'
  return `${diff} days to go`
}

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('itinerary')
  const [notifCount, setNotifCount] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  async function loadNotifCount() {
    try {
      const res = await api.get('/notifications')
      setNotifCount(res.data.filter((n: any) => !n.read).length)
    } catch {}
  }

  async function markRead() {
    try {
      await api.patch('/notifications/read-all')
      setNotifCount(0)
    } catch {}
  }

  useEffect(() => {
    loadNotifCount()
    const poll = setInterval(loadNotifCount, 30_000)

    const token = localStorage.getItem('accessToken')
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4001', { auth: { token } })
    socketRef.current = socket
    socket.on('notification:new', () => setNotifCount(c => c + 1))
    socket.on('itinerary:update', () => window.dispatchEvent(new Event('itinerary:reload')))
    socket.on('activity:update', () => window.dispatchEvent(new Event('activity:reload')))

    return () => {
      clearInterval(poll)
      socket.disconnect()
    }
  }, [])

  function switchTab(t: Tab) {
    setTab(t)
    if (t === 'admin' && notifCount > 0) markRead()
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'itinerary',  label: 'Itinerary',   icon: <CalendarIcon /> },
    { id: 'social',     label: 'Social',       icon: <ChatIcon /> },
    { id: 'activities', label: 'Activities',   icon: <ActivityIcon /> },
    { id: 'billing',    label: 'Billing',      icon: <BillingIcon /> },
    ...(isAdmin ? [{ id: 'admin' as Tab, label: 'Admin', icon: <AdminIcon /> }] : [])
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Fixed header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-20 bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
        <span className="text-lg font-bold">Bullfrog Grazuasion Party 🐸</span>
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
            onClick={() => switchTab(t.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
              tab === t.id ? 'text-primary' : 'text-muted'
            }`}
          >
            <span className="text-xl leading-none relative inline-block">
              {t.icon}
              {t.id === 'admin' && notifCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </span>
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
