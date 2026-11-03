import { useEffect, useRef, useState } from 'react'
import { check, type MatchResult } from '../lib/match'
import { canListen, canSpeak, listen, speak } from '../lib/speech'
import { Extra } from './Extra'
import { Feedback } from './Quiz'
import { Icon } from '../ui/Icon'
import { SpeakButton } from './SpeakButton'
import type { ModeProps } from './types'

const ERRORS: Record<string, string> = {
  'not-allowed': 'Hoot needs microphone permission. Allow it in your browser settings and try again.',
  'no-speech': 'I didn’t hear anything. Tap the mic and try again.',
  network: 'Speech recognition needs an internet connection.',
}

/** A word of praise in the language being learnt, when we have one. */
const PRAISE: Record<string, string> = { it: 'Bellissimo.', ru: 'Отлично.', es: 'Muy bien.', fr: 'Très bien.', de: 'Sehr gut.' }

export function ListenSpeak({ deck, card, onAnswer }: ModeProps) {
  const lang = deck.speechLang ?? 'en-US'
  // Dialogue decks: Hoot says their line, you say your reply. Otherwise you repeat the phrase.
  const dialogue = deck.kind === 'dialogue'
  const target = dialogue ? card.answer : card.prompt
  const [showReply, setShowReply] = useState(false)
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle')
  const [heard, setHeard] = useState('')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [tries, setTries] = useState(0)
  const [error, setError] = useState('')
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => {
    const t = setTimeout(() => speak(card.prompt, lang), 250)
    return () => {
      clearTimeout(t)
      stopRef.current()
    }
  }, [card, lang])

  const start = async () => {
    setError('')
    setState('listening')
    const { result: p, stop } = listen(lang)
    stopRef.current = stop
    try {
      const alts = await p
      const scored = alts.map((a) => ({ a, r: check(a, target) }))
      const rank: MatchResult[] = ['exact', 'accent', 'close', 'wrong']
      const best = scored.sort((x, y) => rank.indexOf(x.r) - rank.indexOf(y.r))[0]
      setHeard(best?.a ?? '')
      setResult(best?.r === 'accent' ? 'exact' : (best?.r ?? 'wrong')) // accents are inaudible
      setTries((t) => t + 1)
      setState('done')
    } catch (e) {
      setError(ERRORS[(e as Error).message] ?? 'Something went wrong with the microphone. Try again.')
      setState('idle')
    }
  }

  const passed = result === 'exact' || result === 'close'

  return (
    <div className="mode">
      {dialogue ? (
        <div className="prompt-card tall">
          <span className="label">{deck.promptLabel ?? 'They say'}</span>
          <span className="big-text">{card.prompt}</span>
          <div className="row center" style={{ marginTop: 8 }}>
            <SpeakButton text={card.prompt} lang={deck.speechLang} tonal />
            <SpeakButton text={card.prompt} lang={deck.speechLang} slow tonal />
          </div>
          {showReply || state === 'done' ? (
            <>
              <span className="label" style={{ marginTop: 8 }}>
                {deck.answerLabel ?? 'You say'}
              </span>
              <span className="answer-text">{card.answer}</span>
              <SpeakButton text={card.answer} lang={deck.speechLang} small />
            </>
          ) : (
            <button type="button" className="uy-btn uy-state uy-btn--text" onClick={() => setShowReply(true)}>
              Show a reply
            </button>
          )}
        </div>
      ) : (
        <div className="prompt-card tall">
          <span className="label">Say this</span>
          <span className="big-text">{card.prompt}</span>
          <span className="answer-text">{card.answer}</span>
          <div className="row center" style={{ marginTop: 8 }}>
            <SpeakButton text={card.prompt} lang={deck.speechLang} tonal />
            <SpeakButton text={card.prompt} lang={deck.speechLang} slow tonal />
          </div>
        </div>
      )}

      {canListen ? (
        <>
          {state !== 'done' || !passed ? (
            <button
              type="button"
              className={`mic uy-state${state === 'listening' ? ' on' : ''}`}
              onClick={state === 'listening' ? () => stopRef.current() : start}
              aria-label={state === 'listening' ? 'Stop listening' : 'Tap and speak'}
            >
              <Icon name="mic" />
              <span>{state === 'listening' ? 'Listening…' : tries ? 'Try again' : 'Tap and speak'}</span>
            </button>
          ) : null}
          {error && (
            <p className="error">
              <Icon name="error" />
              {error}
            </p>
          )}
          {state === 'done' && result && (
            <Feedback
              ok={passed}
              icon={result === 'exact' ? 'check_circle' : result === 'close' ? 'hearing' : 'replay'}
              text={result === 'exact' ? `${PRAISE[lang.slice(0, 2)] ?? ''} That sounded right.`.trim() : result === 'close' ? 'Nearly there.' : 'Not quite yet.'}
            >
              <p className="heard">
                I heard: <q>{heard || '…'}</q>
              </p>
              <Extra card={card} />
              <div className="row">
                {passed ? (
                  <button type="button" className="uy-btn uy-state uy-btn--filled" autoFocus onClick={() => onAnswer(result === 'exact' ? 'good' : 'hard')}>
                    Next
                  </button>
                ) : (
                  <>
                    <button type="button" className="uy-btn uy-state uy-btn--outlined" onClick={() => onAnswer('good')}>
                      I said it right
                    </button>
                    {tries >= 2 && (
                      <button type="button" className="uy-btn uy-state uy-btn--text" onClick={() => onAnswer('again')}>
                        Skip for now
                      </button>
                    )}
                  </>
                )}
              </div>
            </Feedback>
          )}
        </>
      ) : (
        <Feedback
          ok={false}
          icon={null}
          text={canSpeak ? (dialogue ? 'This browser can’t listen yet, so answer out loud, then check the reply and rate yourself.' : 'This browser can’t listen yet, so say it out loud and rate yourself.') : 'Speech isn’t available in this browser.'}
        >
          <Extra card={card} />
          <div className="row">
            <button type="button" className="uy-btn uy-state uy-btn--outlined" onClick={() => onAnswer('again')}>
              Need practice
            </button>
            <button type="button" className="uy-btn uy-state uy-btn--filled" onClick={() => onAnswer('good')}>
              Got it
            </button>
          </div>
        </Feedback>
      )}
    </div>
  )
}
