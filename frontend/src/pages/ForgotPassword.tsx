import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">🐸</div>
          <h1 className="text-3xl font-bold text-dark">Bullfrog Bash</h1>
          <p className="text-muted mt-1 text-sm">June 16 - 18 · 16 crew members</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="text-lg font-semibold text-dark mb-2">Check your email</h2>
              <p className="text-sm text-muted leading-relaxed">
                If that email is on the guest list, a reset link is on its way. Check your inbox.
              </p>
              <Link to="/" className="inline-block mt-5 text-sm text-primary font-medium hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-dark mb-1">Forgot your password?</h2>
              <p className="text-xs text-muted mb-5">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p className="text-center text-xs text-muted mt-4">
                <Link to="/" className="text-primary font-medium hover:underline">Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
