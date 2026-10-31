import type { Card, Deck } from '../content/types'
import type { CardProgress, ProgressStore } from './store'

export type Grade = 'again' | 'hard' | 'good' | 'easy'

/** Local calendar date as YYYY-MM-DD. */
export function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** SM-2 style scheduling, simplified. Returns the card's next state. */
export function schedule(prev: CardProgress | undefined, grade: Grade): CardProgress {
  let ease = prev?.ease ?? 2.5
  let interval = prev?.intervalDays ?? 0
  let reps = prev?.reps ?? 0

  if (grade === 'again') {
    reps = 0
    interval = 0
    ease = Math.max(1.3, ease - 0.2)
  } else {
    const base = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease)
    if (grade === 'hard') {
      interval = Math.max(1, Math.round(Math.max(interval, 1) * 1.2))
      ease = Math.max(1.3, ease - 0.15)
    } else if (grade === 'good') {
      interval = base
    } else {
      interval = Math.round(base * 1.3) + 1
      ease += 0.15
    }
    reps += 1
  }
  return { ease, intervalDays: interval, reps, due: today(interval), lastSeen: new Date().toISOString() }
}

export type CardStatus = 'new' | 'learning' | 'known'

export function statusOf(p: CardProgress | undefined): CardStatus {
  if (!p) return 'new'
  return p.intervalDays >= 7 ? 'known' : 'learning'
}

export function deckStats(deck: Deck, store: ProgressStore) {
  const progress = store.deck(deck.id)
  const t = today()
  let known = 0
  let learning = 0
  let due = 0
  for (const c of deck.cards) {
    const p = progress[c.id]
    const s = statusOf(p)
    if (s === 'known') known++
    else if (s === 'learning') learning++
    if (p && p.due <= t) due++
  }
  return { known, learning, fresh: deck.cards.length - known - learning, due, total: deck.cards.length }
}

/**
 * Pick cards for a session: due reviews first, then a few new cards.
 * If nothing is due or new, practise the cards seen longest ago.
 */
export function pickSession(deck: Deck, store: ProgressStore, size = 10, maxNew = 5): Card[] {
  const progress = store.deck(deck.id)
  const t = today()
  const due = deck.cards
    .filter((c) => progress[c.id] && progress[c.id].due <= t)
    .sort((a, b) => progress[a.id].due.localeCompare(progress[b.id].due))
  const fresh = deck.cards.filter((c) => !progress[c.id])
  const picked = [...due.slice(0, size)]
  picked.push(...fresh.slice(0, Math.min(maxNew, size - picked.length)))
  if (picked.length < size) {
    const rest = deck.cards
      .filter((c) => !picked.includes(c) && progress[c.id])
      .sort((a, b) => progress[a.id].lastSeen.localeCompare(progress[b.id].lastSeen))
    picked.push(...rest.slice(0, size - picked.length))
  }
  if (picked.length < Math.min(size, deck.cards.length)) {
    picked.push(...fresh.filter((c) => !picked.includes(c)).slice(0, size - picked.length))
  }
  return shuffle(picked)
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
