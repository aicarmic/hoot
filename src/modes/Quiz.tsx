import { useMemo, useRef, useState } from 'react'
import { check, hideSoundAid, normalize, type MatchResult } from '../lib/match'
import { shuffle } from '../lib/srs'
import { Extra } from './Extra'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/icons'
import { TextField } from '../ui/TextField'
import { SpeakButton } from './SpeakButton'
import type { Card } from '../content/types'
import type { ModeProps } from './types'

/** Multiple choice for newer cards; typing once a card has been seen twice. */
export function Quiz(props: ModeProps) {
  // Dialogue replies have many right answers, and problem answers like "(−4, −6)" are fiddly
  // to type and to match, so both stay multiple choice. Vocab words are easy to type.
  const canType = !props.deck.kind || props.deck.kind === 'vocab'
  return canType && props.reps >= 2 && props.deck.cards.length > 1 ? <TypeIt {...props} /> : <Choose {...props} />
}

/** Language decks may write a sound aid after the meaning; own-language vocab never does. */
const hasSoundAids = (deck: ModeProps['deck']) => !!deck.speechLang && deck.kind !== 'vocab'

const ASK: Record<string, string> = {
  dialogue: 'What could you say back?',
  problem: 'Work it out, then pick the answer.',
}

function Choose({ deck, card, onAnswer }: ModeProps) {
  // Language answers can carry a sound aid, "topic (tyema)". It matches the prompt, so it would
  // give the right option away; options leave it out and the feedback shows it.
  const label = (c: Card) => (hasSoundAids(deck) ? hideSoundAid(c.answer, c.prompt) : c.answer)
  const answer = label(card)
  const options = useMemo(() => {
    const pool = card.choices?.length
      ? card.choices
      : shuffle(deck.cards.filter((c) => c.id !== card.id && normalize(c.answer) !== normalize(card.answer)))
          .map(label)
          .filter((o) => normalize(o) !== normalize(answer))
    return shuffle([answer, ...[...new Set(pool)].slice(0, 3)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, card])
  const [picked, setPicked] = useState<string | null>(null)
  const right = picked === answer

  return (
    <div className="mode">
      <div className="prompt-card">
        <span className="label">{deck.promptLabel ?? 'Prompt'}</span>
        <span className={deck.kind === 'problem' ? 'big-text problem' : 'big-text'}>{card.prompt}</span>
        <SpeakButton text={card.prompt} lang={deck.speechLang} tonal />
      </div>
      <p className="ask">{ASK[deck.kind ?? ''] ?? 'Which one means this?'}</p>
      <div className="choices">
        {options.map((o) => {
          const isRight = o === answer
          const wrongPick = picked === o && !right
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              className={`choice uy-state${picked && isRight ? ' correct' : ''}${wrongPick ? ' wrong' : ''}`}
              onClick={() => setPicked(o)}
            >
              {picked && isRight ? card.answer : o}
              {picked && isRight && <Icon name="check_circle" />}
              {wrongPick && <Icon name="replay" />}
            </button>
          )
        })}
      </div>
      {picked && (
        <Feedback ok={right} text={right ? 'Yes, that’s it.' : `It’s “${card.answer}”. You’ll see it again soon.`}>
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
  const shown = reverse ? (hasSoundAids(deck) ? hideSoundAid(card.answer, card.prompt) : card.answer) : card.prompt
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
          label={deck.kind === 'vocab' ? 'Type the word' : `Type it${reverse && deck.promptLabel ? ` in ${deck.promptLabel}` : ''}`}
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
