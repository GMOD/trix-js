import { search } from '../src/index';
import { demoParse } from '../src/parse';


const searchTerm: string = "focad";
describe(`Searching for ${searchTerm}`, () => {
  it('Search', async () => {
    const results = await search(searchTerm);
    expect(results).toEqual(["ENST00000445051.1", "ENST00000439876.1"]);
  });
});


describe('Demo of the binary parser', () => {
  it('Demo', async () => {
    expect(demoParse()).toEqual(1);
  });
});