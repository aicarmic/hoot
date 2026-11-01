import { loadUserDecks } from '../lib/userDecks'
import type { Deck } from './types'

const modules = import.meta.glob<{ default: Deck }>('./decks/*.json', { eager: true })

/** Built-in decks, in the order their file names sort (prefix with 01-, 02-…). */
export const builtInDecks: Deck[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => m.default)

/** Built-in plus imported decks. */
export function allDecks(): Deck[] {
  return [...builtInDecks, ...loadUserDecks()]
}

export function isUserDeck(d: Deck) {
  return d.id.startsWith('user-')
}

export function decksBySubject(list: Deck[]): Map<string, Deck[]> {
  const out = new Map<string, Deck[]>()
  for (const d of list) out.set(d.subject, [...(out.get(d.subject) ?? []), d])
  return out
}

/** Decks split by level, in the order each level first appears. Decks without a level group under "". */
export function groupByLevel(list: Deck[]): [string, Deck[]][] {
  const out = new Map<string, Deck[]>()
  for (const d of list) out.set(d.level ?? '', [...(out.get(d.level ?? '') ?? []), d])
  return [...out]
}
