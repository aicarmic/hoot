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
import { Icon } from '../ui/Icon'
import { SendDialog } from './SendDialog'

const PREF = 'hoot.mode'

/** The mode picked last time on this device, if any. */
function lastUsedMode(): ModeId | null {
  try {
    return localStorage.getItem(PREF) as ModeId | null
  } catch {
    return null
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
  const lastUsed = lastUsedMode()
  const pref = lastUsed || 'flashcards'

  return (
    <>
      <div className="stack">
        <h1 className="h-page">{deck.title}</h1>
        <p className="meta">
          {deck.subject}
          {deck.level ? ` · ${deck.level}` : ''} · {s.total} cards
        </p>
      </div>

      <div className="stats">
        <div className="stat">
          <b>{s.known}</b>
          <span className="label">Known</span>
        </div>
        <div className="stat">
          <b>{s.learning}</b>
          <span className="label">Learning</span>
        </div>
        <div className="stat">
          <b>{s.fresh}</b>
          <span className="label">New</span>
        </div>
      </div>

      <section className="stack">
        <h2 className="h-section">Practise</h2>
        {modes.map((m) => (
          <a
            key={m.id}
            href={`#deck/${deck.id}/${m.id}`}
            className={`mode-pick uy-state${m.id === pref ? ' pref' : ''}`}
            onClick={() => {
              try {
                localStorage.setItem(PREF, m.id)
              } catch {
                /* ignore */
              }
            }}
          >
            <span className="lead">
              <Icon name={m.icon} />
            </span>
            <span className="grow mode-body">
              <span className="row">
                <span className="title-m">{m.name}</span>
                {m.id === lastUsed && <span className="badge">Last used</span>}
              </span>
              <span className="meta">{m.blurb}</span>
              {m.id === 'speak' && !canListen && <span className="meta">Self-rated on this browser</span>}
            </span>
            <Icon name="chevron_right" className="chev" />
          </a>
        ))}
      </section>

      <section className="stack">
        <div className="row split">
          <h2 className="h-section">Cards</h2>
          <div className="legend" aria-hidden="true">
            <span>
              <span className="dot known" />
              Known
            </span>
            <span>
              <span className="dot learning" />
              Learning
            </span>
            <span>
              <span className="dot" />
              New
            </span>
          </div>
        </div>
        <div className="cards">
          {deck.cards.map((c) => {
            const status = statusOf(progress[c.id])
            return (
              <div key={c.id} className="card-row">
                <button
                  type="button"
                  className="reveal uy-state"
                  aria-expanded={open === c.id}
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                >
                  <span className="prompt">
                    <span className={`dot ${status}`} role="img" aria-label={status} />
                    {c.prompt}
                  </span>
                  {open === c.id && (
                    <span className="ans">
                      {c.answer}
                      {c.example && <em>{c.example}</em>}
                      {c.notes && <small>{c.notes}</small>}
                    </span>
                  )}
                </button>
                <SpeakButton text={c.prompt} lang={deck.speechLang} small />
                {canSend && (
                  <button
                    type="button"
                    className="icon-btn sm uy-state"
                    aria-label={`Send “${c.prompt}” to someone`}
                    onClick={() => setSending(c.id)}
                  >
                    <Icon name="send" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {sending && (
        <SendDialog deck={deck} card={deck.cards.find((c) => c.id === sending)!} onClose={() => setSending(null)} />
      )}

      {isUserDeck(deck) && (
        <button
          type="button"
          className="uy-btn uy-state uy-btn--outlined uy-btn--with-icon start"
          onClick={() => {
            if (confirm(acct.family ? `Remove “${deck.title}” for the whole family?` : `Remove “${deck.title}” from this device?`)) {
              if (deleteUserDeck(deck.id)) forgetFamilyDeck(deck.id)
              location.hash = ''
            }
          }}
        >
          <Icon name="delete" />
          Remove this deck
        </button>
      )}
    </>
  )
}
