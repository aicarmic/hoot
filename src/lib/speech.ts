/** Speech helpers. Feature-detected so unsupported browsers just hide the controls. */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, lang: string, slow = false): void {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/…/g, ''))
  u.lang = lang
  u.rate = slow ? 0.6 : 0.95
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang))
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

// Minimal typing for the Web Speech recognition API (not in TS's DOM lib).
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition)

export const canListen = !!Ctor

/**
 * Listen once and resolve with the recogniser's alternatives (best first).
 * Rejects with an error code such as 'not-allowed' or 'no-speech'.
 */
export function listen(lang: string): { result: Promise<string[]>; stop: () => void } {
  if (!Ctor) return { result: Promise.reject(new Error('unsupported')), stop: () => {} }
  const r = new Ctor()
  r.lang = lang
  r.interimResults = false
  r.maxAlternatives = 5
  let settled = false
  const result = new Promise<string[]>((resolve, reject) => {
    r.onresult = (e) => {
      settled = true
      const alts = e.results[0]
      resolve(Array.from({ length: alts.length }, (_, i) => alts[i].transcript))
    }
    r.onerror = (e) => {
      settled = true
      reject(new Error(e.error))
    }
    r.onend = () => {
      if (!settled) reject(new Error('no-speech'))
    }
  })
  r.start()
  return { result, stop: () => r.abort() }
}
