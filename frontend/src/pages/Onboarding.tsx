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
  const [idProofName, setIdProofName] = useState('')
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
        <div className="mx-auto mb-6 flex w-full max-w-sm flex-col items-center text-center">
          <div className="text-6xl mb-2">🐸</div>
          <h1 className="w-full whitespace-nowrap text-center text-[clamp(1.25rem,6vw,2rem)] font-black leading-none text-dark">
            Bullfrog <span className="text-primary">Grazuasion</span> Party
          </h1>
          <div className="mt-3 inline-flex -rotate-1 rounded-full bg-secondary px-3.5 py-1.5 text-[10px] font-black uppercase text-dark shadow-sm">
            Masters. No diploma.
          </div>
          <p className="mx-auto mt-3 max-w-[19rem] text-center text-sm font-black leading-snug text-primary">
            Caps off, frogs out, and hop the way to the journey of adventure.
          </p>
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
                <label className="block text-xs font-medium text-dark mb-1">ID Proof <span className="text-muted font-normal">(driver's license or passport)</span></label>
                <label className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${idProof ? 'border-primary bg-green-50' : 'border-gray-200 bg-white hover:border-primary'}`}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
                      setIdProofName(file.name)
                      const reader = new FileReader()
                      reader.onload = ev => setIdProof(ev.target?.result as string)
                      reader.readAsDataURL(file)
                    }}
                  />
                  <span className="text-lg">{idProof ? '✅' : '📎'}</span>
                  <span className="text-sm text-dark truncate">{idProofName || 'Upload photo or PDF'}</span>
                </label>
              </div>
              <button
                onClick={() => { if (!name || !email) { toast.error('Name and email are required'); return } if (!idProof) { toast.error('ID proof is required for check-in'); return } setStep(2) }}
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
