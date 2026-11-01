import { useState } from 'react'
import type { Card, Deck } from '../content/types'
import { useAccount } from '../lib/account'
import { sendNudge } from '../lib/family'
import { Icon } from '../ui/Icon'
import { TextField } from '../ui/TextField'

export function SendDialog({ deck, card, onClose }: { deck: Deck; card: Card; onClose: () => void }) {
  const acct = useAccount()
  const others = acct.members.filter((m) => m.id !== acct.session?.user.id)
  const [to, setTo] = useState(others[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const toName = others.find((m) => m.id === to)?.display_name

  return (
    <>
      <div className="scrim" aria-hidden="true" onClick={onClose} />
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Send “${card.prompt}”`}
        onSubmit={async (e) => {
          e.preventDefault()
          setState('sending')
          try {
            await sendNudge({ familyId: acct.family!.id, from: acct.session!.user.id, to, deckId: deck.id, cardId: card.id, message })
            setState('sent')
            setTimeout(onClose, 900)
          } catch (err) {
            setError((err as Error).message)
            setState('idle')
          }
        }}
      >
        <span className="handle" aria-hidden="true" />
        <div className="stack">
          <h2 className="h-sheet">Send “{card.prompt}”</h2>
          <p className="meta">
            {card.answer} · from {deck.title}
          </p>
        </div>
        {others.length === 0 ? (
          <p className="meta">Nobody else is in your family yet. Invite them from the Me tab.</p>
        ) : (
          <>
            <div className="stack" role="radiogroup" aria-label="Send to">
              {others.map((m) => (
                <label key={m.id} className={`pick uy-state${to === m.id ? ' on' : ''}`}>
                  <input type="radio" name="to" value={m.id} checked={to === m.id} onChange={() => setTo(m.id)} className="sr-only" />
                  <Icon name={to === m.id ? 'radio_button_checked' : 'radio_button_unchecked'} />
                  {m.display_name}
                </label>
              ))}
            </div>
            <TextField
              label="Add a note (optional)"
              placeholder="Try this at dinner"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={140}
            />
            {error && (
              <p className="error">
                <Icon name="error" />
                {error}
              </p>
            )}
          </>
        )}
        <div className="stack">
          {others.length > 0 && (
            <button type="submit" className="uy-btn uy-state uy-btn--filled uy-btn--with-icon block" disabled={!to || state !== 'idle'}>
              <Icon name={state === 'sent' ? 'check' : 'send'} />
              {state === 'sent' ? `Sent to ${toName}` : state === 'sending' ? 'Sending…' : 'Send'}
            </button>
          )}
          <button type="button" className="uy-btn uy-state uy-btn--text block" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </>
  )
}
