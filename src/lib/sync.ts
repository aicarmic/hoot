import type { Deck } from '../content/types'
import { getAccount, onSessionChange } from './account'
import { dayKey, store, type CardProgress } from './store'
import { supabase } from './supabase'
import { localOnlyDecks, setFamilyDecks, setLocalOnlyDecks } from './userDecks'

/**
 * Local-first sync. The app always works offline against lib/store.ts; when
 * someone is signed in this pushes their changes and pulls everything back.
 */

const OWNER_KEY = 'hoot.owner'
const listeners = new Set<() => void>()
let running: Promise<void> | null = null
let again = false
let pendingDeckDeletes: string[] = []

/** Called after a sync changes local data, so screens can re-render. */
export function onSynced(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function owner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

function setOwner(id: string) {
  try {
    localStorage.setItem(OWNER_KEY, id)
  } catch {
    /* ignore */
  }
}

/** Handle someone signing in: adopt anonymous progress, or clear another person's. */
function claimDevice(userId: string) {
  const prev = owner()
  if (prev && prev !== userId) {
    store.reset()
    setFamilyDecks([])
  } else if (!prev) {
    store.markAllDirty() // progress made before signing in becomes theirs
  }
  setOwner(userId)
}

export function forgetFamilyDeck(id: string) {
  pendingDeckDeletes.push(id)
  void syncNow()
}

export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = doSync()
    .catch((e) => console.warn('Hoot sync failed; will retry later', e))
    .finally(() => {
      running = null
      if (again) {
        again = false
        void syncNow()
      }
    })
  return running
}

async function doSync() {
  const { session, profile } = getAccount()
  if (!session || !navigator.onLine) return
  const uid = session.user.id

  // 1. Push progress changes.
  const dirty = store.dirtyEntries()
  if (dirty.length) {
    const rows = dirty.map(({ deckId, cardId, p }) => ({
      user_id: uid,
      deck_id: deckId,
      card_id: cardId,
      data: p,
      last_seen: p.lastSeen,
    }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('progress').upsert(rows.slice(i, i + 500))
      if (error) throw error
    }
    store.clearDirty(dirty.map((d) => `${d.deckId}|${d.cardId}`))
  }

  // 2. Pull progress (also brings in reviews done on other devices).
  const pulled: { deckId: string; cardId: string; p: CardProgress }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('progress')
      .select('deck_id, card_id, data')
      .eq('user_id', uid)
      .range(from, from + 999)
    if (error) throw error
    pulled.push(...(data ?? []).map((r) => ({ deckId: r.deck_id, cardId: r.card_id, p: r.data as CardProgress })))
    if (!data || data.length < 1000) break
  }
  store.mergeRemote(pulled)

  // 3. Activity: merge both ways, keeping the larger count per day.
  const since = dayKey(new Date(Date.now() - 60 * 86400000).toISOString())
  const { data: act, error: actErr } = await supabase.from('activity').select('day, cards').eq('user_id', uid).gte('day', since)
  if (actErr) throw actErr
  store.mergeActivity(Object.fromEntries((act ?? []).map((a) => [a.day, a.cards])))
  const local = Object.entries(store.activity()).filter(([day]) => day >= since)
  if (local.length) {
    const { error } = await supabase
      .from('activity')
      .upsert(local.map(([day, cards]) => ({ user_id: uid, day, cards })))
    if (error) throw error
  }

  // 4. Family decks: share local imports, apply deletes, pull the family's set.
  const familyId = profile?.family_id
  if (familyId) {
    const toShare = localOnlyDecks()
    if (toShare.length) {
      const { error } = await supabase
        .from('family_decks')
        .upsert(toShare.map((d) => ({ family_id: familyId, deck_id: d.id, deck: d, created_by: uid, updated_at: new Date().toISOString() })))
      if (error) throw error
      setLocalOnlyDecks([])
    }
    if (pendingDeckDeletes.length) {
      const ids = pendingDeckDeletes
      pendingDeckDeletes = []
      await supabase.from('family_decks').delete().eq('family_id', familyId).in('deck_id', ids)
    }
    const { data: decks, error } = await supabase.from('family_decks').select('deck').eq('family_id', familyId)
    if (error) throw error
    setFamilyDecks((decks ?? []).map((r) => r.deck as Deck))
  }

  listeners.forEach((l) => l())
}

export function initSync() {
  onSessionChange((s) => {
    if (s) {
      claimDevice(s.user.id)
      void syncNow()
    }
  })
  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void syncNow()
  })
  setInterval(() => void syncNow(), 5 * 60 * 1000)
}
