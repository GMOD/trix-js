import { describe, expect, it } from 'vitest'

import { compareCodePoints } from '../src/compare-code-points.ts'

const words = [
  'zz',
  'apple',
  '🎉party',
  '�replacement',
  '＠fullwidth',
  '🍎apple',
  '日本語',
  'a',
  '𠜎cjkext',
  '￿',
  'ｚ',
]

describe('compareCodePoints', () => {
  it('orders like utf-8 bytes', () => {
    const byBytes = words.toSorted((a, b) =>
      Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
    )
    expect(words.toSorted(compareCodePoints)).toEqual(byBytes)
  })

  it('differs from utf-16 order for astral characters', () => {
    // javascript's own sort puts the surrogate pair below 0xFFFD, utf-8 order
    // puts it above
    const pair = ['🎉', '�']
    expect(pair.toSorted()).toEqual(['🎉', '�'])
    expect(pair.toSorted(compareCodePoints)).toEqual(['�', '🎉'])
  })

  it('agrees with utf-16 order for the basic multilingual plane', () => {
    const bmp = ['apple', 'Apple', 'apples', '日本語', 'zz', 'a', '']
    expect(bmp.toSorted(compareCodePoints)).toEqual(bmp.toSorted())
  })

  it('treats a prefix as smaller than the longer string', () => {
    expect(compareCodePoints('apple', 'apples')).toBe(-1)
    expect(compareCodePoints('apples', 'apple')).toBe(1)
    expect(compareCodePoints('apple', 'apple')).toBe(0)
  })
})
