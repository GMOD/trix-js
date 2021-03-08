

export const search = (searchTerm: string) => {
  if ('development' === process.env.NODE_ENV) {
    console.log(`Search test for ${searchTerm}.`);
  }
  const r = ["ENST00000445051.1", "ENST00000439876.1"];
  return r;
};