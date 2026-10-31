import { useEffect, useState } from 'react'
import { allDecks } from './content'
import { MODES, type ModeId } from './modes/types'
import { DeckPage } from './screens/DeckPage'
import { Home } from './screens/Home'
import { Import } from './screens/Import'
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
  const decks = allDecks()
  const deck = view === 'deck' ? decks.find((d) => d.id === id) : undefined
  const validMode = MODES.some((m) => m.id === mode) ? (mode as ModeId) : undefined

  let body
  if (view === 'import') body = <Import />
  else if (deck && validMode) body = <Session key={`${deck.id}-${validMode}`} deck={deck} mode={validMode} />
  else if (deck) body = <DeckPage deck={deck} />
  else body = <Home decks={decks} />

  return (
    <div className="app">
      {!(deck && validMode) && (
        <header className="top">
          <a href="#" className="brand" aria-label="Hoot home">
            <span className="owl" aria-hidden>🦉</span> Hoot
          </a>
        </header>
      )}
      <main>{body}</main>
    </div>
  )
}
