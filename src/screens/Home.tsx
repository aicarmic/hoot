import { decksBySubject } from '../content'
import type { Deck } from '../content/types'
import { deckStats, today } from '../lib/srs'
import { store } from '../lib/store'

function weekCount(): number {
  const a = store.activity()
  let n = 0
  for (let i = 0; i < 7; i++) n += a[today(-i)] ?? 0
  return n
}

export function Home({ decks }: { decks: Deck[] }) {
  const week = weekCount()
  return (
    <>
      <p className="lede">
        {week ? `You’ve practised ${week} cards this week.` : 'Pick something to practise. No points, no pressure.'}
      </p>
      {[...decksBySubject(decks)].map(([subject, list]) => (
        <section key={subject}>
          <h2>{subject}</h2>
          <ul className="decks">
            {list.map((d) => {
              const s = deckStats(d, store)
              return (
                <li key={d.id}>
                  <a href={`#deck/${d.id}`} className="deck">
                    <span className="deck-title">{d.title}</span>
                    <span className="meta">
                      {d.level ? `${d.level} · ` : ''}
                      {s.total} cards
                      {s.known + s.learning ? ` · ${s.known} known · ${s.learning} learning` : ''}
                      {s.due ? ` · ${s.due} to review` : ''}
                    </span>
                    {s.known + s.learning > 0 && (
                      <span className="mini-bar" aria-hidden>
                        <span className="k" style={{ width: `${(s.known / s.total) * 100}%` }} />
                        <span className="l" style={{ width: `${(s.learning / s.total) * 100}%` }} />
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <a href="#import" className="import-link">
        ＋ Import a deck (from Gemini, a spreadsheet…)
      </a>
    </>
  )
}
