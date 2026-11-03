import { describe, expect, it } from 'vitest'
import { builtInDecks, groupByLevel } from '..'
import { hideSoundAid } from '../../lib/match'

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

describe('quiz options', () => {
  it('hide every sound aid in the Russian alphabet decks and touch no other notes', () => {
    const changed: string[] = []
    let aids = 0
    for (const deck of builtInDecks.filter((d) => d.speechLang)) {
      for (const card of deck.cards) {
        const shown = hideSoundAid(card.answer, card.prompt)
        if (deck.id.startsWith('ru-alphabet-') && card.answer.includes('(')) {
          aids++
          expect(shown, `${deck.id}: ${card.answer}`).not.toContain('(')
        } else if (shown !== card.answer) changed.push(`${deck.id}: ${card.answer}`)
      }
    }
    expect(aids).toBeGreaterThan(60)
    expect(changed).toEqual([])
  })
  it('keeps notes that are not sound aids', () => {
    expect(hideSoundAid('topic (tyema)', 'те́ма')).toBe('topic')
    expect(hideSoundAid("mother (mat')", 'мать')).toBe('mother')
    expect(hideSoundAid('one (1)', 'оди́н')).toBe('one (1)')
    expect(hideSoundAid('hello (formal)', 'здра́вствуйте')).toBe('hello (formal)')
    expect(hideSoundAid('Hi / Bye (informal)', 'Ciao')).toBe('Hi / Bye (informal)')
    expect(hideSoundAid('the platform (train)', 'il binario')).toBe('the platform (train)')
  })
})
