import { useEffect, useState } from 'react'
import { decks, decksBySubject } from './content'
import type { Deck } from './content/types'
import { canSpeak, speak } from './lib/speech'

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1))
  useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const route = useHashRoute()
  const deck = route.startsWith('deck/') ? decks.find((d) => d.id === route.slice(5)) : undefined

  return (
    <div className="app">
      <header className="top">
        <a href="#" className="brand" aria-label="Hoot home">
          <span className="owl" aria-hidden>🦉</span> Hoot
        </a>
      </header>
      <main>{deck ? <DeckView deck={deck} /> : <Home />}</main>
    </div>
  )
}

function Home() {
  return (
    <>
      <p className="lede">Pick something to practise. No points, no pressure.</p>
      {[...decksBySubject()].map(([subject, list]) => (
        <section key={subject}>
          <h2>{subject}</h2>
          <ul className="decks">
            {list.map((d) => (
              <li key={d.id}>
                <a href={`#deck/${d.id}`} className="deck">
                  <span className="deck-title">{d.title}</span>
                  <span className="meta">
                    {d.level ? `${d.level} · ` : ''}
                    {d.cards.length} cards
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function DeckView({ deck }: { deck: Deck }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <a href="#" className="back">← All decks</a>
      <h1>{deck.title}</h1>
      <p className="meta">
        {deck.subject}
        {deck.level ? ` · ${deck.level}` : ''} · tap a card to reveal it
      </p>
      <p className="soon">Flashcards, Quiz and Listen &amp; speak modes arrive in the next build.</p>
      <ul className="cards">
        {deck.cards.map((c) => (
          <li key={c.id} className="card">
            <button className="reveal" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="prompt">{c.prompt}</span>
              {open === c.id && (
                <span className="answer">
                  {c.answer}
                  {c.example && <em className="example">{c.example}</em>}
                  {c.notes && <small className="notes">{c.notes}</small>}
                </span>
              )}
            </button>
            {deck.speechLang && canSpeak && (
              <button
                className="speak"
                aria-label={`Hear "${c.prompt}"`}
                onClick={() => speak(c.prompt, deck.speechLang!)}
              >
                🔊
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
