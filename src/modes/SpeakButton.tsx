import { canSpeak, speak } from '../lib/speech'

export function SpeakButton({ text, lang, slow = false, big = false }: { text: string; lang?: string; slow?: boolean; big?: boolean }) {
  if (!lang || !canSpeak) return null
  return (
    <button
      type="button"
      className={`speak${big ? ' big' : ''}`}
      aria-label={slow ? `Hear "${text}" slowly` : `Hear "${text}"`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, lang, slow)
      }}
    >
      {slow ? '🐢' : '🔊'}
    </button>
  )
}
