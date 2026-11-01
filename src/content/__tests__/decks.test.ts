import { describe, expect, it } from 'vitest'
import { builtInDecks, groupByLevel } from '..'

describe('built-in decks', () => {
  it('have unique deck ids and unique card ids', () => {
    const ids = builtInDecks.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const d of builtInDecks) {
      const cards = d.cards.map((c) => c.id)
      expect(new Set(cards).size, d.id).toBe(cards.length)
      for (const c of d.cards) expect(c.prompt && c.answer, `${d.id}/${c.id}`).toBeTruthy()
    }
  })
  it('only put stress marks on Cyrillic vowels', () => {
    for (const d of builtInDecks)
      for (const c of d.cards)
        for (const m of c.prompt.normalize('NFC').matchAll(/(.)́/gu))
          expect(m[1], `${d.id}/${c.id}`).toMatch(/[аеиоуыэюяАЕИОУЫЭЮЯ]/)
  })
  it('keep each language’s levels together', () => {
    for (const subject of new Set(builtInDecks.map((d) => d.subject))) {
      const levels = groupByLevel(builtInDecks.filter((d) => d.subject === subject)).map(([l]) => l)
      const order = builtInDecks.filter((d) => d.subject === subject).map((d) => d.level ?? '')
      // Each level appears as one contiguous run in file order.
      expect(order.filter((l, i) => i === 0 || l !== order[i - 1])).toEqual(levels)
    }
  })
})
