import { describe, expect, it } from 'vitest'

import { dedupe } from '../src/dedupe.ts'

describe('dedupe', () => {
  it('returns empty array for empty input', () => {
    expect(dedupe([])).toEqual([])
  })

  it('removes duplicate primitives', () => {
    expect(dedupe([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
  })

  it('removes duplicate strings', () => {
    expect(dedupe(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
  })

  it('removes duplicate objects using default hasher', () => {
    const input = [{ x: 1 }, { x: 2 }, { x: 1 }, { x: 3 }]
    expect(dedupe(input)).toEqual([{ x: 1 }, { x: 2 }, { x: 3 }])
  })

  it('uses custom hasher function', () => {
    const input = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ]
    const result = dedupe(input, item => String(item.id))
    expect(result).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ])
  })

  it('preserves order of first occurrence', () => {
    expect(dedupe([3, 1, 2, 1, 3, 2])).toEqual([3, 1, 2])
  })

  it('handles arrays with tuple values', () => {
    const input: [string, string][] = [
      ['term1', 'value1'],
      ['term2', 'value2'],
      ['term1', 'value1'],
      ['term3', 'value1'],
    ]
    const result = dedupe(input, elt => elt[1])
    expect(result).toEqual([
      ['term1', 'value1'],
      ['term2', 'value2'],
    ])
  })
})
