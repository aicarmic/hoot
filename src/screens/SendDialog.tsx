import { useState } from 'react'
import type { Card, Deck } from '../content/types'
import { useAccount } from '../lib/account'
import { sendNudge } from '../lib/family'

export function SendDialog({ deck, card, onClose }: { deck: Deck; card: Card; onClose: () => void }) {
  const acct = useAccount()
  const others = acct.members.filter((m) => m.id !== acct.session?.user.id)
  const [to, setTo] = useState(others[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
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
        <h2>Send “{card.prompt}”</h2>
        {others.length === 0 ? (
          <p className="meta">Nobody else is in your family yet. Invite them from the Me tab.</p>
        ) : (
          <>
            <div className="choices">
              {others.map((m) => (
                <label key={m.id} className={`choice${to === m.id ? ' correct' : ''}`}>
                  <input type="radio" name="to" value={m.id} checked={to === m.id} onChange={() => setTo(m.id)} hidden />
                  {m.display_name}
                </label>
              ))}
            </div>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a note (optional)" maxLength={140} />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={!to || state !== 'idle'}>
              {state === 'sent' ? 'Sent ✓' : state === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </>
        )}
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </form>
    </div>
  )
}
