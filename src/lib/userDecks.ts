import type { Card, Deck } from '../content/types'

/**
 * Imported decks (e.g. from Gemini). `hoot.userDecks.v1` holds decks imported on
 * this device that haven't been shared yet; `hoot.familyDecks.v1` caches the
 * family's shared decks from Supabase. lib/sync.ts moves the first into the second.
 */
const LOCAL_KEY = 'hoot.userDecks.v1'
const FAMILY_KEY = 'hoot.familyDecks.v1'

function readList(key: string): Deck[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function writeList(key: string, decks: Deck[]) {
  try {
    localStorage.setItem(key, JSON.stringify(decks))
  } catch {
    /* ignore */
  }
}

export const localOnlyDecks = () => readList(LOCAL_KEY)
export const setLocalOnlyDecks = (d: Deck[]) => writeList(LOCAL_KEY, d)
export const setFamilyDecks = (d: Deck[]) => writeList(FAMILY_KEY, d)

/** Family decks plus any not yet shared, without duplicates. */
export function loadUserDecks(): Deck[] {
  const byId = new Map<string, Deck>()
  for (const d of [...readList(FAMILY_KEY), ...readList(LOCAL_KEY)]) byId.set(d.id, d)
  return [...byId.values()]
}

export function saveUserDeck(deck: Deck) {
  writeList(LOCAL_KEY, [...readList(LOCAL_KEY).filter((d) => d.id !== deck.id), deck])
}

/** Removes locally; returns true if it was a shared family deck (sync deletes it remotely). */
export function deleteUserDeck(id: string): boolean {
  writeList(LOCAL_KEY, readList(LOCAL_KEY).filter((d) => d.id !== id))
  const fam = readList(FAMILY_KEY)
  writeList(FAMILY_KEY, fam.filter((d) => d.id !== id))
  return fam.some((d) => d.id === id)
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'deck'

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** Parse a CSV line, honouring double quotes. */
function csvRow(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === sep) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export interface ImportMeta {
  title: string
  subject: string
  speechLang?: string
}

/**
 * Turn pasted JSON (Hoot deck format) or CSV (prompt,answer[,example,hint]) into a Deck.
 * Throws an Error with a friendly message if it can't.
 */
export function parseDeck(text: string, meta: ImportMeta): Deck {
  const raw = text.trim().replace(/^```(?:json|csv)?\s*/i, '').replace(/```\s*$/, '').trim()
  if (!raw) throw new Error('Paste a deck first.')

  let deck: Omit<Partial<Deck>, "cards"> & { cards?: unknown[] }
  if (raw.startsWith('{') || raw.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error("That looks like JSON but it didn't parse. Check it was copied completely.")
    }
    deck = Array.isArray(parsed) ? { cards: parsed } : (parsed as typeof deck)
  } else {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim())
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ','
    let rows = lines.map((l) => csvRow(l, sep))
    let cols = ['prompt', 'answer', 'example', 'hint']
    if (rows[0].some((h) => /^(prompt|question|term|front)$/i.test(h))) {
      cols = rows[0].map((h) => {
        const k = h.toLowerCase()
        return /question|term|front/.test(k) ? 'prompt' : /back|definition/.test(k) ? 'answer' : k
      })
      rows = rows.slice(1)
    }
    deck = { cards: rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]]))) }
  }

  const seen = new Set<string>()
  const cards: Card[] = (deck.cards ?? []).flatMap((c, i) => {
    const o = (c ?? {}) as Record<string, unknown>
    const prompt = str(o.prompt) ?? str(o.question) ?? str(o.front)
    const answer = str(o.answer) ?? str(o.back)
    if (!prompt || !answer) return []
    let id = str(String(o.id ?? '')) ?? slug(prompt)
    if (seen.has(id)) id = `${id}-${i}`
    seen.add(id)
    const choices = Array.isArray(o.choices) ? o.choices.filter((x): x is string => typeof x === 'string') : undefined
    return [
      {
        id,
        prompt,
        answer,
        example: str(o.example),
        hint: str(o.hint),
        notes: str(o.notes),
        choices: choices?.length ? choices : undefined,
      },
    ]
  })
  if (cards.length < 2) throw new Error('I need at least two cards, each with a prompt and an answer.')

  const title = str(deck.title) ?? meta.title.trim()
  if (!title) throw new Error('Give the deck a title.')
  return {
    id: `user-${str(deck.id) ? slug(deck.id!) : slug(title)}`,
    title,
    subject: str(deck.subject) ?? (meta.subject.trim() || 'My decks'),
    level: str(deck.level),
    unit: str(deck.unit),
    kind: deck.kind === 'dialogue' ? 'dialogue' : undefined,
    speechLang: str(deck.speechLang) ?? meta.speechLang,
    promptLabel: str(deck.promptLabel),
    answerLabel: str(deck.answerLabel),
    cards,
  }
}
