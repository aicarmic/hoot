/** One study item. `id` must stay stable: progress is keyed on it. */
export interface Card {
  id: string
  prompt: string
  answer: string
  example?: string
  hint?: string
  notes?: string
  tags?: string[]
  /** Hand-written wrong answers for Quiz mode. For problems, use common mistakes. */
  choices?: string[]
  /** Worked solution, one step per line. Shown after answering. */
  steps?: string[]
}

/** A deck of cards for any subject. See docs/SPEC.md#deck-format. */
export interface Deck {
  id: string
  title: string
  subject: string
  level?: string
  /** Groups decks inside a level on the home screen, e.g. "Unit 3 · Family". */
  unit?: string
  /**
   * "dialogue": the prompt is a line someone says to you (in the target language)
   * and the answer is a natural reply, also in the target language.
   * "problem": the prompt is a problem to work out on paper (math, physics…). Line breaks in
   * the prompt are kept, Quiz is always multiple choice, and `steps` show the worked solution.
   * "vocab": words in the learner's own language (e.g. SAT words). The prompt is the word, the
   * answer its meaning. Audio says the word, but the deck is not a language class.
   */
  kind?: 'dialogue' | 'problem' | 'vocab'
  /** BCP-47 language code; enables audio and Listen & speak. */
  speechLang?: string
  promptLabel?: string
  answerLabel?: string
  cards: Card[]
}
