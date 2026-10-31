import { useEffect, useState } from 'react'
import { useAccount } from '../lib/account'
import { Icon } from '../ui/Icon'
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
        <div className="stack">
          <h1 className="h-page">Family</h1>
          <p className="lede">See what everyone has been practising, and send each other phrases to try.</p>
        </div>
        <a className="uy-btn uy-state uy-btn--filled start" href="#me">
          {acct.session ? 'Join or start a family' : 'Sign in to get started'}
        </a>
      </>
    )

  return (
    <>
      <div className="stack">
        <h1 className="h-page">{acct.family.name}</h1>
        <p className="lede">What everyone has been practising this week.</p>
      </div>
      {error && (
        <p className="error">
          <Icon name="error" />
          {error}
        </p>
      )}
      {!rows && !error && <p className="meta">Loading…</p>}
      {rows && (
        <div className="stack">
          {rows.map((m) => {
            const me = m.user_id === acct.session?.user.id
            return (
              <div key={m.user_id} className="member">
                <span className="avatar" aria-hidden="true">
                  {m.display_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="grow member-body">
                  <span className="row">
                    <span className="title-m">
                      {m.display_name}
                      {me ? ' (you)' : ''}
                    </span>
                    {m.today_cards > 0 && (
                      <span className="today">
                        <Icon name="check" />
                        Practised today
                      </span>
                    )}
                  </span>
                  <span className="meta">
                    {m.week_cards} cards this week · {m.known_cards} known · {m.learning_cards} learning
                  </span>
                  <span className="meta">Last practised {timeAgo(m.last_practised)}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="meta with-icon">
        <Icon name="send" />
        <span>Open any deck and tap send on a card to share it with someone.</span>
      </p>
    </>
  )
}
