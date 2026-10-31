import { describe, expect, it } from 'vitest'
import { check, variants } from '../match'
import { schedule, today } from '../srs'
import { parseDeck } from '../userDecks'

describe('check', () => {
  it('accepts any slash variant and ignores notes in brackets', () => {
    expect(variants('Hi / Bye (informal)')).toEqual(expect.arrayContaining(['hi', 'bye']))
    expect(check('bye', 'Hi / Bye (informal)')).toBe('exact')
  })
  it('flags missing accents and near misses', () => {
    expect(check('lunedi', 'lunedì')).toBe('accent')
    expect(check('arrivederchi', 'Arrivederci')).toBe('close')
    expect(check('grazie', 'Prego')).toBe('wrong')
  })
})

describe('schedule', () => {
  it('grows intervals on good and resets on again', () => {
    const a = schedule(undefined, 'good')
    expect(a.intervalDays).toBe(1)
    const b = schedule(a, 'good')
    expect(b.intervalDays).toBe(3)
    const c = schedule(b, 'good')
    expect(c.intervalDays).toBeGreaterThan(3)
    const d = schedule(c, 'again')
    expect(d.intervalDays).toBe(0)
    expect(d.due).toBe(today())
  })
})

describe('parseDeck', () => {
  it('reads Gemini JSON, even inside code fences', () => {
    const deck = parseDeck(
      '```json\n{"id":"cells","title":"Cells","subject":"Biology","cards":[{"id":"1","prompt":"Powerhouse of the cell","answer":"Mitochondria"},{"id":"2","prompt":"Holds DNA","answer":"Nucleus"}]}\n```',
      { title: '', subject: '' },
    )
    expect(deck.id).toBe('user-cells')
    expect(deck.subject).toBe('Biology')
    expect(deck.cards).toHaveLength(2)
  })
  it('reads CSV with and without a header', () => {
    const withHeader = parseDeck('question,answer\n"2+2","4"\n3x3,9', { title: 'Maths', subject: 'Maths' })
    expect(withHeader.cards.map((c) => c.answer)).toEqual(['4', '9'])
    const bare = parseDeck('cane,dog\ngatto,cat', { title: 'Animals', subject: 'Italian', speechLang: 'it-IT' })
    expect(bare.cards[0]).toMatchObject({ prompt: 'cane', answer: 'dog' })
    expect(bare.speechLang).toBe('it-IT')
  })
  it('explains what is wrong', () => {
    expect(() => parseDeck('{oops', { title: 'x', subject: '' })).toThrow(/didn't parse/)
    expect(() => parseDeck('just one,line', { title: 'x', subject: '' })).toThrow(/at least two/)
  })
})
