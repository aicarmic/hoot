import { useSyncExternalStore } from 'react'
import type { Deck } from '../content/types'
import { store } from './store'
import { supabase } from './supabase'

/**
 * Class enrollment. A class is a language (all its decks) or one study module (one deck).
 * Progress is saved only in classes you are enrolled in; anything else is a preview.
 * Each enrollment also says whether that class sends daily reminders.
 * Local-first like progress: kept on the device and synced to Supabase (enrollments).
 */
export interface Enrollment {
  reminders: boolean
  enrolledAt: string
}
type Enrollments = Record<string, Enrollment>

const KEY = 'hoot.enrollments.v1'
const DIRTY_KEY = 'hoot.enrollments.dirty.v1'
const MIGRATED_KEY = 'hoot.enrollments.migrated'

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
    /* ignore */
  }
}

let data = read<Enrollments>(KEY, {})
/** Class ids changed on this device and not yet sent to Supabase. */
let dirty = new Set(read<string[]>(DIRTY_KEY, []))
let preview: string | null = null
const listeners = new Set<() => void>()
let snapshot: { enrollments: Enrollments; preview: string | null } = { enrollments: data, preview }

function notify() {
  snapshot = { enrollments: data, preview }
  listeners.forEach((l) => l())
}

let onLocalChange: () => void = () => {}
/** Called after someone enrolls, leaves or flips a reminder here (lib/sync.ts syncs then). */
export function onEnrollmentChange(fn: () => void) {
  onLocalChange = fn
}

function save() {
  write(KEY, data)
  write(DIRTY_KEY, [...dirty])
  notify()
}

/** Enrollments and the class being previewed; re-renders when either changes. */
export function useEnrollments(): { enrollments: Enrollments; preview: string | null } {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
}

/** Languages are one class per language; every other deck is its own class. */
export function classIdOf(deck: Deck): string {
  return deck.speechLang && deck.kind !== 'vocab' ? `lang:${deck.subject}` : deck.id
}

export function classTitle(classId: string, decks: Deck[]): string {
  if (classId.startsWith('lang:')) return classId.slice(5)
  return decks.find((d) => d.id === classId)?.title ?? classId
}

export const isEnrolled = (classId: string) => !!data[classId]

export function enroll(classId: string) {
  if (data[classId]) return
  data = { ...data, [classId]: { reminders: true, enrolledAt: new Date().toISOString() } }
  dirty.add(classId)
  if (preview === classId) preview = null
  save()
  onLocalChange()
}

export function leave(classId: string) {
  const next = { ...data }
  delete next[classId]
  data = next
  dirty.add(classId)
  save()
  onLocalChange()
}

export function setReminders(classId: string, reminders: boolean) {
  if (!data[classId]) return
  data = { ...data, [classId]: { ...data[classId], reminders } }
  dirty.add(classId)
  save()
  onLocalChange()
}

// ── Preview: looking around a class without enrolling ──

/** The class being previewed right now, if any. Forgotten when you leave the class. */
export const previewing = () => preview

export function startPreview(classId: string) {
  preview = classId
  notify()
}

export function endPreview() {
  if (preview === null) return
  preview = null
  notify()
}

// ── Sync ──

/**
 * Once per person per device: enroll in every class that already has progress from before
 * enrollment existed, so nobody is asked to enroll in a class they were already doing.
 */
export function migrateFromProgress(decks: Deck[], who: string) {
  const key = `${MIGRATED_KEY}.${who}`
  if (read(key, false)) return
  for (const d of decks) if (Object.keys(store.deck(d.id)).length) enroll(classIdOf(d))
  write(key, true)
}

/** Send local changes, then take the server's list. */
export async function syncEnrollments(uid: string) {
  const changed = [...dirty]
  if (changed.length) {
    const upserts = changed.filter((id) => data[id])
    const deletes = changed.filter((id) => !data[id])
    if (upserts.length) {
      const { error } = await supabase.from('enrollments').upsert(
        upserts.map((id) => ({ user_id: uid, class_id: id, reminders: data[id].reminders, enrolled_at: data[id].enrolledAt })),
      )
      if (error) throw error
    }
    if (deletes.length) {
      const { error } = await supabase.from('enrollments').delete().eq('user_id', uid).in('class_id', deletes)
      if (error) throw error
    }
    for (const id of changed) dirty.delete(id)
  }
  const { data: rows, error } = await supabase.from('enrollments').select('class_id, reminders, enrolled_at').eq('user_id', uid)
  if (error) throw error
  const next: Enrollments = {}
  for (const r of rows ?? []) next[r.class_id] = { reminders: r.reminders, enrolledAt: r.enrolled_at }
  // Keep anything changed here while the request was out.
  for (const id of dirty) {
    if (data[id]) next[id] = data[id]
    else delete next[id]
  }
  data = next
  save()
}

/** A different person signed in on this device: forget the last one's classes. */
export function resetEnrollments() {
  data = {}
  dirty = new Set()
  preview = null
  save()
}
