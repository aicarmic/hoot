import type { Deck } from './types'

const modules = import.meta.glob<{ default: Deck }>('./decks/*.json', { eager: true })

/** All built-in decks, sorted by subject then title. */
export const decks: Deck[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title))

export function decksBySubject(list: Deck[] = decks): Map<string, Deck[]> {
  const out = new Map<string, Deck[]>()
  for (const d of list) out.set(d.subject, [...(out.get(d.subject) ?? []), d])
  return out
}
