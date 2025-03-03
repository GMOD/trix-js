import { describe, it, expect } from 'vitest'
import Trix from '../src/index'
import { LocalFile } from 'generic-filehandle2'

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
      expect(hitList.map(f => [f.hitString, f.hitInfo])).toMatchSnapshot()
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
      expect(hitList.map(f => [f.hitString, f.hitInfo])).toMatchSnapshot()
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
      expect(hitList.map(f => [f.hitString, f.hitInfo])).toMatchSnapshot()
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
    expect(hitList.map(f => [f.hitString, f.hitInfo])).toMatchSnapshot()
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
    expect(hitList.map(f => [f.hitString, f.hitInfo])).toMatchSnapshot()
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
      expect(hitList.map(f => [f.hitString, f.hitInfo])).toMatchSnapshot()
    })
  }
})
