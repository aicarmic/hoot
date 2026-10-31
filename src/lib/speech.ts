/** Text-to-speech helpers. Feature-detected so unsupported browsers just hide the button. */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, lang: string, slow = false): void {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = slow ? 0.6 : 0.95
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang))
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

/** Speech recognition (used by Listen & speak in step 2). Chrome/Android only for now. */
export const canListen =
  typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
