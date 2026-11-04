import { useEffect, useState } from 'react'
import { DIFFICULTY } from '../lib/srs'
import { Extra } from './Extra'
import { SpeakButton } from './SpeakButton'
import type { ModeProps } from './types'

export function Flashcards({ deck, card, onAnswer }: ModeProps) {
  const [flipped, setFlipped] = useState(false)
  const problem = deck.kind === 'problem'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped && ['1', '2', '3', '4', '5'].includes(e.key)) onAnswer(DIFFICULTY[Number(e.key) - 1].grade)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, onAnswer])

  return (
    <div className="mode">
      <button type="button" className="flip uy-state" onClick={() => setFlipped(true)}>
        <span className="label">{deck.promptLabel ?? 'Prompt'}</span>
        <span className={problem ? 'big-text problem' : 'big-text'}>{card.prompt}</span>
        {flipped ? (
          <span className="reveal-answer">
            <span className="label">{deck.answerLabel ?? 'Answer'}</span>
            <span className="answer-text">{card.answer}</span>
          </span>
        ) : (
          <span className="tap">
            {card.hint ? `Hint: ${card.hint} · ` : ''}
            {problem ? 'Work it out, then tap to check' : 'Tap to flip'}
          </span>
        )}
      </button>
      <div className="row center">
        <SpeakButton text={card.prompt} lang={deck.speechLang} tonal />
        <SpeakButton text={card.prompt} lang={deck.speechLang} slow tonal />
        {flipped && deck.kind === 'dialogue' && <SpeakButton text={card.answer} lang={deck.speechLang} />}
      </div>
      {flipped && (
        <div className="stack-3">
          <Extra card={card} />
          <p className="ask" id="difficulty-q">
            Difficulty?
          </p>
          <div className="scale" role="group" aria-labelledby="difficulty-q">
            {DIFFICULTY.map(({ n, grade, label }) => (
              <button
                key={n}
                type="button"
                className="scale-step uy-state"
                aria-label={label ? `${n}, ${label.toLowerCase()}` : String(n)}
                onClick={() => onAnswer(grade)}
              >
                <b>{n}</b>
                <small aria-hidden="true">{label ?? '\u00a0'}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
