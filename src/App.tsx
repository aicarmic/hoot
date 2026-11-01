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
import { Icon } from './ui/Icon'
import type { IconName } from './ui/icons'
import { Wordmark } from './ui/Wordmark'

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
  // Deck and import pages get a back link instead of the wordmark.
  const backHeader = view === 'import' || (!!deck && !inSession)

  if (inSession) return <div className="app">{body}</div>

  return (
    <div className="app">
      {backHeader ? (
        <header className="top back">
          <a href="#" className="icon-btn uy-state" aria-label="All decks">
            <Icon name="arrow_back" />
          </a>
          <span className="meta" aria-hidden="true">
            All decks
          </span>
        </header>
      ) : (
        <header className="top">
          <a href="#" className="brand" aria-label="Hoot home">
            <Wordmark />
          </a>
        </header>
      )}
      <main className={`main${backHeader ? ' tight' : ''}`}>{body}</main>
      <nav className="nav" aria-label="Main">
        <NavTab href="#" icon="menu_book" label="Learn" on={tab === 'learn'} />
        <NavTab href="#family" icon="group" label="Family" on={tab === 'family'} />
        <NavTab href="#me" icon="person" label={acct.session ? 'Me' : 'Sign in'} on={tab === 'me'} />
      </nav>
    </div>
  )
}

function NavTab({ href, icon, label, on }: { href: string; icon: IconName; label: string; on: boolean }) {
  return (
    <a href={href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
      <span className="ind">
        <Icon name={icon} filled={on} />
      </span>
      {label}
    </a>
  )
}
