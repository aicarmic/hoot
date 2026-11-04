import { today } from '../../lib/srs'
import { dayKey, store } from '../../lib/store'
import type { Card, Deck } from '../types'
import { CATCH_UP_WEEK, introducedBy, isSunday, mondayOf, newOn, popQuiz, quizRange, weekSoFar, weekday, type Range, type SatWord } from './schedule'
import wordList from './words.json'

export const SAT_DECK_ID = 'sat-words'
export const words: SatWord[] = wordList
export const TOTAL = words.length

function toCard(w: SatWord): Card {
  return { id: w.word.toLowerCase(), prompt: w.word, answer: w.definition, hint: w.pos, example: w.example }
}

const cardsIn = (r: Range) => words.slice(r.from, r.to).map(toCard)

/**
 * SAT Prep Words as a deck: every word that has gone out so far, by today's date on this
 * device. Card ids are the words themselves, so progress stays put as the deck grows.
 */
export function satDeck(date = today()): Deck {
  return {
    id: SAT_DECK_ID,
    title: 'SAT Prep Words',
    subject: 'Test prep',
    level: 'SAT',
    kind: 'vocab',
    speechLang: 'en-US',
    promptLabel: 'Word',
    answerLabel: 'Meaning',
    cards: cardsIn({ from: 0, to: introducedBy(date, TOTAL) }),
  }
}

/** Where the module stands on `date`. */
export function satDay(date = today()) {
  return {
    date,
    sunday: isSunday(date),
    introduced: introducedBy(date, TOTAL),
    total: TOTAL,
    finished: introducedBy(date, TOTAL) === TOTAL && newOn(date, TOTAL).from === TOTAL,
    today: words.slice(newOn(date, TOTAL).from, newOn(date, TOTAL).to),
    popQuiz: words.slice(popQuiz(date, TOTAL).from, popQuiz(date, TOTAL).to),
    week: words.slice(weekSoFar(date, TOTAL).from, weekSoFar(date, TOTAL).to),
    /** What the weekly quiz covers today (everything so far in the catch-up week). */
    quiz: words.slice(quizRange(date, TOTAL).from, quizRange(date, TOTAL).to),
    catchUp: mondayOf(date) === CATCH_UP_WEEK,
    weekday: weekday(date),
  }
}

/** Cards for a focused session: "today" (today's new words) or "week" (the weekly quiz). */
export function satFocusCards(focus: string, date = today()): Card[] | undefined {
  if (focus === 'today') return cardsIn(newOn(date, TOTAL))
  if (focus === 'week') return cardsIn(quizRange(date, TOTAL))
  return undefined
}

/** True once every one of today's new words has been practiced today. */
export function satTodayDone(list = satDay().today): boolean {
  const progress = store.deck(SAT_DECK_ID)
  return list.length > 0 && list.every((w) => {
    const p = progress[w.word.toLowerCase()]
    return !!p && dayKey(p.lastSeen) === today()
  })
}
