import type { Deck } from './types'

/** What the Learn tab shows on each subject card. Subjects not listed here get a generic line. */
const KNOWN: Record<string, string> = {
  Italian: 'Everyday conversation from A1 to B1, with dialogues for real situations.',
  Russian: 'The alphabet first, then everyday phrases and dialogues at A1 and A2.',
}

/** Subjects on the way. They show on the Learn tab but can't be opened yet. */
export const COMING_SOON: { name: string; description: string }[] = [
  { name: 'Math', description: 'Practice for school math topics. Coming in the next release.' },
]

export function subjectDescription(subject: string, decks: Deck[]): string {
  return KNOWN[subject] ?? `${decks.length} imported ${decks.length === 1 ? 'deck' : 'decks'}.`
}

/** URL-safe id for a subject, used in #learn/<slug>. */
export function subjectSlug(subject: string): string {
  return encodeURIComponent(subject.toLowerCase())
}

export function subjectFromSlug(slug: string, subjects: Iterable<string>): string | undefined {
  for (const s of subjects) if (subjectSlug(s) === slug) return s
  return undefined
}
