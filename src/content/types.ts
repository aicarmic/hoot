/** One study item. `id` must stay stable: progress is keyed on it. */
export interface Card {
  id: string
  prompt: string
  answer: string
  example?: string
  hint?: string
  notes?: string
  tags?: string[]
  /** Hand-written wrong answers for Quiz mode. */
  choices?: string[]
}

/** A deck of cards for any subject. See docs/SPEC.md#deck-format. */
export interface Deck {
  id: string
  title: string
  subject: string
  level?: string
  /** BCP-47 language code; enables audio and Listen & speak. */
  speechLang?: string
  promptLabel?: string
  answerLabel?: string
  cards: Card[]
}
