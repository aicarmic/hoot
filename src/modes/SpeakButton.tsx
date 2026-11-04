import { canSpeak, speak } from '../lib/speech'
import { Icon } from '../ui/Icon'

export function SpeakButton({
  text,
  lang,
  slow = false,
  tonal = false,
  small = false,
}: {
  text: string
  lang?: string
  slow?: boolean
  tonal?: boolean
  small?: boolean
}) {
  if (!lang || !canSpeak) return null
  const play = (e: React.MouseEvent) => {
    e.stopPropagation()
    speak(text, lang, slow)
  }
  // The big buttons under a prompt say what they do; the small ones in lists stay icon-only.
  if (tonal)
    return (
      <button
        type="button"
        className="uy-btn uy-state uy-btn--tonal uy-btn--with-icon"
        aria-label={slow ? `Hear “${text}” slowly` : `Hear “${text}”`}
        onClick={play}
      >
        <Icon name={slow ? 'slow_motion_video' : 'volume_up'} />
        {slow ? 'Slowly' : 'Listen'}
      </button>
    )
  return (
    <button
      type="button"
      className={`icon-btn uy-state${small ? ' sm' : ''}`}
      aria-label={slow ? `Hear “${text}” slowly` : `Hear “${text}”`}
      onClick={play}
    >
      <Icon name={slow ? 'slow_motion_video' : 'volume_up'} />
    </button>
  )
}
