import { useCallback, useEffect, useState } from 'react'
import type { Card, Deck } from '../content/types'
import { Flashcards } from '../modes/Flashcards'
import { ListenSpeak } from '../modes/ListenSpeak'
import { Quiz } from '../modes/Quiz'
import { MODES, type ModeId } from '../modes/types'
import { pickSession, schedule, type Grade } from '../lib/srs'
import { store } from '../lib/store'
import { syncNow } from '../lib/sync'
import { Icon } from '../ui/Icon'

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

  const top = (label: string, count: string, pct: number, closeLabel: string) => (
    <>
      <div className="session-top">
        <a href={`#deck/${deck.id}`} className="icon-btn uy-state" aria-label={closeLabel}>
          <Icon name="close" />
        </a>
        <span className="t">{label}</span>
        <span className="count">{count}</span>
      </div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </>
  )

  if (!queue.length) {
    return (
      <main className="done">
        <p className="lede">This deck has no cards yet.</p>
        <a className="uy-btn uy-state uy-btn--filled" href={`#deck/${deck.id}`}>
          Back
        </a>
      </main>
    )
  }

  if (!card) {
    const grades = Object.values(results)
    const solid = grades.filter((g) => g === 'good' || g === 'easy').length
    const sooner = grades.length - solid
    return (
      <>
        {top(deck.title, '', 100, 'Back to deck')}
        <main className="done">
          <div className="done-mark" aria-hidden="true">
            <Icon name="nights_stay" />
          </div>
          <h1 className="h-page">Nice work</h1>
          <p className="lede">
            You practised <strong>{grades.length}</strong> cards. {solid} felt solid
            {sooner ? `, and ${sooner} will come back sooner` : ''}.
          </p>
          <div className="tally">
            <div className="stat">
              <b>{solid}</b>
              <span className="label">Felt solid</span>
            </div>
            <div className="stat">
              <b>{sooner}</b>
              <span className="label">Coming back sooner</span>
            </div>
          </div>
          <div className="row center">
            <button type="button" className="uy-btn uy-state uy-btn--filled uy-btn--with-icon" onClick={restart}>
              <Icon name="replay" />
              Another round
            </button>
            <a className="uy-btn uy-state uy-btn--outlined" href={`#deck/${deck.id}`}>
              Done
            </a>
          </div>
        </main>
      </>
    )
  }

  const progress = store.get(deck.id, card.id)
  return (
    <>
      {top(`${deck.title} · ${name}`, `${Math.min(index + 1, queue.length)}/${queue.length}`, (index / queue.length) * 100, 'End session')}
      <main className="session-main">
        <Mode key={`${card.id}-${index}`} deck={deck} card={card} reps={progress?.reps ?? 0} progress={progress} onAnswer={onAnswer} />
      </main>
    </>
  )
}
