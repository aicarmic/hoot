import { useState } from 'react'
import { SAT_DECK_ID, satDay, satTodayDone } from '../content/sat'
import type { SatWord } from '../content/sat/schedule'
import type { Deck } from '../content/types'
import { SpeakButton } from '../modes/SpeakButton'
import { DAYS, hourLabel, loadPrefs } from '../lib/reminderPrefs'
import { deckStats, statusOf } from '../lib/srs'
import { store } from '../lib/store'
import { Icon } from '../ui/Icon'

const cardId = (w: SatWord) => w.word.toLowerCase()

/** SAT Prep Words: two new words a day, a pop quiz on the last two, and a quiz on Sunday. */
export function SatPage({ deck }: { deck: Deck }) {
  const day = satDay()
  const s = deckStats(deck, store)
  const done = satTodayDone(day.today)
  const pct = ((day.introduced / day.total) * 100).toFixed(1)
  const prefs = loadPrefs()
  // Quiz day: Sunday always (no new words), plus the day this person picked in Settings.
  const quizDay = !day.finished && day.quiz.length > 0 && (day.sunday || day.weekday === prefs.quizDay)

  return (
    <>
      <div className="stack">
        <h1 className="h-page">{deck.title}</h1>
        <p className="meta">Two new words a day, Monday to Saturday, and a weekly quiz</p>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <div className="row split">
          <span className="pct">
            {day.introduced} of {day.total} words
          </span>
          <span className="meta">
            {pct}%{s.known + s.learning > 0 ? ` · ${s.known} known` : ''}
          </span>
        </div>
        <span className="progress" aria-hidden="true" style={{ marginTop: 0, height: 6 }}>
          <span className="k" style={{ width: `${(s.known / day.total) * 100}%` }} />
          <span className="l" style={{ width: `${((day.introduced - s.known) / day.total) * 100}%` }} />
        </span>
      </div>

      {day.finished ? (
        <article className="uy-card uy-card--warm">
          <div className="uy-card__eyebrow">All done</div>
          <p className="title-m">You did it, that’s {day.total} words.</p>
          <p className="uy-card__body">Every word in the SAT list has gone out. Keep practicing below so they stick.</p>
        </article>
      ) : (
        quizDay && (
          <article className="uy-card uy-card--warm">
            <div className="uy-card__eyebrow">{day.catchUp ? 'Catch-up quiz' : 'Weekly quiz'}</div>
            <p className="title-m">{day.catchUp ? `All ${day.quiz.length} words so far` : `This week’s ${day.quiz.length} words`}</p>
            <p className="uy-card__body">
              {day.catchUp
                ? 'Including the ones that went out on WhatsApp. See how many you remember.'
                : `${day.sunday ? 'No new words today. ' : ''}See how many of this week’s you remember.`}
            </p>
            <div className="uy-card__actions">
              <a className="uy-btn uy-state uy-btn--filled uy-btn--with-icon" href={`#deck/${SAT_DECK_ID}/quiz/week`}>
                <Icon name="quiz" />
                Start the quiz
              </a>
            </div>
          </article>
        )
      )}

      {!day.finished && !day.sunday && (
        <section className="stack">
          <div className="row split">
            <h2 className="h-section">Today’s words</h2>
            {done && (
              <span className="badge">
                <Icon name="check" />
                Practiced
              </span>
            )}
          </div>
          {day.today.map((w) => (
            <WordCard key={w.word} w={w} lang={deck.speechLang} />
          ))}
          <a
            className={`uy-btn uy-state uy-btn--with-icon start ${done ? 'uy-btn--outlined' : 'uy-btn--filled'}`}
            href={`#deck/${SAT_DECK_ID}/flashcards/today`}
          >
            <Icon name="style" />
            {done ? 'Go over them again' : 'Learn them with flashcards'}
          </a>
        </section>
      )}

      {!day.finished && !day.sunday && day.popQuiz.length > 0 && <PopQuiz words={day.popQuiz} />}

      <section className="stack">
        <h2 className="h-section">Practice every word so far</h2>
        <a href={`#deck/${SAT_DECK_ID}/flashcards`} className="mode-pick uy-state">
          <span className="lead">
            <Icon name="style" />
          </span>
          <span className="grow mode-body">
            <span className="title-m">Flashcards</span>
            <span className="meta">{s.due ? `${s.due} due for review, then new ones.` : 'Flip, then say how well you knew it.'}</span>
          </span>
          <Icon name="chevron_right" className="chev" />
        </a>
        <a href={`#deck/${SAT_DECK_ID}/quiz`} className="mode-pick uy-state">
          <span className="lead">
            <Icon name="quiz" />
          </span>
          <span className="grow mode-body">
            <span className="title-m">Quiz</span>
            <span className="meta">Pick the meaning, then type the word once you know it.</span>
          </span>
          <Icon name="chevron_right" className="chev" />
        </a>
      </section>

      <a href="#settings" className="mode-pick uy-state">
        <span className="lead">
          <Icon name="notifications" />
        </span>
        <span className="grow mode-body">
          <span className="title-m">Reminders</span>
          <span className="meta">
            {prefs.dailyHour === null ? 'No daily reminder' : `New words at ${hourLabel(prefs.dailyHour)}`} ·{' '}
            {prefs.quizHour === null ? 'no quiz reminder' : `quiz ${DAYS[prefs.quizDay]} at ${hourLabel(prefs.quizHour)}`}
          </span>
        </span>
        <Icon name="chevron_right" className="chev" />
      </a>

      {day.week.length > 0 && <WordList title={day.sunday ? 'This week' : 'This week so far'} words={day.week} lang={deck.speechLang} />}
    </>
  )
}

