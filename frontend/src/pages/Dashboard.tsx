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

const TRIP_CARDS = [
  { emoji: '📅', title: 'The Dates', bg: 'bg-green-50', border: 'border-green-200', items: ['Check in on June 16 at 3:00 PM at Bullfrog Lake, Illinois', 'Check out on June 18 at 12:00 PM', 'Two nights and three days of real good memories'] },
  { emoji: '🎒', title: 'What to Bring', bg: 'bg-blue-50', border: 'border-blue-200', items: ['One bag only. A school bag or a backpack. That is it.', 'Your own toothbrush and personal toiletries', 'A thin blanket', 'A neck pillow only if you need one', 'Your own water bottle', 'Any personal medications you need', 'Your own snacks and your own alcohol', 'One microwaveable mug', 'It might rain so bring an umbrella'] },
  { emoji: '✅', title: 'We Have Got the Basic Necessities', bg: 'bg-emerald-50', border: 'border-emerald-200', items: ['Food and basic non alcoholic drinks are sorted', 'Paper towels, tissues, and a few other basic essentials', 'Games and activities are fully planned and ready', 'Just show up and enjoy'] },
  { emoji: '👗', title: 'What to Wear and Pack', bg: 'bg-orange-50', border: 'border-orange-200', items: ['Wear comfortable clothes. Full length pants and full sleeve shirts are highly recommended because of mosquitoes and insects.', 'Bring your grooming and personal belongings', 'Pack one or two quick dry or light clothes in case you go kayaking or step into the water', 'Comfortable footwear only please'] },
  { emoji: '🚻', title: 'Restrooms', bg: 'bg-yellow-50', border: 'border-yellow-200', items: ['Restrooms are roughly a 0.5 mile walk from the campsite', 'Only public restrooms are available. There are no shower or bathing facilities on site.', 'This is camping so plan accordingly', 'For people on their monthly cycle please take this into consideration before packing'] },
  { emoji: '🎣', title: 'Want to Fish?', bg: 'bg-sky-50', border: 'border-sky-200', items: ['Get your fishing license before you come', 'Bring your own fishing rod', 'Align with the group on timing so everyone is on the same page'] },
  { emoji: '🎂', title: "It is Zeeza's Birthday!", bg: 'bg-pink-50', border: 'border-pink-200', items: ["June 17 is Zeeza's birthday. Please come with a gift for the sweet boy.", 'Let us make it a moment he actually remembers', 'Something thoughtful goes a long way'] },
  { emoji: '💚', title: 'The Vibe', bg: 'bg-purple-50', border: 'border-purple-200', items: ['Only love on this trip. No drama, no fights, no rage baiting.', 'Come as you are. No judgment here.', 'No violence and no disrespect toward anyone.', 'If anything feels off, Azeez has got you. Just come to him.'] },
]

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
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('activeTab') as Tab) || 'itinerary')
  const [notifCount, setNotifCount] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
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
    localStorage.setItem('activeTab', t)
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
        <span className="text-lg font-bold min-w-0 flex-1 truncate mr-3">Bullfrog Grazuasion Party 🐸</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInfo(true)}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            title="Trip info"
          >
            <span className="text-white font-bold text-sm leading-none">i</span>
          </button>
          <button onClick={logout} className="text-xs opacity-80 hover:opacity-100 font-medium">
            {user?.name?.split(' ')[0] || user?.email?.split('@')[0]} ↩
          </button>
        </div>
      </header>

      {/* Trip info sheet */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-background rounded-t-2xl flex flex-col"
            style={{ maxHeight: '88vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-white rounded-t-2xl border-b border-gray-100">
              <div>
                <h2 className="font-black text-dark text-base">Trip Info</h2>
                <p className="text-[11px] text-muted">Bullfrog Lake · June 16–18, 2026</p>
              </div>
              <button onClick={() => setShowInfo(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-muted text-lg leading-none hover:bg-gray-200">×</button>
            </div>
            <div className="overflow-y-auto px-4 py-4 space-y-4 pb-8">
              {TRIP_CARDS.map(card => (
                <div key={card.title} className={`rounded-2xl border ${card.bg} ${card.border} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{card.emoji}</span>
                    <h3 className="text-sm font-bold text-dark">{card.title}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {card.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
