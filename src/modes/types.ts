import type { Card, Deck } from '../content/types'
import type { Grade } from '../lib/srs'
import type { CardProgress } from '../lib/store'
import type { IconName } from '../ui/icons'

export type ModeId = 'flashcards' | 'quiz' | 'speak'

export interface ModeProps {
  deck: Deck
  card: Card
  /** How many times this card has been reviewed before (0 = new). */
  reps: number
  /** The card's current schedule, if it has been seen before. */
  progress?: CardProgress
  onAnswer: (grade: Grade) => void
}

export const MODES: { id: ModeId; name: string; blurb: string; icon: IconName; needsSpeech?: boolean }[] = [
  { id: 'flashcards', name: 'Flashcards', blurb: 'Flip, then say how well you knew it.', icon: 'style' },
  { id: 'quiz', name: 'Quiz', blurb: 'Pick the right answer, or type it once you know it.', icon: 'quiz' },
  { id: 'speak', name: 'Listen & speak', blurb: 'Hear it, say it, get gentle feedback.', icon: 'record_voice_over', needsSpeech: true },
]
