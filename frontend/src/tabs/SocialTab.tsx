import React, { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Reaction { id: string; messageId: string; userId: string; emoji: string }
interface Sender { id: string; name: string | null; email: string }
interface Message { id: string; senderId: string; sender: Sender; body: string; createdAt: string; reactions: Reaction[] }
interface Announcement { id: string; title: string; body: string }
interface Member { id: string; name: string | null; email: string }

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

interface ComboMsg { img: string; caption: string }

function parseBody(body: string): { type: 'text' | 'image' | 'combo'; img?: string; caption?: string; text?: string } {
  if (body.startsWith('{')) {
    try {
      const p = JSON.parse(body) as ComboMsg
      if (p.img) return { type: p.caption ? 'combo' : 'image', img: p.img, caption: p.caption }
    } catch {}
  }
  if (body.startsWith('data:image')) return { type: 'image', img: body }
  return { type: 'text', text: body }
}

function notifBody(body: string) {
  const p = parseBody(body)
  if (p.type === 'text') return p.text!
  if (p.type === 'image') return 'Sent a photo'
  return p.caption ? `📷 ${p.caption}` : 'Sent a photo'
}

function compressImage(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function showNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' })
  }
}

const DISMISSED_KEY = 'dismissedAnnouncements'
function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')) } catch { return new Set() }
}
function saveDismissed(set: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
}

