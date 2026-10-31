import { useEffect, useState } from 'react'
import type { Deck } from '../content/types'
import { SpeakButton } from '../modes/SpeakButton'
import { useAccount } from '../lib/account'
import { markNudgeSeen, myNudges, type Nudge } from '../lib/family'

/** "Ana sent you a phrase to try" cards on the home screen. */
export function Nudges({ decks }: { decks: Deck[] }) {
  const acct = useAccount()
  const [items, setItems] = useState<Nudge[]>([])
  const uid = acct.session?.user.id

  useEffect(() => {
    if (uid) myNudges(uid).then(setItems).catch(() => {})
  }, [uid])

  const visible = items.flatMap((n) => {
    const deck = decks.find((d) => d.id === n.deck_id)
    const card = deck?.cards.find((c) => c.id === n.card_id)
    return deck && card ? [{ n, deck, card }] : []
  })
  if (!visible.length) return null
  const nameOf = (id: string) => acct.members.find((m) => m.id === id)?.display_name ?? 'Someone'
  const dismiss = (id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
    void markNudgeSeen(id)
  }

  return (
    <section className="stack">
      <h2 className="h-section">Sent to you</h2>
      {visible.map(({ n, deck, card }) => (
        <article key={n.id} className="uy-card uy-card--warm">
          <div className="uy-card__eyebrow">
            {nameOf(n.from_user)} sent you this to try{n.message ? `: “${n.message}”` : ''}
          </div>
          <div className="row nowrap-center">
            <div className="grow stack-tight">
              <p className="nudge-phrase">{card.prompt}</p>
              <p className="nudge-answer">{card.answer}</p>
            </div>
            <SpeakButton text={card.prompt} lang={deck.speechLang} />
          </div>
          <div className="uy-card__actions">
            <a className="uy-btn uy-state uy-btn--filled" href={`#deck/${deck.id}`} onClick={() => dismiss(n.id)}>
              Open {deck.title}
            </a>
            <button type="button" className="uy-btn uy-state uy-btn--text" onClick={() => dismiss(n.id)}>
              Got it
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
