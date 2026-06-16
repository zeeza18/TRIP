import React from 'react'
import { useNavigate } from 'react-router-dom'

const cards = [
  {
    emoji: '📅',
    title: 'The Dates',
    bg: 'bg-green-50',
    border: 'border-green-200',
    items: [
      'Check in on June 16 at 3:00 PM at Bullfrog Lake, Illinois',
      'Check out on June 18 at 12:00 PM',
      'Two nights and three days of real good memories',
    ],
  },
  {
    emoji: '🎒',
    title: 'What to Bring',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    items: [
      'One bag only. A school bag or a carry bag. That is it.',
      'Your own toothbrush and personal toiletries',
      'A thin blanket',
      'A neck pillow for the ride',
      'Your water bottle',
      'Any personal medications you need',
    ],
  },
  {
    emoji: '✅',
    title: 'We Have Got Everything Else',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    items: [
      'All snacks, food, and drinks are sorted',
      'Games and activities are fully planned and ready',
      'No need to bring extra gear or entertainment stuff',
      'Just show up and enjoy',
    ],
  },
  {
    emoji: '🚻',
    title: 'Restrooms',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    items: [
      'Restrooms are roughly a 0.05 mile walk from the campsite',
      'This is camping so plan accordingly',
      'Totally doable and worth it for the vibes',
    ],
  },
  {
    emoji: '🎣',
    title: 'Want to Fish?',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    items: [
      'Get your fishing license before you come',
      'Bring your own fishing rod',
      'Align with the group on timing so everyone is on the same page',
    ],
  },
  {
    emoji: '🎂',
    title: "It is Zeeza's Birthday!",
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    items: [
      'June 17 is Zeeza\'s birthday. Please come with a gift for the sweet boy.',
      'Let us make it a moment he actually remembers',
      'Something thoughtful goes a long way',
    ],
  },
  {
    emoji: '💚',
    title: 'The Vibe',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    items: [
      'Only love on this trip. No drama, no fights, no rage baiting.',
      'Come as you are. No judgment here.',
      'No violence and no disrespect toward anyone.',
      'If anything feels off, Azeez has got you. Just come to him.',
    ],
  },
]

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background px-4 pb-32 pt-8">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🐸</div>
          <h1 className="text-2xl font-black text-dark leading-tight">
            You are officially in!
          </h1>
          <p className="mt-2 text-sm font-medium text-primary">
            Bullfrog Grazuasion Party · June 16 to 18, 2026
          </p>
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xs mx-auto">
            Before you head in, take two minutes to read through this. It is short and it matters.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {cards.map(card => (
            <div
              key={card.title}
              className={`rounded-2xl border ${card.bg} ${card.border} p-5`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">{card.emoji}</span>
                <h2 className="text-base font-bold text-dark">{card.title}</h2>
              </div>
              <ul className="space-y-2">
                {card.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Acknowledgment note */}
        <p className="mt-6 text-center text-xs text-muted leading-relaxed px-2">
          By tapping the button below you confirm you have read and understood the trip details above.
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 shadow-lg">
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-md active:opacity-80 transition-opacity"
          >
            Got it, let us go! 🐸
          </button>
        </div>
      </div>
    </div>
  )
}
