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

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** A rough sound spelling for comparing, not for showing: Latin letters, no accents, few doubled sounds. */
function soundKey(s: string): string {
  return stripAccents(stripStress(s).toLowerCase())
    .replace(/\p{Script=Cyrillic}/gu, (ch) => CYRILLIC[ch] ?? ch)
    .replace(/[^a-z]/g, '')
    .replace(/kh/g, 'h')
    .replace(/y(?=[aeiou])/g, '')
    .replace(/(.)\1+/g, '$1')
}

/**
 * Drops a pronunciation aid like "topic (tyema)" from an answer when the brackets just spell out
 * the prompt's sound. In multiple choice that aid points straight at the right option.
 */
export function hideSoundAid(answer: string, prompt: string): string {
  const key = soundKey(prompt)
  if (!key) return answer
  const out = answer.replace(/\s*\(([^)]*)\)/g, (whole, inner: string) => {
    if (/[^\p{Script=Latin}\s'’-]/u.test(inner)) return whole
    const k = soundKey(inner)
    return k && similarity(k, key) >= 0.7 ? '' : whole
  })
  return out.trim() || answer
}
