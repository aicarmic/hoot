import { useCallback, useEffect, useState } from 'react'
import type { Card, Deck } from '../content/types'
import { Flashcards } from '../modes/Flashcards'
import { ListenSpeak } from '../modes/ListenSpeak'
import { Quiz } from '../modes/Quiz'
import { MODES, type ModeId } from '../modes/types'
import { pickSession, schedule, type Grade } from '../lib/srs'
import { store } from '../lib/store'
import { syncNow } from '../lib/sync'

const COMPONENTS = { flashcards: Flashcards, quiz: Quiz, speak: ListenSpeak }

export function Session({ deck, mode }: { deck: Deck; mode: ModeId }) {
  const [queue, setQueue] = useState<Card[]>(() => pickSession(deck, store))
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Record<string, Grade>>({})
  const [retried, setRetried] = useState<Set<string>>(new Set())

  const card = queue[index]
  const finished = queue.length > 0 && !card
  useEffect(() => {
    if (finished) void syncNow()
  }, [finished])
  const Mode = COMPONENTS[mode]
  const name = MODES.find((m) => m.id === mode)?.name

  const onAnswer = useCallback(
    (grade: Grade) => {
      if (!card) return
      // Only the first answer in a session counts for scheduling.
      if (!(card.id in results)) store.set(deck.id, card.id, schedule(store.get(deck.id, card.id), grade))
      setResults((r) => (card.id in r ? r : { ...r, [card.id]: grade }))
      if (grade === 'again' && !retried.has(card.id)) {
        setQueue((q) => [...q, card])
        setRetried((s) => new Set(s).add(card.id))
      }
      setIndex((i) => i + 1)
    },
    [card, deck.id, results, retried],
  )

  const restart = () => {
    const next = pickSession(deck, store)
    setQueue(next)
    setIndex(0)
    setResults({})
    setRetried(new Set())
  }

  if (!queue.length) {
    return (
      <div className="done">
        <p>This deck has no cards yet.</p>
        <a className="primary" href={`#deck/${deck.id}`}>Back</a>
      </div>
    )
  }

  if (!card) {
    const grades = Object.values(results)
    const solid = grades.filter((g) => g === 'good' || g === 'easy').length
    return (
      <div className="done">
        <div className="owl-big" aria-hidden>🦉</div>
        <h1>Nice work</h1>
        <p>
          You practised <strong>{grades.length}</strong> cards. {solid} felt solid
          {grades.length - solid ? `, and ${grades.length - solid} will come back sooner` : ''}.
        </p>
        <div className="row center">
          <button type="button" className="primary" onClick={restart}>
            Another round
          </button>
          <a className="ghost" href={`#deck/${deck.id}`}>
            Done
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="session">
      <div className="session-top">
        <a href={`#deck/${deck.id}`} className="back" aria-label="End session">
          ✕
        </a>
        <span className="meta">
          {deck.title} · {name}
        </span>
        <span className="meta">
          {Math.min(index + 1, queue.length)}/{queue.length}
        </span>
      </div>
      <div className="bar" aria-hidden>
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <Mode key={`${card.id}-${index}`} deck={deck} card={card} reps={store.get(deck.id, card.id)?.reps ?? 0} onAnswer={onAnswer} />
    </div>
  )
}
