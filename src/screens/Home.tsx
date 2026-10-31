import { decksBySubject } from '../content'
import type { Deck } from '../content/types'
import { deckStats, today } from '../lib/srs'
import { store } from '../lib/store'
import { Icon } from '../ui/Icon'
import { Nudges } from './Nudges'

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
      <Nudges decks={decks} />
      {[...decksBySubject(decks)].map(([subject, list]) => (
        <section key={subject} className="stack">
          <h2 className="h-section">{subject}</h2>
          {list.map((d) => {
            const s = deckStats(d, store)
            const started = s.known + s.learning > 0
            return (
              <a key={d.id} href={`#deck/${d.id}`} className="deck uy-state">
                <span className="body">
                  <span className="title-m">{d.title}</span>
                  <span className="meta">
                    {d.level ? `${d.level} · ` : ''}
                    {s.total} cards
                    {started ? ` · ${s.known} known · ${s.learning} learning` : ''}
                    {s.due > 0 && (
                      <>
                        {' · '}
                        <span className="due">{s.due} to review</span>
                      </>
                    )}
                  </span>
                  {started && (
                    <span className="progress" aria-hidden="true">
                      <span className="k" style={{ width: `${(s.known / s.total) * 100}%` }} />
                      <span className="l" style={{ width: `${(s.learning / s.total) * 100}%` }} />
                    </span>
                  )}
                </span>
                <Icon name="chevron_right" className="chev" />
              </a>
            )
          })}
        </section>
      ))}
      <a href="#import" className="add-row uy-state">
        <Icon name="add" />
        Import a deck (from Gemini, a spreadsheet…)
      </a>
    </>
  )
}
