/**
 * Progress storage. Local-first: the UI always reads and writes here, and
 * lib/sync.ts pushes/pulls changes to Supabase when signed in.
 */
export interface CardProgress {
  ease: number
  intervalDays: number
  due: string // YYYY-MM-DD
  reps: number
  lastSeen: string // ISO timestamp
}

/** Cards reviewed per day, for "this week" and the family page. */
export type Activity = Record<string, number>
export type AllProgress = Record<string, Record<string, CardProgress>>

export interface ProgressStore {
  get(deckId: string, cardId: string): CardProgress | undefined
  set(deckId: string, cardId: string, p: CardProgress): void
  deck(deckId: string): Record<string, CardProgress>
  activity(): Activity
}

const KEY = 'hoot.progress.v1'
const ACTIVITY_KEY = 'hoot.activity.v1'
const DIRTY_KEY = 'hoot.dirty.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
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

export function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

class LocalStore implements ProgressStore {
  private data = read<AllProgress>(KEY, {})
  private act = read<Activity>(ACTIVITY_KEY, {})
  private dirty = new Set(read<string[]>(DIRTY_KEY, []))

  get(d: string, c: string) {
    return this.data[d]?.[c]
  }
  set(d: string, c: string, p: CardProgress) {
    this.data = { ...this.data, [d]: { ...this.data[d], [c]: p } }
    write(KEY, this.data)
    const day = dayKey(p.lastSeen)
    this.act = { ...this.act, [day]: (this.act[day] ?? 0) + 1 }
    write(ACTIVITY_KEY, this.act)
    this.dirty.add(`${d}|${c}`)
    write(DIRTY_KEY, [...this.dirty])
  }
  deck(d: string) {
    return this.data[d] ?? {}
  }
  activity() {
    return this.act
  }

  // ── Sync support ──
  dirtyEntries(): { deckId: string; cardId: string; p: CardProgress }[] {
    return [...this.dirty].flatMap((k) => {
      const [deckId, cardId] = k.split('|')
      const p = this.get(deckId, cardId)
      return p ? [{ deckId, cardId, p }] : []
    })
  }
  allEntries() {
    return Object.entries(this.data).flatMap(([deckId, cards]) =>
      Object.entries(cards).map(([cardId, p]) => ({ deckId, cardId, p })),
    )
  }
  clearDirty(keys: string[]) {
    for (const k of keys) this.dirty.delete(k)
    write(DIRTY_KEY, [...this.dirty])
  }
  markAllDirty() {
    for (const e of this.allEntries()) this.dirty.add(`${e.deckId}|${e.cardId}`)
    write(DIRTY_KEY, [...this.dirty])
  }
  /** Merge remote rows in; the most recently reviewed version wins. */
  mergeRemote(rows: { deckId: string; cardId: string; p: CardProgress }[]) {
    const next = { ...this.data }
    for (const { deckId, cardId, p } of rows) {
      const local = next[deckId]?.[cardId]
      if (!local || local.lastSeen < p.lastSeen) next[deckId] = { ...next[deckId], [cardId]: p }
    }
    this.data = next
    write(KEY, this.data)
  }
  /** Activity from several devices: keep the larger count for each day. */
  mergeActivity(remote: Activity) {
    const next = { ...this.act }
    for (const [day, n] of Object.entries(remote)) next[day] = Math.max(next[day] ?? 0, n)
    this.act = next
    write(ACTIVITY_KEY, this.act)
  }
  /** Wipe this device's progress (used when a different person signs in). */
  reset() {
    this.data = {}
    this.act = {}
    this.dirty.clear()
    write(KEY, {})
    write(ACTIVITY_KEY, {})
    write(DIRTY_KEY, [])
  }
}

export const store = new LocalStore()
