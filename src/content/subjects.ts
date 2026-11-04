import type { Deck } from './types'

/** Subjects on the way. Each gets its own Learn heading with a "Coming soon" card until real decks exist. */
export const COMING_SOON: string[] = ['Math']

/**
 * Language classes are grouped under one "Languages" heading, one card per language.
 * Any other subject gets its own heading, with one card per deck (a focused study module).
 */
export function isLanguage(decks: Deck[]): boolean {
  return decks.some((d) => !!d.speechLang && d.kind !== 'vocab')
}

/** URL-safe id for a subject, used in #class/<slug>. */
export function subjectSlug(subject: string): string {
  return encodeURIComponent(subject.toLowerCase())
}

export function subjectFromSlug(slug: string, subjects: Iterable<string>): string | undefined {
  for (const s of subjects) if (subjectSlug(s) === slug) return s
  return undefined
}
