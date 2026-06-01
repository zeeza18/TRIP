import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-dvh bg-background flex flex-col items-center justify-center px-4">
      <style>{`
        .frog-scene { overflow: visible; display: block; width: 200px; }

        /* === FROG BODY SQUISH === */
        .svg-frog {
          transform-box: fill-box;
          transform-origin: center bottom;
          animation: frogSquish 5s ease-in-out infinite;
        }
        @keyframes frogSquish {
          0%,43%  { transform: scale(1) translateY(0); }
          46%     { transform: scaleX(1.05) scaleY(0.91) translateY(5px); }
          50%     { transform: scaleX(0.97) scaleY(1.04) translateY(-3px); }
          54%     { transform: scale(1) translateY(0); }
          100%    { transform: scale(1) translateY(0); }
        }

        /* === TONGUE === */
        .frog-tongue-svg {
          stroke-dasharray: 128;
          stroke-dashoffset: 128;
          animation: tongueShoot 5s ease-in-out infinite;
        }
        @keyframes tongueShoot {
          0%,49%  { stroke-dashoffset: 128; }
          52%,57% { stroke-dashoffset: 0; }
          62%,100%{ stroke-dashoffset: 128; }
        }

        /* === PUPILS TRACK FLY === */
        .frog-pupil-l {
          transform-box: fill-box;
          transform-origin: center;
          animation: pupilL 5s ease-in-out infinite;
        }
        .frog-pupil-r {
          transform-box: fill-box;
          transform-origin: center;
          animation: pupilR 5s ease-in-out infinite;
        }
        @keyframes pupilL {
          0%,36%  { transform: translate(0,0); }
          48%,60% { transform: translate(5px,-3px); }
          68%,100%{ transform: translate(0,0); }
        }
        @keyframes pupilR {
          0%,36%  { transform: translate(0,0); }
          48%,60% { transform: translate(4px,-3px); }
          68%,100%{ transform: translate(0,0); }
        }

        /* === BLINK === */
        .frog-eye-left {
          transform-box: fill-box;
          transform-origin: center;
          animation: blinkL 5s ease-in-out infinite;
        }
        .frog-eye-right {
          transform-box: fill-box;
          transform-origin: center;
          animation: blinkR 5s ease-in-out infinite;
        }
        @keyframes blinkL {
          0%,62%  { transform: scaleY(1); }
          65%,69% { transform: scaleY(0.07); }
          73%,100%{ transform: scaleY(1); }
        }
        @keyframes blinkR {
          0%,63%  { transform: scaleY(1); }
          66%,70% { transform: scaleY(0.07); }
          74%,100%{ transform: scaleY(1); }
        }

        /* === GROUND SHADOW === */
        .frog-ground-shadow {
          transform-box: fill-box;
          transform-origin: center;
          animation: shadowPulse 5s ease-in-out infinite;
        }
        @keyframes shadowPulse {
          0%,43%  { transform: scaleX(1); opacity: 0.18; }
          46%     { transform: scaleX(1.07); opacity: 0.23; }
          54%     { transform: scaleX(0.95); opacity: 0.15; }
          58%,100%{ transform: scaleX(1); opacity: 0.18; }
        }

        /* === FLY PATH === */
        .frog-fly-svg {
          animation: flyPath 5s ease-in-out infinite;
        }
        @keyframes flyPath {
          0%   { transform: translate(228px,44px); opacity:1; }
          18%  { transform: translate(212px,56px); opacity:1; }
          33%  { transform: translate(222px,36px); opacity:1; }
          48%  { transform: translate(208px,48px); opacity:1; }
          54%  { transform: translate(200px,46px); opacity:1; }
          58%  { transform: translate(198px,46px); opacity:0; }
          80%  { transform: translate(228px,44px); opacity:0; }
          90%  { transform: translate(228px,44px); opacity:1; }
          100% { transform: translate(228px,44px); opacity:1; }
        }

        /* === WING FLAP === */
        .fly-wing-l {
          transform-box: fill-box;
          transform-origin: center right;
          animation: wingFlapL 0.09s ease-in-out infinite alternate;
        }
        .fly-wing-r {
          transform-box: fill-box;
          transform-origin: center left;
          animation: wingFlapR 0.09s ease-in-out infinite alternate;
        }
        @keyframes wingFlapL {
          from { transform: scaleY(1) rotate(-8deg); }
          to   { transform: scaleY(0.15) rotate(8deg); }
        }
        @keyframes wingFlapR {
          from { transform: scaleY(0.15) rotate(-8deg); }
          to   { transform: scaleY(1) rotate(8deg); }
        }
      `}</style>

      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="text-center mb-4">

          {/* === FROG SVG === */}
          <div className="flex justify-center mb-3">
            <svg className="frog-scene" viewBox="0 0 260 175" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="skinGrad" cx="38%" cy="22%" r="74%">
                  <stop offset="0%" stopColor="#5de89a"/>
                  <stop offset="52%" stopColor="#27b567"/>
                  <stop offset="100%" stopColor="#19794a"/>
                </radialGradient>
                <radialGradient id="bellyGrad" cx="50%" cy="38%" r="66%">
                  <stop offset="0%" stopColor="#fffaaa"/>
                  <stop offset="58%" stopColor="#f5cc42"/>
                  <stop offset="100%" stopColor="#e8a418"/>
                </radialGradient>
                <radialGradient id="eyeGrad" cx="32%" cy="22%" r="72%">
                  <stop offset="0%" stopColor="#42ee88"/>
                  <stop offset="100%" stopColor="#19794a"/>
                </radialGradient>
                <filter id="fDrop" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0b3520" floodOpacity="0.22"/>
                </filter>
              </defs>

              {/* Ground shadow */}
              <ellipse className="frog-ground-shadow" cx="108" cy="164" rx="58" ry="8" fill="#19794a" opacity="0.18"/>

              {/* Main frog group — squish animates here */}
              <g className="svg-frog" filter="url(#fDrop)">

                {/* === BACK LEGS (drawn first = behind body) === */}
                {/* Back left: thigh → shin */}
                <line x1="64" y1="128" x2="40" y2="146" stroke="#27b567" strokeWidth="13" strokeLinecap="round"/>
                <line x1="40" y1="146" x2="24" y2="150" stroke="#27b567" strokeWidth="11" strokeLinecap="round"/>
                {/* Left toes */}
                <circle cx="15" cy="152" r="5" fill="#1c8a50"/>
                <circle cx="23" cy="155" r="5" fill="#1c8a50"/>
                <circle cx="31" cy="154" r="5" fill="#1c8a50"/>

                {/* Back right: thigh → shin */}
                <line x1="152" y1="128" x2="176" y2="146" stroke="#27b567" strokeWidth="13" strokeLinecap="round"/>
                <line x1="176" y1="146" x2="192" y2="150" stroke="#27b567" strokeWidth="11" strokeLinecap="round"/>
                {/* Right toes */}
                <circle cx="185" cy="154" r="5" fill="#1c8a50"/>
                <circle cx="193" cy="155" r="5" fill="#1c8a50"/>
                <circle cx="201" cy="152" r="5" fill="#1c8a50"/>

                {/* === BODY === */}
                <ellipse cx="108" cy="118" rx="50" ry="42" fill="url(#skinGrad)"/>
                {/* Belly */}
                <ellipse cx="108" cy="124" rx="30" ry="25" fill="url(#bellyGrad)" opacity="0.92"/>
                {/* Head (blends into body top) */}
                <ellipse cx="108" cy="82" rx="40" ry="30" fill="url(#skinGrad)"/>

                {/* === FRONT LEGS === */}
                {/* Left front */}
                <line x1="70" y1="110" x2="54" y2="126" stroke="#27b567" strokeWidth="10" strokeLinecap="round"/>
                <circle cx="47" cy="130" r="4" fill="#1c8a50"/>
                <circle cx="54" cy="133" r="4" fill="#1c8a50"/>
                <circle cx="61" cy="131" r="4" fill="#1c8a50"/>

                {/* Right front */}
                <line x1="146" y1="110" x2="162" y2="126" stroke="#27b567" strokeWidth="10" strokeLinecap="round"/>
                <circle cx="155" cy="131" r="4" fill="#1c8a50"/>
                <circle cx="162" cy="133" r="4" fill="#1c8a50"/>
                <circle cx="169" cy="130" r="4" fill="#1c8a50"/>

                {/* === NOSTRILS === */}
                <circle cx="101" cy="90" r="3" fill="#145a33" opacity="0.65"/>
                <circle cx="115" cy="90" r="3" fill="#145a33" opacity="0.65"/>

                {/* === SMILE === */}
                <path d="M87 99 C98 111 118 111 129 99" fill="none" stroke="#145a33" strokeWidth="3.5" strokeLinecap="round"/>

                {/* Cheek blush */}
                <ellipse cx="76" cy="103" rx="11" ry="6.5" fill="#f4a261" opacity="0.3"/>
                <ellipse cx="140" cy="103" rx="11" ry="6.5" fill="#f4a261" opacity="0.3"/>

                {/* === EYES === */}
                {/* Left eye */}
                <g className="frog-eye-left">
                  <circle cx="82" cy="63" r="19" fill="url(#eyeGrad)"/>
                  <circle cx="82" cy="63" r="13" fill="#f5d020"/>
                  <ellipse className="frog-pupil-l" cx="82" cy="63" rx="6.5" ry="8" fill="#080e05"/>
                  <circle cx="76" cy="56" r="3" fill="white" opacity="0.8"/>
                  <circle cx="82" cy="72" r="3" fill="#27b567" opacity="0.4"/>
                </g>

                {/* Right eye */}
                <g className="frog-eye-right">
                  <circle cx="134" cy="63" r="19" fill="url(#eyeGrad)"/>
                  <circle cx="134" cy="63" r="13" fill="#f5d020"/>
                  <ellipse className="frog-pupil-r" cx="134" cy="63" rx="6.5" ry="8" fill="#080e05"/>
                  <circle cx="128" cy="56" r="3" fill="white" opacity="0.8"/>
                  <circle cx="134" cy="72" r="3" fill="#27b567" opacity="0.4"/>
                </g>

                {/* === TONGUE (hidden, shoots out toward fly) === */}
                <path
                  className="frog-tongue-svg"
                  d="M108 98 C145 82 172 62 198 46"
                  fill="none"
                  stroke="#e8357a"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                {/* Tongue tip bulb (visible when tongue out) */}
                <circle className="frog-tongue-svg" cx="198" cy="46" r="5" fill="#e8357a" opacity="0.85"/>
              </g>

              {/* === FLY (starts off-right, animated in) === */}
              <g className="frog-fly-svg">
                {/* Wings */}
                <ellipse className="fly-wing-l" cx="-10" cy="-4" rx="10" ry="6.5" fill="white" opacity="0.88" stroke="#aaa" strokeWidth="0.6"/>
                <ellipse className="fly-wing-r" cx="10" cy="-4" rx="10" ry="6.5" fill="white" opacity="0.88" stroke="#aaa" strokeWidth="0.6"/>
                {/* Abdomen stripes */}
                <ellipse cx="0" cy="5" rx="4.5" ry="7" fill="#252525"/>
                <line x1="-4" y1="3" x2="4" y2="3" stroke="#444" strokeWidth="1"/>
                <line x1="-4" y1="6" x2="4" y2="6" stroke="#444" strokeWidth="1"/>
                {/* Head */}
                <circle cx="0" cy="-5" r="5.5" fill="#181818"/>
                {/* Compound eyes */}
                <circle cx="-3" cy="-7" r="2.2" fill="#bb0000" opacity="0.95"/>
                <circle cx="3" cy="-7" r="2.2" fill="#bb0000" opacity="0.95"/>
                {/* Eye shine */}
                <circle cx="-4" cy="-8" r="0.7" fill="white" opacity="0.6"/>
                <circle cx="2" cy="-8" r="0.7" fill="white" opacity="0.6"/>
                {/* Antennae */}
                <path d="M-2,-10 Q-5,-15 -6,-18" fill="none" stroke="#333" strokeWidth="1.1" strokeLinecap="round"/>
                <path d="M2,-10 Q5,-15 6,-18" fill="none" stroke="#333" strokeWidth="1.1" strokeLinecap="round"/>
                <circle cx="-6" cy="-18" r="1.4" fill="#333"/>
                <circle cx="6" cy="-18" r="1.4" fill="#333"/>
                {/* Legs (6 tiny legs) */}
                <line x1="-4" y1="1" x2="-9" y2="-1" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="-4" y1="4" x2="-9" y2="4" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="-4" y1="7" x2="-9" y2="9" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="4" y1="1" x2="9" y2="-1" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="4" y1="4" x2="9" y2="4" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
                <line x1="4" y1="7" x2="9" y2="9" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
              </g>
            </svg>
          </div>

          <h1 className="w-full whitespace-nowrap text-[clamp(1.25rem,6vw,2.35rem)] font-black leading-none text-dark">
            Bullfrog <span className="text-primary">Grazuasion</span> Party
          </h1>
          <p className="mt-2 text-sm font-black leading-snug text-primary">
            Caps off, frogs out, and hop the way to the journey of adventure.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-dark mb-5 text-center">Welcome back</h2>
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
            <div>
              <label className="block text-xs font-medium text-dark mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                  {showPassword
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          <p className="text-center text-xs text-muted mt-4">
            <Link to="/forgot-password" className="text-primary font-medium hover:underline">Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
