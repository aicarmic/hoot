import type { Card, Deck } from '../content/types'
import type { Grade } from '../lib/srs'

export type ModeId = 'flashcards' | 'quiz' | 'speak'

export interface ModeProps {
  deck: Deck
  card: Card
  /** How many times this card has been reviewed before (0 = new). */
  reps: number
  onAnswer: (grade: Grade) => void
}

export const MODES: { id: ModeId; name: string; blurb: string; needsSpeech?: boolean }[] = [
  { id: 'flashcards', name: 'Flashcards', blurb: 'Flip, then say how well you knew it.' },
  { id: 'quiz', name: 'Quiz', blurb: 'Pick the right answer, or type it once you know it.' },
  { id: 'speak', name: 'Listen & speak', blurb: 'Hear it, say it, get gentle feedback.', needsSpeech: true },
]
