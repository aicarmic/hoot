import { describe, expect, it } from 'vitest'
import { check, variants } from '../match'
import { nextReviewLabel, schedule, today } from '../srs'
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
  it('ignores Russian stress marks and ё, but keeps й', () => {
    expect(check('молоко', 'молоко\u0301')).toBe('exact')
    expect(check('Ещё', 'ещё')).toBe('exact')
    expect(check('еще', 'ещё')).toBe('exact')
    expect(check('мои', 'мой')).not.toBe('exact')
    expect(check('мои', 'мой')).not.toBe('accent')
    expect(check('пожалуйста', 'пожа\u0301луйста')).toBe('exact')
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
  it('keeps problem decks and their worked steps', () => {
    const json = JSON.stringify({
      title: 'Systems',
      subject: 'Math',
      kind: 'problem',
      cards: [
        { prompt: 'y = x + 1\ny = 2x − 1', answer: '(2, 3)', steps: ['x + 1 = 2x − 1', 'x = 2', ''], choices: ['(3, 2)'] },
        { prompt: '3x − y = 12\n2x + y = 8', answer: '(4, 0)' },
      ],
    })
    const deck = parseDeck(json, { title: '', subject: '' })
    expect(deck.kind).toBe('problem')
    expect(deck.cards[0].prompt).toContain('\n')
    expect(deck.cards[0].steps).toEqual(['x + 1 = 2x − 1', 'x = 2'])
    expect(deck.cards[1].steps).toBeUndefined()
  })

  it('explains what is wrong', () => {
    expect(() => parseDeck('{oops', { title: 'x', subject: '' })).toThrow(/didn't parse/)
    expect(() => parseDeck('just one,line', { title: 'x', subject: '' })).toThrow(/at least two/)
  })

  it('finds the JSON when Gemini wraps it in text', () => {
    const json = JSON.stringify({
      title: 'Cells',
      subject: 'Biology',
      unit: 'Unit 1',
      cards: [
        { id: '1', prompt: 'Controls the cell?', answer: 'Nucleus', example: 'e.g. in a cheek cell' },
        { id: '2', prompt: 'Releases energy?', answer: 'Mitochondria' },
      ],
    })
    const deck = parseDeck(`Here is your deck:\n\n\`\`\`json\n${json}\n\`\`\`\nLet me know!`, { title: '', subject: '' })
    expect(deck.title).toBe('Cells')
    expect(deck.subject).toBe('Biology')
    expect(deck.unit).toBe('Unit 1')
    expect(deck.cards[0].example).toBe('e.g. in a cheek cell')
  })
})

describe('nextReviewLabel', () => {
  it('follows schedule() for each grade', () => {
    expect(nextReviewLabel(undefined, 'again')).toBe('today')
    expect(nextReviewLabel(undefined, 'hard')).toBe('1 day')
    expect(nextReviewLabel(undefined, 'good')).toBe('1 day')
    expect(nextReviewLabel(undefined, 'easy')).toBe('2 days')
    const seen = schedule(schedule(undefined, 'good'), 'good')
    expect(nextReviewLabel(seen, 'good')).toBe(`${schedule(seen, 'good').intervalDays} days`)
    expect(nextReviewLabel({ ...seen, intervalDays: 50, reps: 5 }, 'easy')).toMatch(/months$/)
  })
})
