/** Fuzzy answer checking shared by Quiz (typed) and Listen & speak. */

export type MatchResult = 'exact' | 'accent' | 'close' | 'wrong'

/** Drops accents from Latin letters only, so Cyrillic й and ё survive. */
const stripAccents = (s: string) =>
  s.replace(/\p{Script=Latin}/gu, (ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))

/** Russian stress marks (a combining acute after a Cyrillic vowel). Learner aids, never required. */
export const stripStress = (s: string) => s.normalize('NFC').replace(/(?<=\p{Script=Cyrillic})\u0301/gu, '')

export function normalize(s: string, keepAccents = true): string {
  const base = stripStress(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return keepAccents ? base : stripAccents(base)
}

/** Accepted answers: "Hi / Bye (informal)" → ["hi", "bye"]. Also the whole thing. */
export function variants(answer: string): string[] {
  const parts = answer.split(/[/;]|\bor\b/).map((p) => p.replace(/…|\.\.\./g, ''))
  return [...new Set([answer, ...parts].map((p) => normalize(p)).filter(Boolean))]
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

export function check(given: string, answer: string): MatchResult {
  const g = normalize(given)
  if (!g) return 'wrong'
  let best: MatchResult = 'wrong'
  for (const v of variants(answer)) {
    if (g === v) return 'exact'
    if (stripAccents(g) === stripAccents(v)) best = 'accent'
    else if (best === 'wrong' && similarity(stripAccents(g), stripAccents(v)) >= 0.8) best = 'close'
  }
  return best
}
