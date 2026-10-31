import { useEffect, useState } from 'react'
import type { Grade } from '../lib/srs'
import { Extra } from './Extra'
import { SpeakButton } from './SpeakButton'
import type { ModeProps } from './types'

const GRADES: { g: Grade; label: string }[] = [
  { g: 'again', label: 'Again' },
  { g: 'hard', label: 'Hard' },
  { g: 'good', label: 'Good' },
  { g: 'easy', label: 'Easy' },
]

export function Flashcards({ deck, card, onAnswer }: ModeProps) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) onAnswer(GRADES[Number(e.key) - 1].g)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, onAnswer])

  return (
    <div className="mode">
      <button type="button" className={`flip${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(true)}>
        <span className="label">{deck.promptLabel ?? 'Prompt'}</span>
        <span className="big-text">{card.prompt}</span>
        {flipped ? (
          <span className="reveal-answer">
            <span className="label">{deck.answerLabel ?? 'Answer'}</span>
            <span className="answer-text">{card.answer}</span>
          </span>
        ) : (
          <span className="tap">{card.hint ? `Hint: ${card.hint} · ` : ''}Tap to flip</span>
        )}
      </button>
      <div className="row center">
        <SpeakButton text={card.prompt} lang={deck.speechLang} />
        <SpeakButton text={card.prompt} lang={deck.speechLang} slow />
      </div>
      {flipped && (
        <>
          <Extra card={card} />
          <p className="ask">How well did you know it?</p>
          <div className="grades">
            {GRADES.map(({ g, label }) => (
              <button key={g} type="button" className={`grade ${g}`} onClick={() => onAnswer(g)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
