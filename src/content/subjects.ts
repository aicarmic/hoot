/** Subjects on the way. They show on the Learn tab as classes that can't be opened yet. */
export const COMING_SOON: string[] = ['Math']

/** URL-safe id for a subject, used in #class/<slug>. */
export function subjectSlug(subject: string): string {
  return encodeURIComponent(subject.toLowerCase())
}

export function subjectFromSlug(slug: string, subjects: Iterable<string>): string | undefined {
  for (const s of subjects) if (subjectSlug(s) === slug) return s
  return undefined
}
