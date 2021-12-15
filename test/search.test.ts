import Trix from '../src/index'
import { LocalFile } from 'generic-filehandle'
// import fetch from 'node-fetch'

const ixxFile1 = './test/testData/test1/myTrix.ixx'
const localIxx1 = new LocalFile(ixxFile1)
const ixFile1 = './test/testData/test1/myTrix.ix'
const localIx1 = new LocalFile(ixFile1)
const trix1 = new Trix(localIxx1, localIx1)

const ixxFile2 = './test/testData/test2/out.ixx'
const localIxx2 = new LocalFile(ixxFile2)
const ixFile2 = './test/testData/test2/out.ix'
const localIx2 = new LocalFile(ixFile2)
const trix2 = new Trix(localIxx2, localIx2)

const ixxFile3 = './test/testData/test3/out.ixx'
const localIxx3 = new LocalFile(ixxFile3)
const ixFile3 = './test/testData/test3/out.ix'
const localIx3 = new LocalFile(ixFile3)
const trix3 = new Trix(localIxx3, localIx3)

const ixxFile4 = './test/testData/test4/out.ixx'
const localIxx4 = new LocalFile(ixxFile4)
const ixFile4 = './test/testData/test4/out.ix'
const localIx4 = new LocalFile(ixFile4)
const trix4 = new Trix(localIxx4, localIx4)

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'this'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'is'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'id1'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'nope'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'fOR'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'this is for id2'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test1 ix file', () => {
  const searchTerm = 'for this'
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'FocAd'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

// TODO: verify this is correct
describe('Test a search of test2 ix file', () => {
  const searchTerm = 'LINC'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'none'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'prickle'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'tim'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'znf8'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'enst'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'enst alg'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test2 ix file', () => {
  const searchTerm = 'enst ac'
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'focad'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'nothing'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'tim'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'prickle'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'oca'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'zzz'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test3 ix file', () => {
  const searchTerm = 'zx'
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

describe('Test a search of test4 ix file', () => {
  const searchTerm = 'ek'
  it(`Search for \"${searchTerm}\" in test4/out.ix`, async () => {
    const hitList = await trix4.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})

const trix3B = new Trix(localIxx3, localIx3, 5)

describe('Test maxResults for search of test3 ix file', () => {
  const searchTerm = 'tim'
  it(`Search for \"${searchTerm}\" with a max of 5 results`, async () => {
    const hitList = await trix3B.search(searchTerm)
    expect(hitList).toMatchSnapshot()
  })
})
