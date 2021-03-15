import { search } from '../src';

const searchTerm: string = "focad";
describe(`Searching for ${searchTerm}`, () => {
  it('Search', async () => {
    const results = await search(searchTerm);
    expect(results).toEqual(["ENST00000445051.1", "ENST00000439876.1"]);
  });
});
