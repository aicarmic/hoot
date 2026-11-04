import { describe, expect, it } from 'vitest'
import { satDeck, satDay, satFocusCards, TOTAL, words } from '..'
import { introducedBy, isSunday, lastDay, newOn, nudgeFor, popQuiz, weekSoFar } from '../schedule'

// What the old Home Assistant automation posted, in order.
const POSTED = `plausible,2026-10-23
abase,2026-10-23
antagonism,2026-10-24
circuitous,2026-10-24
compensate,2026-10-26
linchpin,2026-10-26
abjure,2026-10-27
camaraderie,2026-10-27
deprecate,2026-10-28
travesty,2026-10-28
efficacious,2026-10-29
antecedent,2026-10-29
placate,2026-10-30
chaos,2026-10-30
defer,2026-10-31
insipid,2026-10-31
utilitarian,2026-11-02
spurious,2026-11-02
swarthy,2026-11-03
allay,2026-11-03`
  .trim()
  .split('\n')
  .map((l) => l.split(','))

const at = (r: { from: number; to: number }) => words.slice(r.from, r.to).map((w) => w.word)

describe('SAT word list', () => {
  it('has 936 unique words with a meaning, part of speech and example', () => {
    expect(TOTAL).toBe(936)
    expect(new Set(words.map((w) => w.word.toLowerCase())).size).toBe(TOTAL)
    for (const w of words) {
      expect(w.definition && w.example, w.word).toBeTruthy()
      expect(['adjective', 'noun', 'verb', 'adverb']).toContain(w.pos)
    }
  })
})

describe('SAT schedule', () => {
  it('replays the words already posted, on the days they went out', () => {
    for (const [i, [word, date]] of POSTED.entries()) {
      expect(words[i].word).toBe(word)
      expect(at(newOn(date, TOTAL))).toContain(word)
    }
    expect(introducedBy('2026-11-03', TOTAL)).toBe(20)
  })
  it('picks up after allay with two new words a day', () => {
    expect(newOn('2026-11-04', TOTAL)).toEqual({ from: 20, to: 22 })
    expect(at(popQuiz('2026-11-04', TOTAL))).toEqual(['swarthy', 'allay'])
  })
  it('sends nothing new on Sunday, and quizzes Monday to Saturday', () => {
    expect(isSunday('2026-11-08')).toBe(true)
    expect(newOn('2026-11-08', TOTAL).to - newOn('2026-11-08', TOTAL).from).toBe(0)
    const week = at(weekSoFar('2026-11-08', TOTAL))
    expect(week).toHaveLength(12)
    expect(week.slice(0, 4)).toEqual(['utilitarian', 'spurious', 'swarthy', 'allay'])
    // A weekday's "this week so far" runs Monday to today.
    expect(at(weekSoFar('2026-11-04', TOTAL))).toEqual([...week.slice(0, 6)])
  })
  it('finishes after 468 teaching days', () => {
    const end = lastDay(TOTAL)
    expect(introducedBy(end, TOTAL)).toBe(TOTAL)
    expect(introducedBy(`${end.slice(0, 8)}01`, TOTAL)).toBeLessThan(TOTAL)
    expect(satDay(end).finished).toBe(false)
    expect(satDay('2099-01-01').finished).toBe(true)
  })
})

describe('SAT deck', () => {
  it('holds the words out so far and focuses on today or the week', () => {
    expect(satDeck('2026-11-04').cards).toHaveLength(22)
    expect(satDeck('2026-11-04').cards[20].id).toBe(words[20].word.toLowerCase())
    expect(satFocusCards('today', '2026-11-04')?.map((c) => c.prompt)).toEqual(at({ from: 20, to: 22 }))
    expect(satFocusCards('week', '2026-11-08')).toHaveLength(12)
    expect(satDeck('2020-01-01').cards).toHaveLength(0)
  })
})

describe('5 pm reminder', () => {
  it('matches the old daily post', () => {
    expect(nudgeFor('2026-11-03', words)).toMatchObject({
      title: 'Today’s SAT words',
      body: 'swarthy and allay. Pop quiz: who remembers utilitarian and spurious?',
      url: '#deck/sat-words',
    })
  })
  it('announces the Sunday quiz, and stops when the list is done', () => {
    expect(nudgeFor('2026-11-08', words)).toMatchObject({ title: 'Sunday SAT quiz', url: '#deck/sat-words/quiz/week' })
    expect(nudgeFor(lastDay(TOTAL), words)?.title).toBe('The last SAT words')
    expect(nudgeFor('2099-01-05', words)).toBeNull()
  })
})
