import { LocalFile } from 'generic-filehandle2'
import { describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

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
