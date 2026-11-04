/**
 * SAT Prep Words schedule. Pure date maths with no imports, so the daily reminder script
 * (scripts/sat-nudge.mjs, run by Node in GitHub Actions) can share it with the app.
 *
 * words.json is in teaching order: the 20 words the old Home Assistant automation posted
 * (2026-10-23 to 2026-11-03), then the rest in a fixed shuffled order. Two words go out
 * every Monday to Saturday from START. Sunday has no new words; it is quiz day, covering
 * that week's Monday to Saturday words. Everyone in the family sees the same words each day.
 */

export interface SatWord {
  word: string
  pos: string
  definition: string
  example: string
}

/** The first day words went out. */
export const START = '2026-10-23'
export const PER_DAY = 2

/** YYYY-MM-DD → whole days since 1970-01-01 (calendar maths, no time zones). */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

function fromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days)
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return (((dayNumber(date) + 4) % 7) + 7) % 7 // 1970-01-01 was a Thursday
}

export const isSunday = (date: string) => weekday(date) === 0

/** Monday to Saturday days from START up to and including `date`. */
function teachingDays(date: string): number {
  const n = dayNumber(date) - dayNumber(START) + 1
  if (n <= 0) return 0
  const weeks = Math.floor(n / 7)
  let days = weeks * 6
  // The leftover days start on START's weekday.
  for (let i = 0; i < n % 7; i++) if (weekday(addDays(START, weeks * 7 + i)) !== 0) days++
  return days
}

/** How many words have gone out on or before `date`. */
export function introducedBy(date: string, total: number): number {
  return Math.min(total, teachingDays(date) * PER_DAY)
}

/** A half-open range of positions in words.json. */
export interface Range {
  from: number
  to: number
}

/** The words that go out on `date` (none on Sunday, or once the list is finished). */
export function newOn(date: string, total: number): Range {
  return { from: introducedBy(addDays(date, -1), total), to: introducedBy(date, total) }
}

/** The Monday of the week that `date` is in (weeks run Monday to Sunday). */
export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7))
}

/** This week's words so far: Monday up to `date` (on Sunday, the whole Monday to Saturday). */
export function weekSoFar(date: string, total: number): Range {
  return { from: introducedBy(addDays(mondayOf(date), -1), total), to: introducedBy(date, total) }
}

/**
 * The first week in Hoot (Monday 2026-11-02) has a catch-up quiz: it covers every word so far,
 * including the ones that only went out on WhatsApp.
 */
export const CATCH_UP_WEEK = '2026-11-02'

/** What the weekly quiz on `date` covers: this week's words so far, or everything in the catch-up week. */
export function quizRange(date: string, total: number): Range {
  const r = weekSoFar(date, total)
  return mondayOf(date) === CATCH_UP_WEEK ? { from: 0, to: r.to } : r
}

/** The pop quiz: the two words that went out before today's. */
export function popQuiz(date: string, total: number): Range {
  const to = introducedBy(addDays(date, -1), total)
  return { from: Math.max(0, to - PER_DAY), to }
}

/** The day the last words go out. */
export function lastDay(total: number): string {
  let date = START
  while (introducedBy(date, total) < total) date = addDays(date, 1)
  return date
}

export interface Nudge {
  title: string
  body: string
  /** Hash route to open, relative to the app's start URL. */
  url: string
  tag: string
}

const list = (ws: string[]) => (ws.length <= 2 ? ws.join(' and ') : `${ws.slice(0, -1).join(', ')} and ${ws.at(-1)}`)

/** The daily reminder for `date` (Monday to Saturday), or null when no words go out. */
export function dailyNudge(date: string, words: SatWord[]): Nudge | null {
  const total = words.length
  const pick = (r: Range) => words.slice(r.from, r.to).map((w) => w.word)
  const today = pick(newOn(date, total))
  if (!today.length) return null
  const last = introducedBy(date, total) === total
  const quiz = pick(popQuiz(date, total))
  return {
    title: last ? 'The last SAT words' : 'Today’s SAT words',
    body: `${list(today)}.${quiz.length ? ` Pop quiz: who remembers ${list(quiz)}?` : ''}${last ? ` That makes all ${total}.` : ''}`,
    url: '#deck/sat-words',
    tag: 'sat-daily',
  }
}

/** The weekly quiz reminder for `date`, or null when there is nothing to quiz on. */
export function quizNudge(date: string, words: SatWord[]): Nudge | null {
  const r = quizRange(date, words.length)
  const n = r.to - r.from
  if (!n) return null
  const catchUp = r.from === 0 && mondayOf(date) === CATCH_UP_WEEK
  return {
    title: catchUp ? 'SAT catch-up quiz' : 'SAT quiz time',
    body: catchUp ? `All ${n} words so far. See how many you remember.` : `This week’s ${n} words. See how many you remember.`,
    url: '#deck/sat-words/quiz/week',
    tag: 'sat-quiz',
  }
}
