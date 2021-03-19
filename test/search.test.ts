import { parseHitList, search } from '../src/index';
import { demoParse } from '../src/parse';
import Trix from '../src/index';
import { LocalFile } from 'generic-filehandle';
import { trixSearch } from '../src/index';

const searchTerm: string = 'focad';
describe(`Searching for ${searchTerm}`, () => {
  it('Search', async () => {
    const results = await search(searchTerm);
    expect(results).toEqual(['ENST00000445051.1', 'ENST00000439876.1']);
  });
});

describe(`Test the parsing of test1 ixx file`, () => {
  it('Parse test1/myTrix.ixx', async () => {
    const ixxFile: string = './test/testData/test1/myTrix.ixx';
    const local = new LocalFile(ixxFile);
    const trix = new Trix(local);
    const ixx = await trix.index;
    expect(ixx).toMatchSnapshot();
  });
});

describe(`Test the parsing of test2 ixx file`, () => {
  it('Parse test2/out.ixx', async () => {
    const ixxFile: string = './test/testData/test2/out.ixx';
    const local = new LocalFile(ixxFile);
    const trix = new Trix(local);
    const ixx = await trix.index;
    expect(ixx).toMatchSnapshot();
  });
});

describe('Test parsing a hit on test1', () => {
  it('Parse hit string', async () => {
    const line = 'this id1,1 id2,1 id3,1';
    expect(parseHitList(line)).toMatchSnapshot();
  });
});

describe('Test parsing a hit on test2', () => {
  it('Parse hit string', async () => {
    const line =
      'abca9-as1 ENST00000458677.1,1 ENST00000627453.2,1 ENST00000627596.2,1 ENST00000627957.2,1 ENST00000629311.1,1 ENST00000630575.2,1 ENST00000630625.1,1';
    expect(parseHitList(line)).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  it('Search for \"this\" in test1/myTrix.ix', async () => {
    const ixxFile: string = './test/testData/test1/myTrix.ixx';
    const localIxx = new LocalFile(ixxFile);
    const ixFile: string = './test/testData/test1/myTrix.ix';
    const localIx = new LocalFile(ixFile);
    const trix = new Trix(localIx);
    const hitList = await trixSearch("this", trix, localIx);
    expect(hitList).toEqual(['id3', 'id2', 'id1']);
  });
});

// describe('Demo of the binary parser', () => {
//   it('Demo', async () => {
//     expect(demoParse()).toEqual(1);
//   });
// });
