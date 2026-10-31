import type { Card, Deck } from '../content/types'

/** Decks the family imported (e.g. from Gemini). Stored on this device; synced in step 3. */
const KEY = 'hoot.userDecks.v1'

export function loadUserDecks(): Deck[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function save(decks: Deck[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(decks))
  } catch {
    /* ignore */
  }
}

export function saveUserDeck(deck: Deck) {
  save([...loadUserDecks().filter((d) => d.id !== deck.id), deck])
}

export function deleteUserDeck(id: string) {
  save(loadUserDecks().filter((d) => d.id !== id))
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
    speechLang: str(deck.speechLang) ?? meta.speechLang,
    promptLabel: str(deck.promptLabel),
    answerLabel: str(deck.answerLabel),
    cards,
  }
}