function WordCard({ w, lang }: { w: SatWord; lang?: string }) {
  return (
    <article className="uy-card uy-card--outlined sat-word">
      <div className="row split nowrap-center">
        <span className="word">
          {w.word} <em>{w.pos}</em>
        </span>
        <SpeakButton text={w.word} lang={lang} small />
      </div>
      <p className="def">{w.definition}</p>
      <p className="uy-card__body">
        <em>{w.example}</em>
      </p>
    </article>
  )
}

function PopQuiz({ words }: { words: SatWord[] }) {
  const [shown, setShown] = useState(false)
  return (
    <article className="uy-card uy-card--warm">
      <div className="uy-card__eyebrow">Pop quiz</div>
      <p className="title-m">
        Who remembers what{' '}
        {words.map((w, i) => (
          <span key={w.word}>
            {i > 0 && ' and '}
            <b>{w.word}</b>
          </span>
        ))}{' '}
        {words.length === 1 ? 'means' : 'mean'}?
      </p>
      {shown ? (
        words.map((w) => (
          <p key={w.word} className="uy-card__body">
            <b>{w.word}</b>: {w.definition}
          </p>
        ))
      ) : (
        <div className="uy-card__actions">
          <button type="button" className="uy-btn uy-state uy-btn--text" onClick={() => setShown(true)}>
            Show me
          </button>
        </div>
      )}
    </article>
  )
}

function WordList({ title, words, lang }: { title: string; words: SatWord[]; lang?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const progress = store.deck(SAT_DECK_ID)
  return (
    <section className="stack">
      <h2 className="h-section">{title}</h2>
      <div className="cards">
        {words.map((w) => {
          const status = statusOf(progress[cardId(w)])
          return (
            <div key={w.word} className="card-row">
              <button type="button" className="reveal uy-state" aria-expanded={open === w.word} onClick={() => setOpen(open === w.word ? null : w.word)}>
                <span className="prompt">
                  <span className={`dot ${status}`} role="img" aria-label={status} />
                  {w.word}
                </span>
                {open === w.word && (
                  <span className="ans">
                    {w.definition}
                    <small>{w.pos}</small>
                    <em>{w.example}</em>
                  </span>
                )}
              </button>
              <SpeakButton text={w.word} lang={lang} small />
            </div>
          )
        })}
      </div>
    </section>
  )
}
