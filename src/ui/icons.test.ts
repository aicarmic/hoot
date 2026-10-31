import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { ICONS } from './icons'

describe('icon font', () => {
  it('index.html loads exactly the icons the app uses, sorted', () => {
    const names = html.match(/icon_names=([a-z0-9_,]+)/)?.[1].split(',')
    expect(names).toEqual([...ICONS])
    expect([...ICONS]).toEqual([...ICONS].sort())
  })
})
