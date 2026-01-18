import { LocalFile } from 'generic-filehandle2'
import { describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'
import { concatUint8Array, sum } from '../src/util.ts'

describe('Edge case handling', () => {
  const trix = new Trix(
    new LocalFile('./test/testData/test1/myTrix.ixx'),
    new LocalFile('./test/testData/test1/myTrix.ix'),
  )

  it('returns empty array for empty string search', async () => {
    const result = await trix.search('')
    expect(result).toEqual([])
  })

  it('returns empty array for whitespace-only search', async () => {
    const result = await trix.search('   ')
    expect(result).toEqual([])
  })

  it('returns empty array for single space search', async () => {
    const result = await trix.search(' ')
    expect(result).toEqual([])
  })

  it('handles search term with trailing spaces', async () => {
    const result = await trix.search('this   ')
    expect(result).toMatchSnapshot()
  })

  it('handles search term with leading spaces', async () => {
    const result = await trix.search('   this')
    expect(result).toEqual([])
  })
})

describe('Utility functions', () => {
  describe('sum', () => {
    it('returns 0 for empty array', () => {
      expect(sum([])).toBe(0)
    })

    it('calculates correct sum of Uint8Array lengths', () => {
      const arrays = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5]),
        new Uint8Array([6]),
      ]
      expect(sum(arrays)).toBe(6)
    })

    it('handles single array', () => {
      const arrays = [new Uint8Array([1, 2, 3, 4, 5])]
      expect(sum(arrays)).toBe(5)
    })
  })

  describe('concatUint8Array', () => {
    it('returns empty array for empty input', () => {
      const result = concatUint8Array([])
      expect(result).toEqual(new Uint8Array([]))
    })

    it('concatenates multiple arrays correctly', () => {
      const arrays = [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4]),
        new Uint8Array([5]),
      ]
      const result = concatUint8Array(arrays)
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    })

    it('handles single array', () => {
      const arrays = [new Uint8Array([1, 2, 3])]
      const result = concatUint8Array(arrays)
      expect(result).toEqual(new Uint8Array([1, 2, 3]))
    })
  })
})
