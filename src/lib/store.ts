/**
 * Progress storage. Everything goes through ProgressStore so step 3 can swap
 * the local implementation for a synced one (Supabase) without touching the UI.
 */
export interface CardProgress {
  /** Spaced-repetition state, filled in by step 2. */
  ease: number
  intervalDays: number
  due: string // ISO date
  reps: number
  lastSeen: string // ISO timestamp
}

export interface ProgressStore {
  get(deckId: string, cardId: string): CardProgress | undefined
  set(deckId: string, cardId: string, p: CardProgress): void
  deck(deckId: string): Record<string, CardProgress>
}

const KEY = 'hoot.progress.v1'

function load(): Record<string, Record<string, CardProgress>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function localStore(): ProgressStore {
  let data = load()
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage full or blocked: keep in memory */
    }
  }
  return {
    get: (d, c) => data[d]?.[c],
    set: (d, c, p) => {
      data = { ...data, [d]: { ...data[d], [c]: p } }
      save()
    },
    deck: (d) => data[d] ?? {},
  }
}
