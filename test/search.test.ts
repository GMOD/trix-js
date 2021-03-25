import Trix from '../src/index';
import { LocalFile } from 'generic-filehandle';

const ixxFile1: string = './test/testData/test1/myTrix.ixx';
const localIxx1 = new LocalFile(ixxFile1);
const ixFile1: string = './test/testData/test1/myTrix.ix';
const localIx1 = new LocalFile(ixFile1);
const trix1 = new Trix(localIxx1, localIx1);

const ixxFile2: string = './test/testData/test2/out.ixx';
const localIxx2 = new LocalFile(ixxFile2);
const ixFile2: string = './test/testData/test2/out.ix';
const localIx2 = new LocalFile(ixFile2);
const trix2 = new Trix(localIxx2, localIx2);

const ixxFile3: string = './test/testData/test3/out.ixx';
const localIxx3 = new LocalFile(ixxFile3);
const ixFile3: string = './test/testData/test3/out.ix';
const localIx3 = new LocalFile(ixFile3);
const trix3 = new Trix(localIxx3, localIx3);

describe(`Test the parsing of test1 ixx file`, () => {
  it('Parse test1/myTrix.ixx', async () => {
    const trix = new Trix(localIxx1, localIx1);
    const ixx = await trix.index;
    expect(ixx).toMatchSnapshot();
  });
});

describe(`Test the parsing of test2 ixx file`, () => {
  it('Parse test2/out.ixx', async () => {
    const trix = new Trix(localIxx2, localIx2);
    const ixx = await trix.index;
    expect(ixx).toMatchSnapshot();
  });
});


// -----------------------------------------------------------------
// Search trix1:

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "this";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.trixSearch(searchTerm);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "is";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.trixSearch(searchTerm);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "id1";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.trixSearch(searchTerm);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "nope";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.trixSearch(searchTerm);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test1 ix file', () => {
  const searchTerm: string = "fOR";
  it(`Search for \"${searchTerm}\" in test1/myTrix.ix`, async () => {
    const hitList = await trix1.trixSearch(searchTerm);
    expect(hitList).toMatchSnapshot();
  });
});

// ----------------------------------------------------------------------
// Search trix2:

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "FocAd";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "LINC";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "none";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "prickle";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "tim";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "znf8";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});

describe('Test a search of test2 ix file', () => {
  const searchTerm: string = "enst";
  it(`Search for \"${searchTerm}\" in test2/out.ix`, async () => {
    const hitList = await trix2.trixSearch(searchTerm);
    expect(hitList).toMatchSnapshot();
  });
});


// --------------------------------------------------
// Search trix3:


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "focad";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "nothing";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "tim";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "prickle";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "oca";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


describe('Test a search of test3 ix file', () => {
  const searchTerm: string = "zzz";
  it(`Search for \"${searchTerm}\" in test3/out.ix`, async () => {
    const hitList = await trix3.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});


// ------------------------
// Test maxResults:

const trix3B = new Trix(localIxx3, localIx3, 5);

describe('Test maxResults for search of test3 ix file', () => {
  const searchTerm: string = "tim";
  it(`Search for \"${searchTerm}\" with a max of 5 results`, async () => {
    const hitList = await trix3B.trixSearch(searchTerm);
    // console.log(hitList);
    expect(hitList).toMatchSnapshot();
  });
});






