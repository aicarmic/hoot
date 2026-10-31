import { useEffect, useState } from 'react'
import { useAccount } from '../lib/account'
import { familySummary, timeAgo, type MemberSummary } from '../lib/family'

export function Family() {
  const acct = useAccount()
  const [rows, setRows] = useState<MemberSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!acct.family) return
    familySummary()
      .then(setRows)
      .catch(() => setError('Couldn’t load the family right now. Are you online?'))
  }, [acct.family])

  if (!acct.ready) return <p className="meta">Loading…</p>
  if (!acct.session || !acct.family)
    return (
      <>
        <h1>Family</h1>
        <p className="lede">See what everyone has been practising, and send each other phrases to try.</p>
        <a className="primary" href="#me">
          {acct.session ? 'Join or start a family' : 'Sign in to get started'}
        </a>
      </>
    )

  return (
    <>
      <h1>{acct.family.name}</h1>
      <p className="lede">What everyone has been practising this week.</p>
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p className="meta">Loading…</p>}
      <ul className="decks">
        {rows?.map((m) => {
          const me = m.user_id === acct.session?.user.id
          return (
            <li key={m.user_id} className="deck member">
              <span className="avatar" aria-hidden>
                {m.display_name.slice(0, 1).toUpperCase()}
              </span>
              <span className="member-body">
                <span className="deck-title">
                  {m.display_name}
                  {me ? ' (you)' : ''}
                  {m.today_cards > 0 && <span className="today"> · practised today</span>}
                </span>
                <span className="meta">
                  {m.week_cards} cards this week · {m.known_cards} known · {m.learning_cards} learning
                </span>
                <span className="meta">Last practised {timeAgo(m.last_practised)}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="meta" style={{ marginTop: 16 }}>
        Tip: open any deck and tap 📨 on a card to send it to someone.
      </p>
    </>
  )
}
