/**
 * Progress storage. Everything goes through ProgressStore so step 3 can swap
 * the local implementation for a synced one (Supabase) without touching the UI.
 */
export interface CardProgress {
  ease: number
  intervalDays: number
  due: string // YYYY-MM-DD
  reps: number
  lastSeen: string // ISO timestamp
}

/** Cards reviewed per day, for the "this week" summary and the family page. */
export type Activity = Record<string, number>

export interface ProgressStore {
  get(deckId: string, cardId: string): CardProgress | undefined
  set(deckId: string, cardId: string, p: CardProgress): void
  deck(deckId: string): Record<string, CardProgress>
  activity(): Activity
}

const KEY = 'hoot.progress.v1'
const ACTIVITY_KEY = 'hoot.activity.v1'

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: keep in memory */
  }
}

function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function localStore(): ProgressStore {
  let data = read<Record<string, Record<string, CardProgress>>>(KEY, {})
  let activity = read<Activity>(ACTIVITY_KEY, {})
  return {
    get: (d, c) => data[d]?.[c],
    set: (d, c, p) => {
      data = { ...data, [d]: { ...data[d], [c]: p } }
      write(KEY, data)
      const day = dayKey(p.lastSeen)
      activity = { ...activity, [day]: (activity[day] ?? 0) + 1 }
      write(ACTIVITY_KEY, activity)
    },
    deck: (d) => data[d] ?? {},
    activity: () => activity,
  }
}

export const store = localStore()
