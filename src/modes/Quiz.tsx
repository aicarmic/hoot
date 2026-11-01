import { useMemo, useRef, useState } from 'react'
import { check, normalize, type MatchResult } from '../lib/match'
import { shuffle } from '../lib/srs'
import { Extra } from './Extra'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/icons'
import { TextField } from '../ui/TextField'
import { SpeakButton } from './SpeakButton'
import type { ModeProps } from './types'

/** Multiple choice for newer cards; typing once a card has been seen twice. */
export function Quiz(props: ModeProps) {
  return props.reps >= 2 && props.deck.cards.length > 1 ? <TypeIt {...props} /> : <Choose {...props} />
}

function Choose({ deck, card, onAnswer }: ModeProps) {
  const options = useMemo(() => {
    const pool = card.choices?.length
      ? card.choices
      : shuffle(deck.cards.filter((c) => c.id !== card.id && normalize(c.answer) !== normalize(card.answer))).map(
          (c) => c.answer,
        )
    return shuffle([card.answer, ...pool.slice(0, 3)])
  }, [deck, card])
  const [picked, setPicked] = useState<string | null>(null)
  const right = picked === card.answer

  return (
    <div className="mode">
      <div className="prompt-card">
        <span className="label">{deck.promptLabel ?? 'Prompt'}</span>
        <span className="big-text">{card.prompt}</span>
        <SpeakButton text={card.prompt} lang={deck.speechLang} tonal />
      </div>
      <p className="ask">Which one means this?</p>
      <div className="choices">
        {options.map((o) => {
          const isRight = o === card.answer
          const wrongPick = picked === o && !right
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              className={`choice uy-state${picked && isRight ? ' correct' : ''}${wrongPick ? ' wrong' : ''}`}
              onClick={() => setPicked(o)}
            >
              {o}
              {picked && isRight && <Icon name="check_circle" />}
              {wrongPick && <Icon name="replay" />}
            </button>
          )
        })}
      </div>
      {picked && (
        <Feedback ok={right} text={right ? 'Yes, that’s it.' : `It’s “${card.answer}”. It will come back sooner.`}>
          <Extra card={card} />
          <button type="button" className="uy-btn uy-state uy-btn--filled block" autoFocus onClick={() => onAnswer(right ? 'good' : 'again')}>
            Next
          </button>
        </Feedback>
      )}
    </div>
  )
}

function TypeIt({ deck, card, onAnswer }: ModeProps) {
  // Language decks: see the meaning, type the target language. Otherwise: answer the prompt.
  const reverse = !!deck.speechLang
  const shown = reverse ? card.answer : card.prompt
  const expected = reverse ? card.prompt : card.answer
  const [value, setValue] = useState('')
  const [result, setResult] = useState<MatchResult | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const messages: Record<MatchResult, string> = {
    exact: 'Perfect.',
    accent: `Right. Watch the accents: “${expected}”.`,
    close: `So close. It’s “${expected}”.`,
    wrong: `It’s “${expected}”.`,
  }
  const grade = result === 'exact' ? 'good' : result === 'accent' || result === 'close' ? 'hard' : 'again'

  return (
    <div className="mode">
      <div className="prompt-card">
        <span className="label">{reverse ? (deck.answerLabel ?? 'Answer') : (deck.promptLabel ?? 'Prompt')}</span>
        <span className="big-text">{shown}</span>
      </div>
      <form
        className="stack-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (result) onAnswer(grade)
          else if (value.trim()) setResult(check(value, expected))
        }}
      >
        <TextField
          label={`Type it${reverse && deck.promptLabel ? ` in ${deck.promptLabel}` : ''}`}
          ref={input}
          autoFocus
          value={value}
          readOnly={!!result}
          onChange={(e) => setValue(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          lang={reverse ? deck.speechLang : undefined}
        />
        {!result && (
          <div className="row">
            <button type="submit" className="uy-btn uy-state uy-btn--filled">
              Check
            </button>
            <button type="button" className="uy-btn uy-state uy-btn--outlined" onClick={() => setResult('wrong')}>
              Show me
            </button>
          </div>
        )}
        {result && (
          <Feedback ok={result !== 'wrong'} text={messages[result]}>
            <div className="row center">
              <SpeakButton text={card.prompt} lang={deck.speechLang} />
            </div>
            <Extra card={card} />
            <button type="submit" className="uy-btn uy-state uy-btn--filled block">
              Next
            </button>
          </Feedback>
        )}
      </form>
    </div>
  )
}

export function Feedback({
  ok,
  text,
  icon = ok ? 'check_circle' : 'replay',
  children,
}: {
  ok: boolean
  text: string
  icon?: IconName | null
  children?: React.ReactNode
}) {
  return (
    <div className={`feedback ${ok ? 'ok' : 'miss'}`} role="status">
      <span className="head">
        {icon && <Icon name={icon} />}
        {text}
      </span>
      {children}
    </div>
  )
}
