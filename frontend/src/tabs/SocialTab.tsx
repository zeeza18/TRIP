import React, { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Reaction { id: string; messageId: string; userId: string; emoji: string }
interface Sender { id: string; name: string | null; email: string }
interface Message { id: string; senderId: string; sender: Sender; body: string; createdAt: string; reactions: Reaction[] }
interface Announcement { id: string; title: string; body: string }

const EMOJIS = ['🐸']

function initials(sender: Sender) {
  if (sender.name) return sender.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return sender.email[0].toUpperCase()
}

function displayName(sender: Sender) {
  return sender.name || sender.email.split('@')[0]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function SocialTab() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    api.get('/messages').then(res => setMessages(res.data))
    api.get('/announcements').then(res => setAnnouncements(res.data))

    const token = localStorage.getItem('accessToken') || ''
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4001', { auth: { token } })
    socketRef.current = socket

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    socket.on('reaction:update', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
    })

    socket.on('users:online', (ids: string[]) => setOnlineCount(ids.length))

    socket.on('announcement:new', (a: Announcement) => {
      setAnnouncements(prev => [a, ...prev])
      toast(a.title)
    })

    return () => { socket.disconnect() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    const body = text.trim()
    if (!body) return
    socketRef.current?.emit('message:send', { body })
    setText('')
  }

  function react(messageId: string, emoji: string) {
    socketRef.current?.emit('reaction:add', { messageId, emoji })
    setPickerFor(null)
  }

  const latestAnnouncement = announcements[0]

  return (
    <div className="flex flex-col h-[calc(100vh-128px)]">
      {/* Online bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        <span className="text-xs text-muted">{onlineCount} online now</span>
      </div>

      {/* Announcement banner */}
      {latestAnnouncement && latestAnnouncement.id !== dismissedAnnouncement && (
        <div className="mx-4 mt-3 bg-secondary/15 border border-secondary/30 rounded-xl p-3 flex items-start gap-3">
          <span className="text-xl">Announcement</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-dark">{latestAnnouncement.title}</p>
            <p className="text-xs text-muted mt-0.5 truncate">{latestAnnouncement.body}</p>
          </div>
          <button onClick={() => setDismissedAnnouncement(latestAnnouncement.id)} className="text-muted text-xs shrink-0">x</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" onClick={() => setPickerFor(null)}>
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">Messages</div>
            <p className="text-muted text-sm">No messages yet. Say hi!</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === user?.id
          const reactionGroups: Record<string, number> = {}
          msg.reactions.forEach(r => { reactionGroups[r.emoji] = (reactionGroups[r.emoji] || 0) + 1 })

          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-auto">
                  {initials(msg.sender)}
                </div>
              )}
              <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && <p className="text-[10px] text-muted mb-1 ml-1">{displayName(msg.sender)}</p>}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-snug relative cursor-pointer ${
                    isOwn ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-dark shadow-sm rounded-bl-sm'
                  }`}
                  onClick={e => { e.stopPropagation(); setPickerFor(pickerFor === msg.id ? null : msg.id) }}
                >
                  {msg.body}
                </div>
                {/* Reactions */}
                {Object.keys(reactionGroups).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(reactionGroups).map(([emoji, count]) => (
                      <button key={emoji} onClick={() => react(msg.id, emoji)}
                        className="text-xs bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm hover:scale-110 transition-transform">
                        {emoji} {count > 1 ? count : ''}
                      </button>
                    ))}
                  </div>
                )}
                {/* Emoji picker */}
                {pickerFor === msg.id && (
                  <div className={`flex gap-1 mt-1 bg-white border border-gray-100 rounded-2xl px-2 py-1.5 shadow-md ${isOwn ? 'self-end' : 'self-start'}`}
                    onClick={e => e.stopPropagation()}>
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => react(msg.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </div>
                )}
                <p className={`text-[10px] text-muted mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2 items-center">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Message the crew..."
          className="flex-1 px-4 py-2.5 rounded-full bg-background text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all text-lg"
        >
          Send
        </button>
      </div>
    </div>
  )
}
