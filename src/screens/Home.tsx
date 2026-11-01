import { decksBySubject, groupByLevel } from '../content'
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
          {groupByLevel(list).map(([level, group], i, all) =>
            level && all.length > 1 ? (
              <LevelGroup key={level} level={level} decks={group} openByDefault={shouldOpen(all, i)} />
            ) : (
              group.map((d) => <DeckRow key={d.id} deck={d} />)
            ),
          )}
        </section>
      ))}
      <a href="#import" className="add-row uy-state">
        <Icon name="add" />
        Import a deck (from Gemini, a spreadsheet…)
      </a>
    </>
  )
}

function started(d: Deck) {
  const s = deckStats(d, store)
  return s.known + s.learning > 0
}

/** Open the levels someone is working in, or the first level when nothing is started yet. */
function shouldOpen(all: [string, Deck[]][], i: number): boolean {
  const active = all.map(([, g]) => g.some(started))
  return active.some(Boolean) ? active[i] : i === 0
}

function LevelGroup({ level, decks, openByDefault }: { level: string; decks: Deck[]; openByDefault: boolean }) {
  const stats = decks.map((d) => deckStats(d, store))
  const total = stats.reduce((n, s) => n + s.total, 0)
  const known = stats.reduce((n, s) => n + s.known, 0)
  const due = stats.reduce((n, s) => n + s.due, 0)
  return (
    <details className="level" open={openByDefault}>
      <summary className="uy-state">
        <span className="body">
          <span className="title-m">{level}</span>
          <span className="meta">
            {decks.length} decks · {known ? `${known} of ${total} known` : `${total} cards`}
            {due > 0 && (
              <>
                {' · '}
                <span className="due">{due} to review</span>
              </>
            )}
          </span>
        </span>
        <Icon name="expand_more" className="chev" />
      </summary>
      <div className="stack-3">
        {decks.map((d) => (
          <DeckRow key={d.id} deck={d} inLevel />
        ))}
      </div>
    </details>
  )
}

function DeckRow({ deck: d, inLevel = false }: { deck: Deck; inLevel?: boolean }) {
  const s = deckStats(d, store)
  const isStarted = s.known + s.learning > 0
  const tag = inLevel ? d.unit : d.unit ? `${d.level ? `${d.level} · ` : ''}${d.unit}` : d.level
  return (
    <a href={`#deck/${d.id}`} className="deck uy-state">
      <span className="body">
        {tag && <span className="unit">{tag}</span>}
        <span className="title-m">{d.title}</span>
        <span className="meta">
          {s.total} cards
          {isStarted ? ` · ${s.known} known · ${s.learning} learning` : ''}
          {s.due > 0 && (
            <>
              {' · '}
              <span className="due">{s.due} to review</span>
            </>
          )}
        </span>
        {isStarted && (
          <span className="progress" aria-hidden="true">
            <span className="k" style={{ width: `${(s.known / s.total) * 100}%` }} />
            <span className="l" style={{ width: `${(s.learning / s.total) * 100}%` }} />
          </span>
        )}
      </span>
      <Icon name="chevron_right" className="chev" />
    </a>
  )
}
