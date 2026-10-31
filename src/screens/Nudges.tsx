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
    <section>
      <h2>Sent to you</h2>
      <ul className="decks">
        {visible.map(({ n, deck, card }) => (
          <li key={n.id} className="nudge">
            <span className="meta">
              {nameOf(n.from_user)} sent you this to try{n.message ? `: “${n.message}”` : ''}
            </span>
            <span className="nudge-card">
              <span>
                <strong className="prompt">{card.prompt}</strong>
                <span className="answer">{card.answer}</span>
              </span>
              <SpeakButton text={card.prompt} lang={deck.speechLang} />
            </span>
            <span className="row">
              <a className="primary small" href={`#deck/${deck.id}`} onClick={() => dismiss(n.id)}>
                Open {deck.title}
              </a>
              <button type="button" className="ghost small" onClick={() => dismiss(n.id)}>
                Got it
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
