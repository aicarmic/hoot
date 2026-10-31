import { useEffect, useReducer, useState } from 'react'
import { allDecks } from './content'
import { useAccount } from './lib/account'
import { onSynced } from './lib/sync'
import { MODES, type ModeId } from './modes/types'
import { DeckPage } from './screens/DeckPage'
import { Family } from './screens/Family'
import { Home } from './screens/Home'
import { Import } from './screens/Import'
import { Me } from './screens/Me'
import { Session } from './screens/Session'

function useHashRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash.slice(1))
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash.slice(1))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.split('/').filter(Boolean)
}

export default function App() {
  const [view, id, mode] = useHashRoute()
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => onSynced(rerender), [])
  const acct = useAccount()

  const decks = allDecks()
  const deck = view === 'deck' ? decks.find((d) => d.id === id) : undefined
  const validMode = MODES.some((m) => m.id === mode) ? (mode as ModeId) : undefined
  const inSession = !!(deck && validMode)

  let body
  if (view === 'import') body = <Import />
  else if (view === 'family') body = <Family />
  else if (view === 'me') body = <Me />
  else if (deck && validMode) body = <Session key={`${deck.id}-${validMode}`} deck={deck} mode={validMode} />
  else if (deck) body = <DeckPage deck={deck} />
  else body = <Home decks={decks} />

  const tab = view === 'family' ? 'family' : view === 'me' ? 'me' : 'learn'

  return (
    <div className={`app${inSession ? '' : ' with-nav'}`}>
      {!inSession && (
        <header className="top">
          <a href="#" className="brand" aria-label="Hoot home">
            <span className="owl" aria-hidden>🦉</span> Hoot
          </a>
        </header>
      )}
      <main>{body}</main>
      {!inSession && (
        <nav className="tabs" aria-label="Main">
          <a href="#" className={tab === 'learn' ? 'on' : ''}>
            <span aria-hidden>📚</span>Learn
          </a>
          <a href="#family" className={tab === 'family' ? 'on' : ''}>
            <span aria-hidden>👪</span>Family
          </a>
          <a href="#me" className={tab === 'me' ? 'on' : ''}>
            <span aria-hidden>{acct.session ? '🙂' : '👤'}</span>
            {acct.session ? 'Me' : 'Sign in'}
          </a>
        </nav>
      )}
    </div>
  )
}
