import { useEffect, useRef, useState } from 'react'
import { check, type MatchResult } from '../lib/match'
import { canListen, canSpeak, listen, speak } from '../lib/speech'
import { Extra } from './Extra'
import { Feedback } from './Quiz'
import { SpeakButton } from './SpeakButton'
import type { ModeProps } from './types'

const ERRORS: Record<string, string> = {
  'not-allowed': 'Hoot needs microphone permission. Allow it in your browser settings and try again.',
  'no-speech': 'I didn’t hear anything. Tap the mic and try again.',
  network: 'Speech recognition needs an internet connection.',
}

export function ListenSpeak({ deck, card, onAnswer }: ModeProps) {
  const lang = deck.speechLang ?? 'en-US'
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
      const scored = alts.map((a) => ({ a, r: check(a, card.prompt) }))
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
      <div className="prompt-card">
        <span className="label">Say this</span>
        <span className="big-text">{card.prompt}</span>
        <span className="answer-text">{card.answer}</span>
        <div className="row center">
          <SpeakButton text={card.prompt} lang={deck.speechLang} />
          <SpeakButton text={card.prompt} lang={deck.speechLang} slow />
        </div>
      </div>

      {canListen ? (
        <>
          {state !== 'done' || !passed ? (
            <button
              type="button"
              className={`mic${state === 'listening' ? ' on' : ''}`}
              onClick={state === 'listening' ? () => stopRef.current() : start}
              aria-label={state === 'listening' ? 'Stop listening' : 'Tap and speak'}
            >
              🎙️
              <span>{state === 'listening' ? 'Listening…' : tries ? 'Try again' : 'Tap and speak'}</span>
            </button>
          ) : null}
          {error && <p className="error">{error}</p>}
          {state === 'done' && result && (
            <Feedback
              ok={passed}
              text={result === 'exact' ? 'Bellissimo! That sounded right.' : result === 'close' ? 'Nearly there!' : 'Not quite yet.'}
            >
              <p className="heard">
                I heard: <q>{heard || '…'}</q>
              </p>
              <Extra card={card} />
              <div className="row">
                {passed ? (
                  <button type="button" className="primary" autoFocus onClick={() => onAnswer(result === 'exact' ? 'good' : 'hard')}>
                    Next
                  </button>
                ) : (
                  <>
                    <button type="button" className="ghost" onClick={() => onAnswer('good')}>
                      I said it right
                    </button>
                    {tries >= 2 && (
                      <button type="button" className="ghost" onClick={() => onAnswer('again')}>
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
        <div className="feedback miss">
          <strong>
            {canSpeak ? 'This browser can’t listen yet, so say it out loud and rate yourself.' : 'Speech isn’t available in this browser.'}
          </strong>
          <Extra card={card} />
          <div className="row">
            <button type="button" className="ghost" onClick={() => onAnswer('again')}>
              Need practice
            </button>
            <button type="button" className="primary" onClick={() => onAnswer('good')}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
