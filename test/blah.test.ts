import { search } from '../src';

const searchTerm: string = "focad";
describe(`Searching for ${searchTerm}`, () => {
  it('works', () => {
    expect(search(searchTerm)).toEqual(["ENST00000445051.1", "ENST00000439876.1"]);
  });
});
