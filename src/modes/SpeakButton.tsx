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
  return (
    <button
      type="button"
      className={`icon-btn uy-state${tonal ? ' tonal' : ''}${small ? ' sm' : ''}`}
      aria-label={slow ? `Hear “${text}” slowly` : `Hear “${text}”`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, lang, slow)
      }}
    >
      <Icon name={slow ? 'slow_motion_video' : 'volume_up'} />
    </button>
  )
}
