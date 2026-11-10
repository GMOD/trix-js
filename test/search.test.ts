import { LocalFile } from 'generic-filehandle2'
import { describe, expect, it } from 'vitest'

import Trix from '../src/index.ts'

describe('Test a search of test1 ix file', () => {
  const searchTerms = [
    'this',
    'is',
    'id1',
    'nope',
    'fOR',
    'for this',
    'this is for id2',
  ]
  for (const searchTerm of searchTerms) {
    it(`Search for "${searchTerm}" in test1/myTrix.ix`, async () => {
      const trix1 = new Trix(
        new LocalFile('./test/testData/test1/myTrix.ixx'),
        new LocalFile('./test/testData/test1/myTrix.ix'),
      )
      const hitList = await trix1.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    })
  }
})

describe('Test a search of test2 ix file', () => {
  const searchTerms = [
    'FocAd',
    'LINC',
    'none',
    'prickle',
    'znf8',
    'enst',
    'enst alg',
    'enst ac',
    'tim',
  ]
  for (const searchTerm of searchTerms) {
    it(`Search for "${searchTerm}" in test2/out.ix`, async () => {
      const trix2 = new Trix(
        new LocalFile('./test/testData/test2/out.ixx'),
        new LocalFile('./test/testData/test2/out.ix'),
      )
      const hitList = await trix2.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    })
  }
})

describe('Test a search of test3 ix file', () => {
  const searchTerms = ['focad', 'nothing', 'tim', 'prickle', 'oca', 'zzz', 'zx']
  for (const searchTerm of searchTerms) {
    it(`Search for "${searchTerm}" in test3/out.ix`, async () => {
      const trix3 = new Trix(
        new LocalFile('./test/testData/test3/out.ixx'),
        new LocalFile('./test/testData/test3/out.ix'),
      )
      const hitList = await trix3.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    })
  }
})

describe('Test a search of test4 ix file', () => {
  const searchTerm = 'ek'
  it(`Search for "${searchTerm}" in test4/out.ix`, async () => {
    const trix4 = new Trix(
      new LocalFile('./test/testData/test4/out.ixx'),
      new LocalFile('./test/testData/test4/out.ix'),
    )
    const hitList = await trix4.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test maxResults for search of test3 ix file', () => {
  const searchTerm = 'tim'
  it(`Search for "${searchTerm}" with a max of 5 results`, async () => {
    const trix3 = new Trix(
      new LocalFile('./test/testData/test3/out.ixx'),
      new LocalFile('./test/testData/test3/out.ix'),
      5,
    )
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('maxResults counts distinct records', () => {
  // 'vdac' matches 39 term/record pairs but only 20 distinct records within the
  // first 39; collapsing the repeats must not eat into the maxResults budget
  it('fills maxResults with unique records', async () => {
    const trix5 = new Trix(
      new LocalFile('./test/testData/test5/hg19.ixx'),
      new LocalFile('./test/testData/test5/hg19.ix'),
      20,
    )
    const hitList = await trix5.search('vdac')
    expect(hitList).toHaveLength(20)
    expect(new Set(hitList.map(([, record]) => record)).size).toBe(20)
  })
})

describe('Test maxResults for search of test5 ix file', () => {
  const searchTerms = ['vamp', '#100']
  for (const searchTerm of searchTerms) {
    it(`Search for ${searchTerm} results`, async () => {
      const trix5 = new Trix(
        new LocalFile('./test/testData/test5/hg19.ixx'),
        new LocalFile('./test/testData/test5/hg19.ix'),
      )
      const hitList = await trix5.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    })
  }
})

describe('a query of several words', () => {
  const open = (maxResults?: number) =>
    new Trix(
      new LocalFile('./test/testData/test1/myTrix.ixx'),
      new LocalFile('./test/testData/test1/myTrix.ix'),
      maxResults,
    )
  const records = async (trix: Trix, query: string) =>
    (await trix.search(query)).map(([, record]) => record)

  it('keeps the records every word finds', async () => {
    expect(await records(open(), 'this id2')).toEqual(['id2'])
  })

  it('answers the same whichever word comes first', async () => {
    expect(await records(open(), 'id2 this')).toEqual(['id2'])
  })

  it('finds nothing when one word matches nothing', async () => {
    expect(await records(open(), 'this nope')).toEqual([])
  })

  it('lets a word cut off before its last record rule nothing out', async () => {
    // `this` carries three records and is cut off at two, which do not include
    // id3; `id3` is read whole and seeds the answer
    expect(await records(open(2), 'this id3')).toEqual(['id3'])
  })

  it('falls back to the first word when every word is cut off', async () => {
    expect(await records(open(2), 'this text')).toEqual(['id1', 'id2'])
  })
})
