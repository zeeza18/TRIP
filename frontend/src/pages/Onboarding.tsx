import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api'

type Step = 1 | 2 | 3

export default function Onboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const emailParam = params.get('email') || ''

  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idProof, setIdProof] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [booze, setBooze] = useState<'yay' | 'nah'>('yay')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (emailParam) setEmail(emailParam)
  }, [emailParam])

  async function handleFinish() {
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/auth/register', { email, password, name, phone, boozePref: booze, idProof })
      toast.success('Account created! Please log in.')
      navigate('/')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🐸</div>
          <h1 className="text-2xl font-bold text-dark">Bullfrog Bash</h1>
          <p className="text-muted text-sm mt-1">Set up your account</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${step >= s ? 'bg-primary scale-110' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-dark">Hey! Who are you?</h2>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Full name</label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Email</label>
                <input
                  type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">ID Proof <span className="text-muted font-normal">(optional — for check-in)</span></label>
                <input
                  value={idProof} onChange={e => setIdProof(e.target.value)}
                  placeholder="e.g. Driver's License, Passport"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={() => { if (!name || !email) { toast.error('Name and email are required'); return } setStep(2) }}
                className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all"
              >
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-dark">Set your password</h2>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Password</label>
                <input
                  type="password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Same as above"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 text-dark font-medium rounded-xl hover:bg-gray-50">← Back</button>
                <button
                  onClick={() => { if (password !== confirm) { toast.error('Passwords do not match'); return } if (password.length < 6) { toast.error('Min 6 characters'); return } setStep(3) }}
                  className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90"
                >Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-dark">Next: Booze preference</h2>
              <p className="text-sm text-muted">Let the crew know your vibe</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setBooze('yay')}
                  className={`flex-1 py-5 rounded-2xl text-2xl font-bold border-2 transition-all ${booze === 'yay' ? 'border-primary bg-primary text-white scale-105' : 'border-gray-200 bg-white text-dark'}`}
                >
                  YAY
                </button>
                <button
                  onClick={() => setBooze('nah')}
                  className={`flex-1 py-5 rounded-2xl text-2xl font-bold border-2 transition-all ${booze === 'nah' ? 'border-accent bg-accent text-white scale-105' : 'border-gray-200 bg-white text-dark'}`}
                >
                  NAH
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 text-dark font-medium rounded-xl hover:bg-gray-50">← Back</button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? 'Creating…' : "Let's go!"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
