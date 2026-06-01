export default function FrogScene() {
  return (
    <>
      <style>{`
        .frog-scene { overflow: visible; display: block; width: 200px; }
        .svg-frog { transform-box: fill-box; transform-origin: center bottom; animation: frogSquish 5s ease-in-out infinite; }
        @keyframes frogSquish {
          0%,43%  { transform: scale(1) translateY(0); }
          46%     { transform: scaleX(1.05) scaleY(0.91) translateY(5px); }
          50%     { transform: scaleX(0.97) scaleY(1.04) translateY(-3px); }
          54%,100%{ transform: scale(1) translateY(0); }
        }
        .frog-tongue-svg { stroke-dasharray: 128; stroke-dashoffset: 128; animation: tongueShoot 5s ease-in-out infinite; }
        @keyframes tongueShoot {
          0%,49%  { stroke-dashoffset: 128; }
          52%,57% { stroke-dashoffset: 0; }
          62%,100%{ stroke-dashoffset: 128; }
        }
        .frog-pupil-l { transform-box: fill-box; transform-origin: center; animation: pupilL 5s ease-in-out infinite; }
        .frog-pupil-r { transform-box: fill-box; transform-origin: center; animation: pupilR 5s ease-in-out infinite; }
        @keyframes pupilL { 0%,36%{ transform:translate(0,0); } 48%,60%{ transform:translate(5px,-3px); } 68%,100%{ transform:translate(0,0); } }
        @keyframes pupilR { 0%,36%{ transform:translate(0,0); } 48%,60%{ transform:translate(4px,-3px); } 68%,100%{ transform:translate(0,0); } }
        .frog-eye-left  { transform-box: fill-box; transform-origin: center; animation: blinkL 5s ease-in-out infinite; }
        .frog-eye-right { transform-box: fill-box; transform-origin: center; animation: blinkR 5s ease-in-out infinite; }
        @keyframes blinkL { 0%,62%{ transform:scaleY(1); } 65%,69%{ transform:scaleY(0.07); } 73%,100%{ transform:scaleY(1); } }
        @keyframes blinkR { 0%,63%{ transform:scaleY(1); } 66%,70%{ transform:scaleY(0.07); } 74%,100%{ transform:scaleY(1); } }
        .frog-ground-shadow { transform-box: fill-box; transform-origin: center; animation: shadowPulse 5s ease-in-out infinite; }
        @keyframes shadowPulse {
          0%,43%  { transform:scaleX(1); opacity:0.18; }
          46%     { transform:scaleX(1.07); opacity:0.23; }
          54%     { transform:scaleX(0.95); opacity:0.15; }
          58%,100%{ transform:scaleX(1); opacity:0.18; }
        }
        .frog-fly-svg { animation: flyPath 5s ease-in-out infinite; }
        @keyframes flyPath {
          0%   { transform:translate(228px,44px); opacity:1; }
          18%  { transform:translate(212px,56px); opacity:1; }
          33%  { transform:translate(222px,36px); opacity:1; }
          48%  { transform:translate(208px,48px); opacity:1; }
          54%  { transform:translate(200px,46px); opacity:1; }
          58%  { transform:translate(198px,46px); opacity:0; }
          80%  { transform:translate(228px,44px); opacity:0; }
          90%  { transform:translate(228px,44px); opacity:1; }
          100% { transform:translate(228px,44px); opacity:1; }
        }
        .fly-wing-l { transform-box: fill-box; transform-origin: center right; animation: wingFlapL 0.09s ease-in-out infinite alternate; }
        .fly-wing-r { transform-box: fill-box; transform-origin: center left;  animation: wingFlapR 0.09s ease-in-out infinite alternate; }
        @keyframes wingFlapL { from{ transform:scaleY(1) rotate(-8deg); } to{ transform:scaleY(0.15) rotate(8deg); } }
        @keyframes wingFlapR { from{ transform:scaleY(0.15) rotate(-8deg); } to{ transform:scaleY(1) rotate(8deg); } }
      `}</style>

      <div className="flex justify-center">
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

          <ellipse className="frog-ground-shadow" cx="108" cy="164" rx="58" ry="8" fill="#19794a" opacity="0.18"/>

          <g className="svg-frog" filter="url(#fDrop)">
            {/* Back left leg */}
            <path d="M 63,130 C 50,132 36,142 26,152" stroke="#27b567" strokeWidth="17" fill="none" strokeLinecap="round"/>
            <circle cx="40" cy="140" r="9" fill="#22a85c"/>
            <ellipse cx="14" cy="156" rx="7" ry="4.5" fill="#1c8a50" transform="rotate(-25,14,156)"/>
            <ellipse cx="22" cy="159" rx="7" ry="4.5" fill="#1c8a50" transform="rotate(-5,22,159)"/>
            <ellipse cx="30" cy="157" rx="7" ry="4.5" fill="#1c8a50" transform="rotate(18,30,157)"/>

            {/* Back right leg */}
            <path d="M 153,130 C 166,132 180,142 190,152" stroke="#27b567" strokeWidth="17" fill="none" strokeLinecap="round"/>
            <circle cx="176" cy="140" r="9" fill="#22a85c"/>
            <ellipse cx="186" cy="157" rx="7" ry="4.5" fill="#1c8a50" transform="rotate(-18,186,157)"/>
            <ellipse cx="194" cy="159" rx="7" ry="4.5" fill="#1c8a50" transform="rotate(5,194,159)"/>
            <ellipse cx="202" cy="156" rx="7" ry="4.5" fill="#1c8a50" transform="rotate(25,202,156)"/>

            {/* Body */}
            <ellipse cx="108" cy="118" rx="50" ry="42" fill="url(#skinGrad)"/>
            <ellipse cx="108" cy="124" rx="30" ry="25" fill="url(#bellyGrad)" opacity="0.92"/>
            {/* Head */}
            <ellipse cx="108" cy="82" rx="40" ry="30" fill="url(#skinGrad)"/>

            {/* Front left arm */}
            <path d="M 70,112 C 62,118 54,122 50,128" stroke="#27b567" strokeWidth="12" fill="none" strokeLinecap="round"/>
            <ellipse cx="44" cy="131" rx="5" ry="3.5" fill="#1c8a50" transform="rotate(-20,44,131)"/>
            <ellipse cx="51" cy="134" rx="5" ry="3.5" fill="#1c8a50"/>
            <ellipse cx="58" cy="132" rx="5" ry="3.5" fill="#1c8a50" transform="rotate(20,58,132)"/>

            {/* Front right arm */}
            <path d="M 146,112 C 154,118 162,122 166,128" stroke="#27b567" strokeWidth="12" fill="none" strokeLinecap="round"/>
            <ellipse cx="158" cy="132" rx="5" ry="3.5" fill="#1c8a50" transform="rotate(-20,158,132)"/>
            <ellipse cx="165" cy="134" rx="5" ry="3.5" fill="#1c8a50"/>
            <ellipse cx="172" cy="131" rx="5" ry="3.5" fill="#1c8a50" transform="rotate(20,172,131)"/>

            {/* Nostrils */}
            <circle cx="101" cy="90" r="3" fill="#145a33" opacity="0.65"/>
            <circle cx="115" cy="90" r="3" fill="#145a33" opacity="0.65"/>

            {/* Smile */}
            <path d="M87 99 C98 111 118 111 129 99" fill="none" stroke="#145a33" strokeWidth="3.5" strokeLinecap="round"/>

            {/* Cheek blush */}
            <ellipse cx="76" cy="103" rx="11" ry="6.5" fill="#f4a261" opacity="0.3"/>
            <ellipse cx="140" cy="103" rx="11" ry="6.5" fill="#f4a261" opacity="0.3"/>

            {/* Left eye */}
            <g className="frog-eye-left">
              <circle cx="82" cy="63" r="19" fill="url(#eyeGrad)"/>
              <circle cx="82" cy="63" r="13" fill="#f5d020"/>
              <ellipse className="frog-pupil-l" cx="82" cy="63" rx="6.5" ry="8" fill="#080e05"/>
              <circle cx="76" cy="56" r="3" fill="white" opacity="0.8"/>
            </g>

            {/* Right eye */}
            <g className="frog-eye-right">
              <circle cx="134" cy="63" r="19" fill="url(#eyeGrad)"/>
              <circle cx="134" cy="63" r="13" fill="#f5d020"/>
              <ellipse className="frog-pupil-r" cx="134" cy="63" rx="6.5" ry="8" fill="#080e05"/>
              <circle cx="128" cy="56" r="3" fill="white" opacity="0.8"/>
            </g>

            {/* Tongue */}
            <path className="frog-tongue-svg" d="M108 98 C145 82 172 62 198 46" fill="none" stroke="#e8357a" strokeWidth="7" strokeLinecap="round"/>
          </g>

          {/* Fly */}
          <g className="frog-fly-svg">
            <ellipse className="fly-wing-l" cx="-10" cy="-4" rx="10" ry="6.5" fill="white" opacity="0.88" stroke="#aaa" strokeWidth="0.6"/>
            <ellipse className="fly-wing-r" cx="10" cy="-4" rx="10" ry="6.5" fill="white" opacity="0.88" stroke="#aaa" strokeWidth="0.6"/>
            <ellipse cx="0" cy="5" rx="4.5" ry="7" fill="#252525"/>
            <line x1="-4" y1="3" x2="4" y2="3" stroke="#444" strokeWidth="1"/>
            <line x1="-4" y1="6" x2="4" y2="6" stroke="#444" strokeWidth="1"/>
            <circle cx="0" cy="-5" r="5.5" fill="#181818"/>
            <circle cx="-3" cy="-7" r="2.2" fill="#bb0000" opacity="0.95"/>
            <circle cx="3" cy="-7" r="2.2" fill="#bb0000" opacity="0.95"/>
            <circle cx="-4" cy="-8" r="0.7" fill="white" opacity="0.6"/>
            <circle cx="2" cy="-8" r="0.7" fill="white" opacity="0.6"/>
            <path d="M-2,-10 Q-5,-15 -6,-18" fill="none" stroke="#333" strokeWidth="1.1" strokeLinecap="round"/>
            <path d="M2,-10 Q5,-15 6,-18" fill="none" stroke="#333" strokeWidth="1.1" strokeLinecap="round"/>
            <circle cx="-6" cy="-18" r="1.4" fill="#333"/>
            <circle cx="6" cy="-18" r="1.4" fill="#333"/>
            <line x1="-4" y1="1" x2="-9" y2="-1" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="-4" y1="4" x2="-9" y2="4" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="-4" y1="7" x2="-9" y2="9" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="4" y1="1" x2="9" y2="-1" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="4" y1="4" x2="9" y2="4" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="4" y1="7" x2="9" y2="9" stroke="#444" strokeWidth="0.8" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
    </>
  )
}
