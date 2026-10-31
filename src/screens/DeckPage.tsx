import { useState } from 'react'
import { isUserDeck } from '../content'
import type { Deck } from '../content/types'
import { SpeakButton } from '../modes/SpeakButton'
import { MODES, type ModeId } from '../modes/types'
import { canListen, canSpeak } from '../lib/speech'
import { deckStats, statusOf } from '../lib/srs'
import { store } from '../lib/store'
import { useAccount } from '../lib/account'
import { forgetFamilyDeck } from '../lib/sync'
import { deleteUserDeck } from '../lib/userDecks'
import { SendDialog } from './SendDialog'

const PREF = 'hoot.mode'

function preferredMode(): ModeId {
  try {
    return (localStorage.getItem(PREF) as ModeId) || 'flashcards'
  } catch {
    return 'flashcards'
  }
}

export function DeckPage({ deck }: { deck: Deck }) {
  const [open, setOpen] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const acct = useAccount()
  const canSend = !!acct.family && acct.members.length > 1
  const s = deckStats(deck, store)
  const progress = store.deck(deck.id)
  const modes = MODES.filter((m) => !m.needsSpeech || (deck.speechLang && canSpeak))
  const pref = preferredMode()

  return (
    <>
      <a href="#" className="back">← All decks</a>
      <h1>{deck.title}</h1>
      <p className="meta">
        {deck.subject}
        {deck.level ? ` · ${deck.level}` : ''} · {s.total} cards · {s.known} known · {s.learning} learning · {s.fresh} new
      </p>

      <h2>Practise</h2>
      <div className="modes">
        {modes.map((m) => (
          <a
            key={m.id}
            href={`#deck/${deck.id}/${m.id}`}
            className={`mode-pick${m.id === pref ? ' pref' : ''}`}
            onClick={() => {
              try {
                localStorage.setItem(PREF, m.id)
              } catch {
                /* ignore */
              }
            }}
          >
            <strong>{m.name}</strong>
            <span>{m.blurb}</span>
            {m.id === 'speak' && !canListen && <small>Self-rated on this browser</small>}
          </a>
        ))}
      </div>

      <h2>Cards</h2>
      <ul className="cards">
        {deck.cards.map((c) => (
          <li key={c.id} className="card">
            <button className="reveal" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="prompt">
                <span className={`dot ${statusOf(progress[c.id])}`} aria-label={statusOf(progress[c.id])} />
                {c.prompt}
              </span>
              {open === c.id && (
                <span className="answer">
                  {c.answer}
                  {c.example && <em className="example">{c.example}</em>}
                  {c.notes && <small className="notes">{c.notes}</small>}
                </span>
              )}
            </button>
            <SpeakButton text={c.prompt} lang={deck.speechLang} />
            {canSend && (
              <button type="button" className="speak" aria-label={`Send "${c.prompt}" to someone`} onClick={() => setSending(c.id)}>
                📨
              </button>
            )}
          </li>
        ))}
      </ul>

      {sending && (
        <SendDialog deck={deck} card={deck.cards.find((c) => c.id === sending)!} onClose={() => setSending(null)} />
      )}

      {isUserDeck(deck) && (
        <button
          type="button"
          className="ghost danger"
          onClick={() => {
            if (confirm(acct.family ? `Remove “${deck.title}” for the whole family?` : `Remove “${deck.title}” from this device?`)) {
              if (deleteUserDeck(deck.id)) forgetFamilyDeck(deck.id)
              location.hash = ''
            }
          }}
        >
          Remove this deck
        </button>
      )}
    </>
  )
}
