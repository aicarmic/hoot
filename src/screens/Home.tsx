import { decksBySubject, groupByLevel } from '../content'
import type { Deck } from '../content/types'
import { deckStats, today } from '../lib/srs'
import { store } from '../lib/store'
import type { CSSProperties } from 'react'
import { COMING_SOON, subjectSlug } from '../content/subjects'
import { Icon } from '../ui/Icon'
import { SubjectBadge } from '../ui/SubjectBadge'
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
        {week ? `You’ve practiced ${week} cards this week.` : 'Pick something to practice. No points, no pressure.'}
      </p>
      <Nudges decks={decks} />
      <section className="stack">
        <h2 className="h-section">Your classes</h2>
        <div className="classes">
          {[...decksBySubject(decks)].map(([subject, list]) => (
            <ClassCard key={subject} subject={subject} decks={list} />
          ))}
          {COMING_SOON.map((name) => (
            <div key={name} className="class-card soon" aria-label={`${name}, coming soon`}>
              <span className="head">
                <SubjectBadge subject={name} />
              </span>
              <span className="stack" style={{ gap: 2 }}>
                <span className="class-name">{name}</span>
                <span className="meta">Coming soon</span>
              </span>
            </div>
          ))}
          <a href="#import" className="class-card add uy-state">
            <Icon name="add" />
            <span>Add a class or deck</span>
            <span className="meta" style={{ fontWeight: 400 }}>
              From Gemini or a spreadsheet
            </span>
          </a>
        </div>
      </section>
    </>
  )
}

function totals(decks: Deck[]) {
  const t = { total: 0, known: 0, learning: 0, due: 0 }
  for (const d of decks) {
    const s = deckStats(d, store)
    t.total += s.total
    t.known += s.known
    t.learning += s.learning
    t.due += s.due
  }
  const started = t.known + t.learning > 0
  const pct = t.total ? Math.round((t.known / t.total) * 100) : 0
  return { ...t, started, pctLabel: started ? `${pct}% complete` : 'Not started' }
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

function shape(decks: Deck[]) {
  const levels = groupByLevel(decks).filter(([l]) => l).length
  return [levels ? plural(levels, 'level') : '', plural(decks.length, 'deck')].filter(Boolean).join(' · ')
}

function ProgressBar({ known, learning, total, style }: { known: number; learning: number; total: number; style?: CSSProperties }) {
  return (
    <span className="progress" aria-hidden="true" style={style}>
      <span className="k" style={{ width: `${total ? (known / total) * 100 : 0}%` }} />
      <span className="l" style={{ width: `${total ? (learning / total) * 100 : 0}%` }} />
    </span>
  )
}

function ClassCard({ subject, decks }: { subject: string; decks: Deck[] }) {
  const t = totals(decks)
  const label = `${subject}, ${shape(decks)}, ${t.pctLabel.toLowerCase()}${t.due ? `, ${t.due} to review` : ''}`
  return (
    <a href={`#class/${subjectSlug(subject)}`} className="class-card uy-state" aria-label={label}>
      <span className="head">
        <SubjectBadge subject={subject} />
        {t.due > 0 && <span className="due-pill">{t.due} to review</span>}
      </span>
      <span className="stack" style={{ gap: 2 }}>
        <span className="class-name">{subject}</span>
        <span className="meta">{shape(decks)}</span>
      </span>
      <span className="foot">
        <span className="pct">{t.pctLabel}</span>
        <ProgressBar {...t} />
      </span>
    </a>
  )
}

/** One class: its overall progress, then its decks by level. */
export function ClassPage({ subject, decks }: { subject: string; decks: Deck[] }) {
  const t = totals(decks)
  return (
    <>
      <div className="stack">
        <div className="class-title">
          <SubjectBadge subject={subject} />
          <h1 className="h-page">{subject}</h1>
        </div>
        <p className="meta">
          {shape(decks)} · {plural(t.total, 'card')}
        </p>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="pct">{t.pctLabel}</span>
          {t.started && (
            <span className="meta">
              {t.known} known · {t.learning} learning
              {t.due > 0 && ` · ${t.due} to review`}
            </span>
          )}
        </div>
        <ProgressBar {...t} style={{ marginTop: 0, height: 6 }} />
      </div>

      {groupByLevel(decks).map(([level, group]) => (
        <section key={level} className="stack">
          {level && <h2 className="h-section">{/^[A-C][12]$/.test(level) ? `Level ${level}` : level}</h2>}
          {group.map((d) => (
            <DeckRow key={d.id} deck={d} />
          ))}
        </section>
      ))}

      <a href="#import" className="add-row uy-state">
        <Icon name="add" />
        Add a deck to {subject}
      </a>
    </>
  )
}

function DeckRow({ deck: d }: { deck: Deck }) {
  const s = deckStats(d, store)
  const isStarted = s.known + s.learning > 0
  const tag = d.unit
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
