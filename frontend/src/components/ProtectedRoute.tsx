import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-4xl animate-bounce">🐸</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