export default function SocialTab() {
  const { user, isAdmin } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [showCrew, setShowCrew] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed)
  const [text, setText] = useState('')
  const [actionFor, setActionFor] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [typingNames, setTypingNames] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestNotificationPermission()
    api.get('/messages').then(res => setMessages(res.data))
    api.get('/announcements').then(res => setAnnouncements(res.data))

    const token = localStorage.getItem('accessToken') || ''
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4001', { auth: { token } })
    socketRef.current = socket

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      if (msg.senderId !== user?.id) {
        showNotification(displayName(msg.sender), notifBody(msg.body))
      }
    })

    socket.on('message:delete', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    })

    socket.on('message:edit', (updated: Message) => {
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    })

    socket.on('reaction:update', ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))
    })

    socket.on('users:online', (ids: string[]) => {
      setOnlineCount(ids.length)
      setOnlineIds(new Set(ids))
    })

    socket.on('announcement:new', (a: Announcement) => {
      setAnnouncements(prev => [a, ...prev])
      toast(a.title)
    })

    socket.on('announcement:delete', ({ id }: { id: string }) => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    })

    socket.on('typing:update', (names: string[]) => setTypingNames(names))

    return () => { socket.disconnect() }
  }, [user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  function emitTyping() {
    socketRef.current?.emit('typing:start')
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing:stop'), 2000)
  }

  function send() {
    const caption = text.trim()
    const body = imagePreview
      ? (caption ? JSON.stringify({ img: imagePreview, caption }) : imagePreview)
      : caption
    if (!body) return
    socketRef.current?.emit('message:send', { body })
    socketRef.current?.emit('typing:stop')
    if (typingTimer.current) clearTimeout(typingTimer.current)
    setText('')
    setImagePreview(null)
  }

  function react(messageId: string, emoji: string) {
    socketRef.current?.emit('reaction:add', { messageId, emoji })
    setActionFor(null)
  }

  function deleteMessage(messageId: string) {
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setActionFor(null)
    socketRef.current?.emit('message:delete', { messageId })
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id)
    setEditText(msg.body)
    setActionFor(null)
  }

  function submitEdit(messageId: string) {
    const body = editText.trim()
    if (body) socketRef.current?.emit('message:edit', { messageId, body })
    setEditingId(null)
    setEditText('')
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setImagePreview(compressed)
    e.target.value = ''
  }

  async function loadMembers() {
    if (members.length > 0) return
    try { const res = await api.get('/users'); setMembers(res.data) } catch {}
  }

  async function dismissAnnouncement(id: string) {
    if (isAdmin) {
      try {
        await api.delete(`/announcements/${id}`)
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      } catch { toast.error('Could not delete announcement') }
    } else {
      const next = new Set(dismissed)
      next.add(id)
      setDismissed(next)
      saveDismissed(next)
    }
  }

  const latestAnnouncement = announcements[0]

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] bg-[#f0f2f5]">
      {/* Header */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-dark">The Crew</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            <span className="text-[11px] text-muted">{onlineCount} online</span>
          </div>
        </div>
        <button
          onClick={() => { setShowCrew(true); loadMembers() }}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-muted hover:text-primary hover:bg-primary/10 transition-colors"
          title="View crew"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 10-8 0 4 4 0 008 0zm6 0a3 3 0 10-6 0 3 3 0 006 0z" />
          </svg>
        </button>
      </div>

      {/* Crew panel */}
      {showCrew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowCrew(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl px-4 pt-4 pb-8 max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-dark text-base">Trip Crew</h3>
              <button onClick={() => setShowCrew(false)} className="text-muted text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto space-y-1">
              {members.length === 0 && <p className="text-sm text-muted text-center py-6">Loading...</p>}
              {members.map(m => {
                const online = onlineIds.has(m.id)
                const label = m.name || m.email.split('@')[0]
                const initls = label.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                        {initls}
                      </div>
                      {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark truncate">{label}</p>
                      {m.name && <p className="text-[11px] text-muted truncate">{m.email}</p>}
                    </div>
                    {online && <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">online</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Announcement banner */}
      {latestAnnouncement && !dismissed.has(latestAnnouncement.id) && (
        <div className="mx-3 mt-2 bg-secondary/15 border border-secondary/30 rounded-xl p-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-dark">{latestAnnouncement.title}</p>
            <p className="text-xs text-muted mt-0.5 truncate">{latestAnnouncement.body}</p>
          </div>
          <button onClick={() => dismissAnnouncement(latestAnnouncement.id)} className="text-muted text-sm shrink-0 leading-none">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1" onClick={() => setActionFor(null)}>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🐸</p>
            <p className="text-muted text-sm">No messages yet. Say hi!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.senderId === user?.id
          const prevMsg = messages[i - 1]
          const showName = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId)
          const reactionGroups: Record<string, number> = {}
          msg.reactions.forEach(r => { reactionGroups[r.emoji] = (reactionGroups[r.emoji] || 0) + 1 })
          const parsed = parseBody(msg.body)
          const isImg = parsed.type === 'image' || parsed.type === 'combo'
          const isEditing = editingId === msg.id

          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${showName ? 'mt-3' : 'mt-0.5'}`}>
              {/* Avatar column */}
              <div className="w-8 shrink-0 mt-auto">
                {!isOwn && showName && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {initials(msg.sender)}
                  </div>
                )}
              </div>

              <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <p className="text-[11px] font-semibold text-primary mb-1 ml-1">{displayName(msg.sender)}</p>
                )}

                {/* Bubble */}
                {isEditing ? (
                  <div className="flex gap-1 items-center">
                    <input
                      ref={editInputRef}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); submitEdit(msg.id) }
                        if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                      }}
                      className="px-3 py-2 rounded-2xl bg-white border-2 border-primary text-dark text-sm focus:outline-none min-w-[140px]"
                    />
                    <button onClick={() => submitEdit(msg.id)} className="text-primary text-xs font-semibold px-2 py-1 rounded-lg hover:bg-primary/10">Save</button>
                    <button onClick={() => { setEditingId(null); setEditText('') }} className="text-muted text-xs px-2 py-1 rounded-lg hover:bg-gray-100">×</button>
                  </div>
                ) : (
                  <div
                    className={`relative cursor-pointer select-none ${
                      isImg
                        ? 'rounded-2xl overflow-hidden shadow-sm'
                        : isOwn
                          ? 'px-3 py-2 bg-primary text-white rounded-2xl rounded-br-sm text-sm leading-snug'
                          : 'px-3 py-2 bg-white text-dark rounded-2xl rounded-bl-sm text-sm leading-snug shadow-sm'
                    }`}
                    onClick={e => { e.stopPropagation(); setActionFor(actionFor === msg.id ? null : msg.id) }}
                  >
                    {parsed.type === 'text' ? (
                      parsed.text
                    ) : parsed.type === 'image' ? (
                      <img src={parsed.img} alt="shared" className="max-w-[240px] max-h-[320px] object-cover block" />
                    ) : (
                      <>
                        <img src={parsed.img} alt="shared" className="max-w-[240px] max-h-[280px] object-cover block" />
                        <p className="px-3 pt-2 pb-1 text-sm leading-snug">{parsed.caption}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Action menu */}
                {actionFor === msg.id && !isEditing && (
                  <div
                    className={`flex gap-1 mt-1 bg-white border border-gray-100 rounded-2xl px-2 py-1.5 shadow-md ${isOwn ? 'self-end' : 'self-start'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    {isOwn && !isImg && (
                      <button
                        onClick={() => startEdit(msg)}
                        className="text-xs text-dark hover:text-primary px-2 py-1 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Edit
                      </button>
                    )}
                    {isOwn && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 font-medium"
                      >
                        Delete
                      </button>
                    )}
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => react(msg.id, e)} className="text-lg hover:scale-125 transition-transform px-1">{e}</button>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(reactionGroups).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(reactionGroups).map(([emoji, count]) => (
                      <button key={emoji} onClick={() => react(msg.id, emoji)}
                        className="text-xs bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm hover:scale-110 transition-transform">
                        {emoji}{count > 1 ? ` ${count}` : ''}
                      </button>
                    ))}
                  </div>
                )}

                <p className={`text-[10px] text-muted mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>{formatTime(msg.createdAt)}</p>
              </div>

              {isOwn && <div className="w-8 shrink-0" />}
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="flex gap-2 items-end mt-2 ml-10">
            <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm flex items-center gap-1.5">
              <span className="text-[11px] text-muted italic">
                {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing
              </span>
              <span className="flex gap-0.5 ml-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-muted/60 inline-block animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image preview strip */}
      {imagePreview && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-3">
          <img src={imagePreview} alt="preview" className="h-14 w-14 object-cover rounded-xl border border-gray-200" />
          <span className="text-xs text-muted flex-1">Add a caption or just hit send</span>
          <button onClick={() => setImagePreview(null)} className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-3 bg-white border-t border-gray-100 flex gap-2 items-center">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 shrink-0 rounded-full bg-[#f0f2f5] flex items-center justify-center text-muted hover:text-primary transition-colors"
          title="Send image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <input
          value={text}
          onChange={e => { setText(e.target.value); if (e.target.value) emitTyping() }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={imagePreview ? 'Add a caption (optional)...' : 'Message the crew...'}
          className="min-w-0 flex-1 px-4 py-2.5 rounded-full bg-[#f0f2f5] text-dark text-sm border border-transparent focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
        />

        <button
          onClick={send}
          disabled={!text.trim() && !imagePreview}
          className="w-9 h-9 shrink-0 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
