import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'

export interface User {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  boozePref: string | null
}

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }
    api.get('/users/me')
      .then(res => setUser(res.data))
      .catch(logout)
      .finally(() => setLoading(false))
  }, [logout])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', res.data.accessToken)
    localStorage.setItem('refreshToken', res.data.refreshToken)
    setUser(res.data.user)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'ADMIN', loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
