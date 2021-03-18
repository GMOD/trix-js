import { search } from '../src/index';
import { demoParse } from '../src/parse';
import Trix from '../src/index';
import { LocalFile } from 'generic-filehandle';


const searchTerm: string = "focad";
describe(`Searching for ${searchTerm}`, () => {
  it('Search', async () => {
    const results = await search(searchTerm);
    expect(results).toEqual(["ENST00000445051.1", "ENST00000439876.1"]);
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




// describe('Demo of the binary parser', () => {
//   it('Demo', async () => {
//     expect(demoParse()).toEqual(1);
//   });
// });