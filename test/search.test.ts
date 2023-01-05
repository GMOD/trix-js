import Trix from '../src/index'
import { LocalFile } from 'generic-filehandle'

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
  searchTerms.forEach(searchTerm =>
    it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
      const trix1 = new Trix(
        new LocalFile('./test/testData/test1/myTrix.ixx'),
        new LocalFile('./test/testData/test1/myTrix.ix'),
      )
      const hitList = await trix1.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    }),
  )
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
  searchTerms.forEach(searchTerm =>
    it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
      const trix2 = new Trix(
        new LocalFile('./test/testData/test2/out.ixx'),
        new LocalFile('./test/testData/test2/out.ix'),
      )
      const hitList = await trix2.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    }),
  )
})

describe('Test a search of test3 ix file', () => {
  const searchTerms = ['focad', 'nothing', 'tim', 'prickle', 'oca', 'zzz', 'zx']
  searchTerms.forEach(searchTerm =>
    it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
      const trix3 = new Trix(
        new LocalFile('./test/testData/test3/out.ixx'),
        new LocalFile('./test/testData/test3/out.ix'),
      )
      const hitList = await trix3.search(searchTerm)
      expect(hitList).toMatchSnapshot()
    }),
  )
})

describe('Test a search of test4 ix file', () => {
  const searchTerm = 'ek'
  it(`Search for \"${searchTerm}\" in test4/out.ix`, async () => {
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
  it(`Search for \"${searchTerm}\" with a max of 5 results`, async () => {
    const trix3 = new Trix(
      new LocalFile('./test/testData/test3/out.ixx'),
      new LocalFile('./test/testData/test3/out.ix'),
      5,
    )
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})
