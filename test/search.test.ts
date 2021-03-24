import { parseHitList, search } from '../src/index';
import { demoParse } from '../src/parse';
import Trix from '../src/index';
import { LocalFile } from 'generic-filehandle';
import { trixSearch } from '../src/index';


// describe(`Searching for term.`, () => {
//   const searchTerm: string = 'focad';
//   it('Search', async () => {
//     const results = await search(searchTerm);
//     expect(results).toEqual(['ENST00000445051.1', 'ENST00000439876.1']);
//   });
// });

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

const ixxFile1: string = './test/testData/test1/myTrix.ixx';
const localIxx1 = new LocalFile(ixxFile1);
const ixFile1: string = './test/testData/test1/myTrix.ix';
const localIx1 = new LocalFile(ixFile1);
const trix1 = new Trix(localIxx1);

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "this";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix1, localIx1);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "is";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix1, localIx1);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "id1";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix1, localIx1);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "nope";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix1, localIx1);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "for";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix1, localIx1);
    expect(hitList).toMatchSnapshot();
  });
});



const ixxFile2: string = './test/testData/test2/out.ixx';
const localIxx2 = new LocalFile(ixxFile2);
const ixFile2: string = './test/testData/test2/out.ix';
const localIx2 = new LocalFile(ixFile2);
const trix2 = new Trix(localIxx2);

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "focad";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "linc";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "none";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "prickle";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "tim";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "znf8";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "enst";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix2, localIx2);
    expect(hitList).toMatchSnapshot();
  });
});





const ixxFile3: string = './test/testData/test3/out.ixx';
const localIxx3 = new LocalFile(ixxFile3);
const ixFile3: string = './test/testData/test3/out.ix';
const localIx3 = new LocalFile(ixFile3);
const trix3 = new Trix(localIxx3);

describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "focad";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix3, localIx3);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "nothing";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix3, localIx3);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "tim";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix3, localIx3);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "prickle";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix3, localIx3);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "oca";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix3, localIx3);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "zzz";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trixSearch(searchTerm, trix3, localIx3);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});






